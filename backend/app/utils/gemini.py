import os
import re
import json
import logging
import tempfile
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("saarthi.gemini")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class GeminiRateLimitError(Exception):
    """Raised when Gemini API hits rate limit / quota exhaustion (HTTP 429)."""
    pass

class GeminiConfigError(Exception):
    """Raised when GEMINI_API_KEY is unconfigured or missing."""
    pass

def _get_api_key() -> str:
    key = settings.get_gemini_api_key(enforce=False)
    if not key:
        raise GeminiConfigError(
            "GEMINI_API_KEY environment variable is not configured. "
            "Please create a .env file with GEMINI_API_KEY=your-key-here"
        )
    return key

def _sanitize_model_name(model_name: Optional[str] = None) -> str:
    chosen = model_name or settings.GEMINI_MODEL or "gemini-1.5-flash"
    chosen_lower = chosen.lower()
    if "pro" in chosen_lower and not ("flash" in chosen_lower):
        logger.warning(f"Pro model '{chosen}' requested; switching to free-tier Flash model 'gemini-1.5-flash'.")
        return "gemini-1.5-flash"
    return chosen

def _handle_gemini_exception(e: Exception):
    err_msg = str(e)
    logger.error(f"Gemini API Exception: {err_msg}")
    
    rate_limit_keywords = ["429", "quota", "resourceexhausted", "resource_exhausted", "rate limit", "exceeded"]
    if any(kw in err_msg.lower() for kw in rate_limit_keywords):
        raise GeminiRateLimitError("AI processing temporarily unavailable, try again shortly")
    
    raise e

def parse_defensive_json(raw_response: str) -> Dict[str, Any]:
    """
    Strips markdown code fences and preambles to parse JSON defensively.
    Falls back to returning raw text description if parsing fails.
    """
    if not raw_response:
        return {
            "extracted_text": "",
            "activity_guess": None,
            "zone_guess": None,
            "progress_guess": None,
            "defects_noted": None,
            "confidence_note": "Empty model response"
        }

    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
        json_str = cleaned[start_idx:end_idx+1]
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    return {
        "extracted_text": cleaned,
        "activity_guess": None,
        "zone_guess": None,
        "progress_guess": None,
        "defects_noted": None,
        "confidence_note": "Fallback raw text extraction due to non-JSON output"
    }

