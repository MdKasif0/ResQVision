import io
from dataclasses import dataclass
from typing import Tuple
from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import settings
from app.exceptions import (
    CorruptImageException,
    EmptyFileException,
    InvalidImageFormatException,
    PayloadTooLargeException,
)

SUPPORTED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

SUPPORTED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_DIMENSION = 1920


@dataclass
class ProcessedImage:
    """Container for validated and normalized image data."""
    raw_bytes: bytes
    processed_bytes: bytes
    original_filename: str
    format: str
    original_width: int
    original_height: int
    processed_width: int
    processed_height: int
    file_size_bytes: int
    image: Image.Image


async def validate_and_process_image(file: UploadFile) -> ProcessedImage:
    """
    Validates uploaded file size and content type, parses image via Pillow,
    auto-orients via EXIF, and caps the longest side to 1920px.

    Raises:
        PayloadTooLargeException: If file size exceeds MAX_UPLOAD_MB.
        EmptyFileException: If file is 0 bytes.
        InvalidImageFormatException: If format is not JPEG, PNG, or WebP.
        CorruptImageException: If image cannot be decoded.
    """
    filename = file.filename or "uploaded_image"

    # 1. Read up to max_upload_bytes + 1 chunk to enforce limit without memory blowup
    max_bytes = settings.max_upload_bytes
    chunks = []
    total_bytes = 0

    while True:
        chunk = await file.read(1024 * 64)  # 64KB chunks
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise PayloadTooLargeException(
                f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_MB}MB."
            )
        chunks.append(chunk)

    raw_bytes = b"".join(chunks)

    if len(raw_bytes) == 0:
        raise EmptyFileException("Uploaded file is empty (0 bytes).")

    # 2. Check claimed content type if present (reject non-image headers upfront)
    claimed_type = (file.content_type or "").lower().strip()
    if claimed_type and claimed_type not in SUPPORTED_MIME_TYPES and not claimed_type.startswith("image/"):
        raise InvalidImageFormatException(
            f"Unsupported content type '{claimed_type}'. Accepted formats: JPEG, PNG, WebP."
        )

    # 3. Verify actual bytes using Pillow (do NOT trust file header alone)
    try:
        pil_img = Image.open(io.BytesIO(raw_bytes))
        format_name = (pil_img.format or "").upper()
        if format_name not in SUPPORTED_PIL_FORMATS:
            raise InvalidImageFormatException(
                f"Unsupported image format '{format_name or 'unknown'}'. Accepted formats: JPEG, PNG, WebP."
            )

        # Force decode pixels to verify file integrity
        pil_img.load()
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        if isinstance(exc, InvalidImageFormatException):
            raise
        raise InvalidImageFormatException(
            "Uploaded file is not a valid or readable image. Only valid JPEG, PNG, and WebP images are accepted."
        )

    orig_width, orig_height = pil_img.size

    # 4. Auto-orient using EXIF orientation tags
    try:
        pil_img = ImageOps.exif_transpose(pil_img)
    except Exception:
        # If EXIF is malformed or absent, keep image as-is
        pass

    # 5. Cap the longest side at 1920px for efficient inference and processing
    if max(pil_img.width, pil_img.height) > MAX_DIMENSION:
        pil_img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

    processed_width, processed_height = pil_img.size

    # 6. Re-encode processed image to bytes
    out_buffer = io.BytesIO()
    save_format = "PNG" if format_name == "PNG" else "JPEG"

    # Convert RGBA / Palette modes to RGB if saving to JPEG
    if save_format == "JPEG" and pil_img.mode in ("RGBA", "P", "LA"):
        save_img = pil_img.convert("RGB")
    else:
        save_img = pil_img

    save_img.save(out_buffer, format=save_format, quality=90)
    processed_bytes = out_buffer.getvalue()

    return ProcessedImage(
        raw_bytes=raw_bytes,
        processed_bytes=processed_bytes,
        original_filename=filename,
        format=format_name,
        original_width=orig_width,
        original_height=orig_height,
        processed_width=processed_width,
        processed_height=processed_height,
        file_size_bytes=len(raw_bytes),
        image=save_img,
    )
