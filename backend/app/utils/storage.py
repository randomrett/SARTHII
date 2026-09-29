import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("saarthi.storage")

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = settings.SUPABASE_URL
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not supabase_url or not service_role_key:
        logger.info("[SUPABASE STORAGE] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Falling back to local disk storage.")
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(supabase_url, service_role_key)
        logger.info("[SUPABASE STORAGE] Supabase client initialized successfully.")
        return _supabase_client
    except Exception as exc:
        logger.warning(f"[SUPABASE STORAGE] Failed to initialize Supabase client: {exc}")
        return None

def upload_file_to_supabase(
    file_bytes: bytes,
    destination_path: str,
    content_type: str = "image/jpeg",
    bucket_name: Optional[str] = None
) -> Optional[str]:
    """
    Uploads file bytes to Supabase Storage bucket (PUBLIC bucket).
    Returns the public HTTP URL of the uploaded asset, or None if Supabase is unavailable.
    """
    client = get_supabase_client()
    if not client:
        return None

    target_bucket = bucket_name or settings.SUPABASE_BUCKET

    try:
        # Check / create bucket if not existing or try direct upload
        storage_ref = client.storage.from_(target_bucket)
        
        # Upload with upsert enabled
        res = storage_ref.upload(
            path=destination_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )

        public_url = storage_ref.get_public_url(destination_path)
        logger.info(f"[SUPABASE STORAGE] Uploaded file to '{target_bucket}/{destination_path}' -> {public_url}")
        return public_url
    except Exception as exc:
        logger.warning(f"[SUPABASE STORAGE UPLOAD ERROR] {exc}. Falling back to local storage.")
        return None
