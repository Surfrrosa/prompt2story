# ---- Prompt2Story backend (FastAPI) ----
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps used for healthcheck and PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Install Python deps explicitly required by working main.py
# (FastAPI/uvicorn/openai/dotenv/PyPDF2/pydantic)
RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    openai \
    python-dotenv \
    PyPDF2 \
    pydantic

# Copy the whole repo (so relative prompt files work)
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Healthcheck -> /healthz
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/healthz || exit 1

# Launch app
# IMPORTANT: This assumes your working file is main.py at repo root exporting `app`.
# If you keep it in backend/app/main.py, change to: "uvicorn app.main:app ..."
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

