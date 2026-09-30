import os
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(tags=["Voice Transcription"])

# Global cache for whisper model instance
_model_instance = None
_model_engine = None

def get_whisper_model():
    global _model_instance, _model_engine
    if _model_instance is None:
        model_name = os.getenv("WHISPER_MODEL_NAME", "tiny")
        try:
            print(f"[SAARTHI WHISPER] Attempting faster-whisper model '{model_name}' (cpu, int8)...")
            from faster_whisper import WhisperModel
            _model_instance = WhisperModel(model_name, device="cpu", compute_type="int8")
            _model_engine = "faster-whisper"
            print(f"[SAARTHI WHISPER] faster-whisper model '{model_name}' (int8) loaded successfully!")
        except Exception as e1:
            print(f"[SAARTHI WHISPER WARN] Could not load faster-whisper ({e1}). Falling back to openai-whisper...")
            try:
                import whisper
                _model_instance = whisper.load_model(model_name)
                _model_engine = "openai-whisper"
                print(f"[SAARTHI WHISPER] openai-whisper model '{model_name}' loaded successfully!")
            except Exception as e2:
                print(f"[SAARTHI WHISPER ERROR] Could not load any Whisper model: {e2}")
                raise e2
    return _model_instance, _model_engine

@router.post("/transcribe")
@router.post("/reports/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided")

    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file uploaded")

        temp_file.write(content)
        temp_file.close()

        print(f"[SAARTHI WHISPER] Processing audio file ({len(content)} bytes, file={file.filename})...")
        model, engine_type = get_whisper_model()
        
        if engine_type == "faster-whisper":
            segments, info = model.transcribe(temp_file.name, beam_size=5)
            transcribed_text = " ".join([segment.text for segment in segments]).strip()
            detected_language = info.language or "en"
        else:
            result = model.transcribe(temp_file.name)
            transcribed_text = result.get("text", "").strip()
            detected_language = result.get("language", "en")

        print(f"[SAARTHI WHISPER] Transcribed text via {engine_type}: '{transcribed_text}' (Language: {detected_language})")

        return {
            "text": transcribed_text,
            "language": detected_language,
            "engine": engine_type,
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

