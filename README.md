# Seeing Eyes — VisionAssist Platform

An AI-powered caregiver monitoring system for visually impaired users. The platform connects smart glasses (ESP32-based) to a mobile/web app, using object detection, scene description, and text-to-speech to assist users in real time.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  Backend (FastAPI)    │────▶│  PostgreSQL 16  │
│  Expo / Web     │     │  YOLO · Gemini · gTTS │     │  caregiver_db   │
│  :8081          │     │  :8000                │     │  :5432          │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                    ▲
                         ESP32 Smart Glasses
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo 54 (React Native + Web), Expo Router, NativeWind, Zustand |
| Backend | FastAPI, Python 3.11, Uvicorn |
| AI / Vision | YOLOv8 (object detection), Google Gemini (scene description), gTTS (TTS) |
| Database | PostgreSQL 16, SQLAlchemy, asyncpg |
| Infrastructure | Docker, Docker Compose |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2+
- A **Google Gemini API key** — get one at [aistudio.google.com](https://aistudio.google.com)

## Quick Start with Docker

**1. Clone and configure environment**

```bash
git clone <repo-url>
cd Web-_for_blijder2

cp .env.example .env
# Edit .env and set your Gemini API key:
# GEMINI_API_KEY=your_key_here
```

**2. Build and start all services**

```bash
docker compose up --build
```

This spins up three services in order:
- `db` — PostgreSQL (waits for health check before backend starts)
- `backend` — FastAPI API server
- `frontend` — Expo web app

**3. Access the app**

| Service | URL |
|---|---|
| Web App | http://localhost:8081 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

> **First run note:** The backend Docker image installs PyTorch (~1.5 GB) during build. This takes several minutes on the first `--build`.

## Common Docker Commands

```bash
# Start in detached mode (background)
docker compose up -d

# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend

# Stop all services
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v

# Rebuild a single service after code changes
docker compose up --build backend
```

## Project Structure

```
.
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── main.py           # FastAPI app entry point
│   ├── auth.py           # Authentication routes
│   ├── ai_router.py      # AI detection & processing routes
│   ├── database.py       # Async database connection
│   ├── models.py         # SQLAlchemy table models
│   └── requirements.txt
└── frontend/
    ├── Dockerfile
    ├── app/              # File-based routing (Expo Router)
    │   ├── index.tsx     # Login screen
    │   ├── register.tsx  # Register screen
    │   └── (tabs)/       # Main app tabs
    ├── store/            # Zustand state management
    └── constants/        # API base URL and config
```

## Database Schema

| Table | Key Columns |
|---|---|
| `users` | username, password_hash, full_name, emergency_contact, disability_details |
| `devices` | device_serial, user_id, device_name, is_active |
| `job_logs` | job_uuid, device_serial, status, result_text, image_path, audio_path |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for scene description |

The `DATABASE_URL` is set automatically inside `docker-compose.yml` and does not need to be configured manually.

## Local Development (without Docker)

**Backend**

```bash
cd backend
pip install -r requirements.txt
# Set environment variables
export DATABASE_URL=postgresql://postgres:123456@localhost:5432/caregiver_system
export GEMINI_API_KEY=your_key_here
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npx expo start --web
```

## Demo Credentials

```
Username: demo
Password: demo1234
```
