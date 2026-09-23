import os
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException
import whisper

router = APIRouter(prefix="/transcribe", tags=["Voice Transcription"])

# Global cache for whisper model instance
_model_instance = None

def get_whisper_model():
    global _model_instance
    if _model_instance is None:
        print("[SAARTHI WHISPER] Loading Whisper model 'base'...")
        # 'base' or 'tiny' model for fast CPU/GPU inference
        _model_instance = whisper.load_model("base")
        print("[SAARTHI WHISPER] Whisper model loaded successfully!")
    return _model_instance

@router.post("")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided")

    suffix = os.path.splitext(file.filename)[1] or ".webm"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        print(f"[SAARTHI WHISPER] Processing audio file ({len(content)} bytes)...")
        model = get_whisper_model()
        result = model.transcribe(temp_file.name)
        
        transcribed_text = result.get("text", "").strip()
        detected_language = result.get("language", "en")
        print(f"[SAARTHI WHISPER] Transcribed text: '{transcribed_text}' (Language: {detected_language})")

        return {
            "text": transcribed_text,
            "language": detected_language,
            "status": "success"
        }
    except Exception as e:
        print(f"[SAARTHI WHISPER ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Whisper transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_file.name):
            try:
                os.remove(temp_file.name)
            except Exception:
                pass
