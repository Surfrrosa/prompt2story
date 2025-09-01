# ---- Prompt2Story backend (FastAPI) ----
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps used for healthcheck and PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    bash \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements and install pinned Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the whole repo (so relative prompt files work)
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Healthcheck -> /healthz
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/healthz || exit 1

# Launch app (main.py at repo root exporting `app`)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]