def analyze_image_with_gemini(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    custom_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Task 3: Send photo to Gemini Vision for combined OCR + progress + defect detection.
    Returns defensive JSON output, handles 429 quota errors, logs model & token usage.
    """
    api_key = _get_api_key()
    model_name = _sanitize_model_name()

    prompt = custom_prompt or (
        "You are an expert construction site monitor analyzing a site progress photo or document image.\n"
        "Extract any visible text (signage, handwritten logs, markings) AND describe visible construction progress or defects.\n"
        "Respond strictly with a single valid JSON object containing these exact keys:\n"
        "{\n"
        '  "extracted_text": "Detailed raw text summary of visible work and signage",\n'
        '  "activity_guess": "Name of construction activity (e.g. Raft Foundation, Diaphragm Wall, Mass Excavation)",\n'
        '  "zone_guess": "Identified location/zone (e.g. Zone A, Pier 4, Shaft B)",\n'
        '  "progress_guess": 85.0,\n'
        '  "defects_noted": "Any visible cracks, safety violations, rebar misalignment, or None",\n'
        '  "confidence_note": "Brief visual analysis confidence note"\n'
        "}"
    )

    raw_response_text = ""
    prompt_tokens = 0
    candidate_tokens = 0
    total_tokens = 0

    try:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ]
            )
            raw_response_text = response.text or ""
            
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                meta = response.usage_metadata
                prompt_tokens = getattr(meta, "prompt_token_count", 0) or 0
                candidate_tokens = getattr(meta, "candidates_token_count", 0) or 0
                total_tokens = getattr(meta, "total_token_count", 0) or (prompt_tokens + candidate_tokens)

        except (ImportError, Exception) as genai_err:
            if any(kw in str(genai_err).lower() for kw in ["429", "quota", "resourceexhausted"]):
                raise genai_err

            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel(model_name)

            image_part = {"mime_type": mime_type, "data": image_bytes}
            response = model.generate_content([image_part, prompt])
            raw_response_text = response.text or ""

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                meta = response.usage_metadata
                prompt_tokens = getattr(meta, "prompt_token_count", 0) or 0
                candidate_tokens = getattr(meta, "candidates_token_count", 0) or 0
                total_tokens = getattr(meta, "total_token_count", 0) or (prompt_tokens + candidate_tokens)

        logger.info(
            f"[GEMINI VISION IMAGE] Model: '{model_name}' | "
            f"Prompt Tokens: {prompt_tokens} | "
            f"Output Tokens: {candidate_tokens} | "
            f"Total Tokens: {total_tokens}"
        )

        structured_json = parse_defensive_json(raw_response_text)

        # Build full composite text report for downstream matching
        extracted_summary = structured_json.get("extracted_text") or raw_response_text
        act_g = structured_json.get("activity_guess") or ""
        zone_g = structured_json.get("zone_guess") or ""
        prog_g = structured_json.get("progress_guess")
        defects = structured_json.get("defects_noted") or ""

        composite_text_parts = [extracted_summary]
        if act_g:
            composite_text_parts.append(f"Activity: {act_g}")
        if zone_g:
            composite_text_parts.append(f"Location: {zone_g}")
        if prog_g is not None:
            composite_text_parts.append(f"Progress: {prog_g}%")
        if defects and defects.lower() != "none":
            composite_text_parts.append(f"Defects/Issues: {defects}")

        full_report_text = ". ".join(composite_text_parts)

        return {
            "model": model_name,
            "raw_response": raw_response_text,
            "structured_data": structured_json,
            "full_report_text": full_report_text,
            "token_usage": {
                "prompt_tokens": prompt_tokens,
                "candidate_tokens": candidate_tokens,
                "total_tokens": total_tokens
            }
        }

    except GeminiRateLimitError:
        raise
    except Exception as e:
        _handle_gemini_exception(e)


def analyze_video_with_gemini(
    video_bytes: bytes,
    mime_type: str = "video/mp4",
    custom_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Task 4: Process video file frames with Gemini Vision for structured site progress analysis.
    Returns defensive JSON output, handles 429 quota errors, logs model & token usage.
    """
    api_key = _get_api_key()
    model_name = _sanitize_model_name()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    frames_jpg = []
    try:
        import cv2
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        
        if total_frames > 0:
            step = max(1, total_frames // 6)
            current_frame = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                if current_frame % step == 0:
                    resized = cv2.resize(frame, (640, 480))
                    is_success, buffer = cv2.imencode(".jpg", resized)
                    if is_success:
                        frames_jpg.append(buffer.tobytes())
                current_frame += 1
                if len(frames_jpg) >= 6:
                    break
            cap.release()
    except Exception as cv_err:
        logger.warning(f"OpenCV frame extraction warning: {cv_err}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    prompt = custom_prompt or (
        "You are an expert construction site monitor analyzing keyframes from a site progress video.\n"
        "Summarize active site operations, location/zone, progress %, and any defects observed across these frames.\n"
        "Respond strictly with a single valid JSON object containing these exact keys:\n"
        "{\n"
        '  "extracted_text": "Detailed raw summary of construction progress across video frames",\n'
        '  "activity_guess": "Name of main activity observed",\n'
        '  "zone_guess": "Location/Zone identified",\n'
        '  "progress_guess": 50.0,\n'
        '  "defects_noted": "Any equipment downtime, safety hazards, or quality issues",\n'
        '  "confidence_note": "Video analysis visual confidence rating"\n'
        "}"
    )

    if not frames_jpg:
        return analyze_image_with_gemini(
            image_bytes=video_bytes[:1024*1024],
            mime_type="image/jpeg",
            custom_prompt=prompt
        )

    raw_response_text = ""
    prompt_tokens = 0
    candidate_tokens = 0
    total_tokens = 0

    try:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            contents = []
            for frame_data in frames_jpg:
                contents.append(types.Part.from_bytes(data=frame_data, mime_type="image/jpeg"))
            contents.append(prompt)

            response = client.models.generate_content(
                model=model_name,
                contents=contents
            )
            raw_response_text = response.text or ""

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                meta = response.usage_metadata
                prompt_tokens = getattr(meta, "prompt_token_count", 0) or 0
                candidate_tokens = getattr(meta, "candidates_token_count", 0) or 0
                total_tokens = getattr(meta, "total_token_count", 0) or (prompt_tokens + candidate_tokens)

        except (ImportError, Exception) as genai_err:
            if any(kw in str(genai_err).lower() for kw in ["429", "quota", "resourceexhausted"]):
                raise genai_err

            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel(model_name)

            parts = []
            for frame_data in frames_jpg:
                parts.append({"mime_type": "image/jpeg", "data": frame_data})
            parts.append(prompt)

            response = model.generate_content(parts)
            raw_response_text = response.text or ""

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                meta = response.usage_metadata
                prompt_tokens = getattr(meta, "prompt_token_count", 0) or 0
                candidate_tokens = getattr(meta, "candidates_token_count", 0) or 0
                total_tokens = getattr(meta, "total_token_count", 0) or (prompt_tokens + candidate_tokens)

        logger.info(
            f"[GEMINI VISION VIDEO] Model: '{model_name}' | "
            f"Frames Sampled: {len(frames_jpg)} | "
            f"Prompt Tokens: {prompt_tokens} | "
            f"Output Tokens: {candidate_tokens} | "
            f"Total Tokens: {total_tokens}"
        )

        structured_json = parse_defensive_json(raw_response_text)
        extracted_summary = structured_json.get("extracted_text") or raw_response_text
        act_g = structured_json.get("activity_guess") or ""
        zone_g = structured_json.get("zone_guess") or ""
        prog_g = structured_json.get("progress_guess")
        defects = structured_json.get("defects_noted") or ""

        composite_text_parts = [extracted_summary]
        if act_g:
            composite_text_parts.append(f"Activity: {act_g}")
        if zone_g:
            composite_text_parts.append(f"Location: {zone_g}")
        if prog_g is not None:
            composite_text_parts.append(f"Progress: {prog_g}%")
        if defects and defects.lower() != "none":
            composite_text_parts.append(f"Defects/Issues: {defects}")

        full_report_text = ". ".join(composite_text_parts)

        return {
            "model": model_name,
            "raw_response": raw_response_text,
            "structured_data": structured_json,
            "full_report_text": full_report_text,
            "frames_analyzed": len(frames_jpg),
            "token_usage": {
                "prompt_tokens": prompt_tokens,
                "candidate_tokens": candidate_tokens,
                "total_tokens": total_tokens
            }
        }

    except GeminiRateLimitError:
        raise
    except Exception as e:
        _handle_gemini_exception(e)


def extract_report_entities_with_gemini(
    raw_report_text: str,
    custom_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Task 2: Sends report text to Gemini for structured JSON entity extraction.
    Parses response defensively, handles 429 quota errors gracefully without crashing.
    """
    api_key = settings.get_gemini_api_key(enforce=False)
    if not api_key:
        logger.info("[GEMINI TEXT EXTRACT] GEMINI_API_KEY not set, using basic extraction.")
        return {}

    model_name = _sanitize_model_name()

    prompt = custom_prompt or (
        "You are an expert construction site monitor analyzing a field report.\n"
        f"Report text: \"{raw_report_text}\"\n\n"
        "Extract the construction activity, location zone, progress %, and status.\n"
        "Respond strictly with a single valid JSON object containing these exact keys:\n"
        "{\n"
        '  "activity_guess": "Name of activity (e.g. Raft Foundation, Concrete Pour) or null",\n'
        '  "zone_guess": "Zone name (e.g. Zone A, Pier 4, Shaft B) or null",\n'
        '  "progress_guess": 85.0,\n'
        '  "status_guess": "in_progress or completed or not_started or null"\n'
        "}"
    )

    try:
        raw_response_text = ""
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            raw_response_text = response.text or ""
        except (ImportError, Exception) as genai_err:
            if any(kw in str(genai_err).lower() for kw in ["429", "quota", "resourceexhausted"]):
                raise GeminiRateLimitError("AI extraction unavailable, using basic extraction")

            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            raw_response_text = response.text or ""

        parsed = parse_defensive_json(raw_response_text)
        logger.info(f"[GEMINI HYBRID EXTRACT SUCCESS] {parsed}")
        return parsed
    except GeminiRateLimitError:
        logger.warning("[GEMINI TEXT EXTRACT] Gemini API rate limited (429). AI extraction unavailable, using basic extraction.")
        return {}
    except Exception as e:
        logger.warning(f"[GEMINI TEXT EXTRACT] Gemini API error: {e}. AI extraction unavailable, using basic extraction.")
        return {}


def extract_fields_hybrid(raw_report_text: str, force_gemini: bool = False) -> Dict[str, Any]:
    """
    Task 2 Hybrid Mode: Runs deterministic regex extraction first.
    Only calls Gemini LLM if regex extraction comes back with missing fields
    (e.g., no zone found or no progress % found) OR if force_gemini is True.
    """
    from app.utils.matching import extract_entities_from_report

    regex_entities = extract_entities_from_report(raw_report_text)
    zone_guess = regex_entities.get("zoneKeyword")
    progress_guess = regex_entities.get("extractedProgress")

    extraction_source = "regex"

    # Call Gemini ONLY when regex is incomplete or force_gemini toggle is enabled
    needs_gemini = force_gemini or (zone_guess is None) or (progress_guess is None)

    if needs_gemini:
        gemini_parsed = extract_report_entities_with_gemini(raw_report_text)
        if gemini_parsed:
            if not zone_guess and gemini_parsed.get("zone_guess"):
                zone_guess = gemini_parsed.get("zone_guess")
                extraction_source = "gemini"
            if progress_guess is None and gemini_parsed.get("progress_guess") is not None:
                try:
                    progress_guess = float(gemini_parsed["progress_guess"])
                    extraction_source = "gemini"
                except (ValueError, TypeError):
                    pass
            if force_gemini and (gemini_parsed.get("zone_guess") or gemini_parsed.get("progress_guess") is not None):
                extraction_source = "gemini"

    return {
        "zone_guess": zone_guess,
        "progress_guess": progress_guess,
        "extraction_source": extraction_source,
        "regex_entities": regex_entities
    }

