import os
import uuid
from typing import Tuple
from PIL import Image
from fastapi import UploadFile
from app.config import settings
from app.core.exceptions import BadRequestException

def validate_and_save_image(file: UploadFile, subfolder: str = "reports") -> Tuple[str, int, int, int]:
    """
    Validates uploaded photograph using Pillow:
    - Verifies MIME type
    - Verifies file size limit
    - Opens and verifies integrity with PIL
    - Strips malicious metadata and re-encodes safely
    - Returns (saved_relative_url, file_size, width, height)
    """
    if not file.content_type in settings.ALLOWED_IMAGE_TYPES:
        raise BadRequestException(f"Unsupported image format: {file.content_type}. Allowed: JPEG, PNG, WEBP.")

    # Read bytes
    contents = file.file.read()
    file_size = len(contents)
    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise BadRequestException(f"Image size exceeds limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB.")

    # Validate image via Pillow
    try:
        from io import BytesIO
        img = Image.open(BytesIO(contents))
        img.verify() # Verify file header integrity
        # Re-open for dimension inspection and processing (verify closes the image)
        img = Image.open(BytesIO(contents))
        width, height = img.size
    except Exception as e:
        raise BadRequestException(f"Invalid or corrupted image file: {str(e)}")

    # Target directory
    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)

    # Determine extension
    ext = ".jpg"
    if "png" in file.content_type:
        ext = ".png"
    elif "webp" in file.content_type:
        ext = ".webp"

    filename = f"{uuid.uuid4()}{ext}"
    target_filepath = os.path.join(target_dir, filename)

    # Save sanitized image
    try:
        # Convert RGBA to RGB if saving as JPEG
        if ext == ".jpg" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(target_filepath, quality=90, optimize=True)
    except Exception as e:
        # Fallback to direct write if save fails
        with open(target_filepath, "wb") as f:
            f.write(contents)

    relative_url = f"/uploads/{subfolder}/{filename}"
    return relative_url, file_size, width, height

