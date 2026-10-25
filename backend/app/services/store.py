import json
import logging
import os
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.config import settings
from app.schemas import Incident

logger = logging.getLogger("resqvision.store")

# Process-level lock around read-modify-write operations
_LOCK = threading.Lock()

MAX_INCIDENTS = 50


def get_data_dir() -> Path:
    """Resolve data directory path robustly across execution environments."""
    p = Path(settings.DATA_DIR)
    if p.is_absolute() and p.exists():
        return p
    # Try relative to current working directory
    if p.exists():
        return p.resolve()
    # Try relative to backend directory
    backend_dir = Path(__file__).resolve().parent.parent.parent
    candidate = (backend_dir / settings.DATA_DIR).resolve()
    if candidate.exists() or candidate.parent.exists():
        candidate.mkdir(parents=True, exist_ok=True)
        return candidate
    # Default to workspace root / data
    repo_data = (backend_dir.parent / "data").resolve()
    repo_data.mkdir(parents=True, exist_ok=True)
    return repo_data


def get_uploads_dir() -> Path:
    """Return and ensure data/uploads directory exists."""
    uploads_dir = get_data_dir() / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir


def get_incidents_file_path() -> Path:
    """Return path to data/incidents.json."""
    data_dir = get_data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "incidents.json"


def _read_incidents_unlocked(file_path: Path) -> List[Incident]:
    """
    Read and parse incidents from incidents.json.
    Must be called within _LOCK.
    If file is missing: creates empty file and returns empty list.
    If file is corrupt: renames to incidents.corrupt.<timestamp>.json, logs warning,
    starts fresh with empty file, and returns empty list.
    """
    if not file_path.exists():
        try:
            _write_incidents_unlocked(file_path, [])
        except Exception as init_err:
            logger.warning("Could not initialize missing incidents file %s: %s", file_path, init_err)
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            return []

        raw_data = json.loads(content)
        if not isinstance(raw_data, list):
            raise ValueError(f"Expected JSON list in {file_path}, got {type(raw_data).__name__}")

        incidents: List[Incident] = []
        for item in raw_data:
            try:
                incidents.append(Incident.model_validate(item))
            except Exception as item_err:
                logger.warning("Skipping invalid incident record in store: %s", item_err)

        return incidents

    except (json.JSONDecodeError, ValueError, Exception) as exc:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        corrupt_path = file_path.parent / f"incidents.corrupt.{timestamp}.json"
        logger.warning(
            "Corrupt incidents file detected at %s: %s. Renaming to %s and starting fresh.",
            file_path,
            exc,
            corrupt_path,
        )
        try:
            file_path.rename(corrupt_path)
        except Exception as rename_err:
            logger.error("Failed to rename corrupt incidents file: %s", rename_err)

        # Start fresh with a new empty incidents file
        try:
            _write_incidents_unlocked(file_path, [])
        except Exception as fresh_err:
            logger.warning("Could not initialize fresh incidents file %s: %s", file_path, fresh_err)

        return []


def _write_incidents_unlocked(file_path: Path, incidents: List[Incident]) -> None:
    """
    Atomically write incidents list to incidents.json.
    Must be called within _LOCK.
    Writes to temporary file in same directory, flushes, fsyncs, then atomic os.replace.
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    data = [inc.model_dump() for inc in incidents]

    temp_file = tempfile.NamedTemporaryFile(
        mode="w",
        dir=str(file_path.parent),
        prefix="incidents.tmp.",
        suffix=".json",
        delete=False,
        encoding="utf-8",
    )
    temp_path = temp_file.name

    try:
        json.dump(data, temp_file, indent=2, ensure_ascii=False)
        temp_file.flush()
        os.fsync(temp_file.fileno())
        temp_file.close()

        os.replace(temp_path, file_path)
    except Exception as exc:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        logger.error("Failed atomic write to %s: %s", file_path, exc)
        raise


def save_incident(incident: Incident) -> None:
    """
    Persist an incident record in data/incidents.json with concurrency lock and atomic write.
    Maintains reverse chronological order and caps at newest MAX_INCIDENTS (50).
    Deletes image assets for trimmed records.
    """
    with _LOCK:
        file_path = get_incidents_file_path()
        incidents = _read_incidents_unlocked(file_path)

        # Remove existing record with same ID if updating
        incidents = [inc for inc in incidents if inc.id != incident.id]

        # Insert new incident at start
        incidents.insert(0, incident)

        # Sort newest first by created_at
        incidents.sort(key=lambda x: x.created_at, reverse=True)

        # Cap at MAX_INCIDENTS (50) and remove associated images of trimmed records
        if len(incidents) > MAX_INCIDENTS:
            trimmed = incidents[MAX_INCIDENTS:]
            incidents = incidents[:MAX_INCIDENTS]
            uploads_dir = get_uploads_dir()
            for t in trimmed:
                target_files = {f"{t.id}.jpg"}
                if getattr(t, "image_filename", None):
                    target_files.add(t.image_filename)
                for fname in target_files:
                    img_path = uploads_dir / fname
                    if img_path.exists():
                        try:
                            img_path.unlink()
                            logger.info("Trimmed old incident image: %s", img_path)
                        except Exception as unlink_err:
                            logger.warning("Could not delete trimmed image %s: %s", img_path, unlink_err)

        _write_incidents_unlocked(file_path, incidents)
        logger.info("Incident %s persisted successfully (total stored: %d)", incident.id, len(incidents))


def get_incident(incident_id: str) -> Optional[Incident]:
    """Retrieve an incident by ID from data/incidents.json."""
    with _LOCK:
        file_path = get_incidents_file_path()
        incidents = _read_incidents_unlocked(file_path)
        for inc in incidents:
            if inc.id == incident_id:
                return inc
        return None


def list_incidents() -> List[Incident]:
    """List all persisted incidents in reverse chronological order."""
    with _LOCK:
        file_path = get_incidents_file_path()
        incidents = _read_incidents_unlocked(file_path)
        incidents.sort(key=lambda x: x.created_at, reverse=True)
        return incidents


def delete_incident(incident_id: str) -> bool:
    """
    Delete an incident from data/incidents.json and remove its uploaded image file.
    Returns True if found and deleted, False otherwise.
    """
    with _LOCK:
        file_path = get_incidents_file_path()
        incidents = _read_incidents_unlocked(file_path)

        target_index = -1
        target_incident = None
        for idx, inc in enumerate(incidents):
            if inc.id == incident_id:
                target_index = idx
                target_incident = inc
                break

        if target_index == -1:
            return False

        incidents.pop(target_index)
        _write_incidents_unlocked(file_path, incidents)

        # Delete associated image file from data/uploads/
        uploads_dir = get_uploads_dir()
        target_files = {f"{incident_id}.jpg"}
        if target_incident and getattr(target_incident, "image_filename", None):
            target_files.add(target_incident.image_filename)

        for fname in target_files:
            img_path = uploads_dir / fname
            if img_path.exists():
                try:
                    img_path.unlink()
                    logger.info("Deleted image asset for incident %s: %s", incident_id, fname)
                except Exception as exc:
                    logger.warning("Could not delete image asset %s: %s", img_path, exc)

        logger.info("Incident %s deleted from store (remaining: %d)", incident_id, len(incidents))
        return True
