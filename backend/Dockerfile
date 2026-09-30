FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (gcc, libpq-dev, ffmpeg for Whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Pre-download SentenceTransformer (SBERT) and Whisper (tiny int8) models during IMAGE BUILD
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8'); import whisper; whisper.load_model('tiny')"

COPY . .

RUN chmod +x /app/start.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["/app/start.sh"]
