FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

WORKDIR /app

# Minimal system deps (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# Install Poetry (pin version to avoid surprises)
RUN pip install "poetry==1.8.3"

# Use layer caching: lockfiles first
COPY backend/pyproject.toml backend/poetry.lock* ./

# Install prod deps into the image (no project package install)
RUN poetry install --only=main --no-root --no-ansi

# Now add the application code
COPY backend/app ./app

# Non-root user
RUN useradd -m appuser
USER appuser

EXPOSE 8000

# Health check path must exist in your app
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:8000/healthz || exit 1

# Run directly (no poetry run needed)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
