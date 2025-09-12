# Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Drop privileges (optional)
RUN useradd -m appuser
USER appuser

# Compose will override this with service-specific commands
CMD ["python","-c","print('Image built; override CMD in compose')"]
