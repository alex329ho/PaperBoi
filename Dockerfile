# Dockerfile for PaperBoi FastAPI backend
# Uses Python 3.11 slim image for production-ready builds.

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY backend /app

# Create non-root user for security
RUN useradd -m paperboi && chown -R paperboi:paperboi /app
USER paperboi

EXPOSE 8000

# Default command for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
