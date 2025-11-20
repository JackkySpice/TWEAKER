FROM node:18-alpine as frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM python:3.11-slim

# Install system dependencies for mitmproxy and rust (if needed for some py deps)
# mitmproxy often requires rust to build cryptography if not using wheel
# But usually standard slim image + pip is fine for wheels.
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend .
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# We need to serve the frontend from FastAPI for a single container deployment
# I'll add a static mount to main.py in a moment.

EXPOSE 8000 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
