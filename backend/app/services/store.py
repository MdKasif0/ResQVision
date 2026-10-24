import logging
from typing import Dict, List, Optional
from app.schemas import Incident

logger = logging.getLogger("resqvision.store")

# In-memory storage stub (real file persistence arrives in Step 7)
_INCIDENTS_STORE: Dict[str, Incident] = {}


def save_incident(incident: Incident) -> None:
    """
    Persist an incident record.
    Pluggable interface: currently saves to memory cache; Step 7 connects data/incidents.json.
    """
    _INCIDENTS_STORE[incident.id] = incident
    logger.info("Incident %s staged in store (total staged: %d)", incident.id, len(_INCIDENTS_STORE))


def get_incident(incident_id: str) -> Optional[Incident]:
    """Retrieve an incident by ID from the store stub."""
    return _INCIDENTS_STORE.get(incident_id)


def list_incidents() -> List[Incident]:
    """List all staged incidents in reverse chronological order."""
    return sorted(_INCIDENTS_STORE.values(), key=lambda inc: inc.created_at, reverse=True)


def delete_incident(incident_id: str) -> bool:
    """Delete an incident from the store stub."""
    if incident_id in _INCIDENTS_STORE:
        del _INCIDENTS_STORE[incident_id]
        return True
    return False
