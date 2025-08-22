--- Dockerfile.txt
+++ Dockerfile
@@
-FROM python:3.12-slim
-
-WORKDIR /app
-
-# Install system dependencies
-RUN apt-get update && apt-get install -y \
-    curl \
-    && rm -rf /var/lib/apt/lists/*
-
-# Install Poetry
-RUN pip install poetry
-
-# Copy poetry files from backend directory
-COPY backend/pyproject.toml backend/poetry.lock* ./
-
-# Configure poetry
-RUN poetry config virtualenvs.create false
-
-# Install dependencies (skip installing current project as package)
-RUN poetry install --only=main --no-root
-
-# Copy application code from backend directory
-COPY backend/app ./app
-
-# Expose port
-EXPOSE 8000
-
-# Health check
-HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
-  CMD curl -f http://localhost:8000/healthz || exit 1
-
-# Run the application
-CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
+FROM python:3.12-slim
+WORKDIR /app
+
+# System deps (curl for healthcheck)
+RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
+
+# Copy code
+COPY main.py /app/main.py
+COPY requirements.txt /app/requirements.txt
+
+# Install runtime deps (pin minimally for speed/stability)
+RUN pip install --no-cache-dir -r /app/requirements.txt
+
+EXPOSE 8000
+HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
+  CMD curl -fsS http://localhost:8000/healthz || exit 1
+
+# Start server
+CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
