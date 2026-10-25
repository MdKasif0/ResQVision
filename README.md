# ResQVision

ResQVision is an AI-assisted disaster and rescue response assessment system developed during a one-day hackathon. It detects people in emergency/disaster scene imagery using YOLO, extracts deterministic scene features, and feeds structured evidence into an LLM via Groq API (`openai/gpt-oss-120b`) to produce schema-validated incident assessments.

> **Privacy & Evidentiary Integrity**:
> 1. The LLM *never* receives or ingests raw image pixels—only deterministic mathematical and spatial telemetry.
> 2. 2D bounding boxes *never* assume or establish real-world GPS coordinates without explicit camera telemetry.
> 3. Transparent Fallback: If `GROQ_API_KEY` is not configured or unavailable, the backend automatically uses deterministic rule-based triage, clearly labeled as `rules_fallback`.

---

## Architecture Overview

```
                      +-------------------+
                      |   Next.js App     |
                      | (Tailwind CSS)    |
                      +---------+---------+
                                |
                   HTTP / JSON  |
                                v
                      +-------------------+
                      |  FastAPI Backend  |
                      +----+---------+----+
                           |         |
               Image Bytes |         | Structured Evidence JSON
                           v         v
                +------------+     +-------------------+
                | YOLOv8/v11 |     | Groq LLM          |
                | (Person)   |     | (gpt-oss-120b)    |
                +------------+     +-------------------+
```

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4
- **Backend**: Python FastAPI with Pydantic validation
- **Object Detection**: Ultralytics YOLO (Nano model, person class only)
- **Reasoning**: Groq API (`openai/gpt-oss-120b`) with strict Pydantic JSON schema
- **Storage**: Local JSON store with file-based persistence (`data/incidents.json` & `data/uploads/`)

---

## Prerequisites

- **Python**: Version 3.10 to 3.12 (with `venv` and `pip`)
- **Node.js**: Version 18.x or 20.x+ (with `npm`)

---

## Installation & Setup

### 1. Clone & Set Up Backend

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

*Note on Groq API Key*: Open `backend/.env`. If you have a Groq key, set `GROQ_API_KEY=gsk_...`. If unset, ResQVision automatically runs in deterministic rules-fallback mode, accurately labeled in all audit records and UI screens.

### 2. Set Up Frontend

```bash
cd ../frontend

# Install dependencies
npm install
```

---

## Running the Application

### Option A: Unified Dev Runner (Recommended)

From the project root:

```bash
./scripts/dev.sh
```

This starts both services concurrently and cleanly terminates both on `Ctrl+C`:
- **Backend API**: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
- **Frontend Dashboard**: `http://localhost:3000`

### Option B: Separate Terminals

**Terminal 1 — Backend**:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend**:
```bash
cd frontend
npm run dev
```

---

## Verification & Testing

### Run Backend Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/
```

### Run Frontend Production Build

```bash
cd frontend
npm run build
```

---

## Core Routes & Endpoints

| Route / Endpoint | Type | Description |
| :--- | :--- | :--- |
| `http://localhost:3000/` | Frontend | Marketing Landing Site & Architecture Overview |
| `http://localhost:3000/analyze` | Frontend | Image Upload, Live YOLO Overlay & Triage Assessment |
| `http://localhost:3000/incidents` | Frontend | Incident Registry & Audit Log with Detail View & Deletion |
| `http://localhost:3000/map` | Frontend | High-level Geospatial Incident Map |
| `GET /api/health` | Backend | Health check, model status, and Groq configuration flag |
| `POST /api/detect` | Backend | Runs YOLO person detector & deterministic feature extraction |
| `POST /api/analyze` | Backend | Complete pipeline: detection, feature extraction, reasoning & persistence |
| `GET /api/incidents` | Backend | List persisted incident summaries |
| `GET /api/incidents/{id}` | Backend | Fetch complete incident audit record |
| `GET /api/incidents/{id}/image`| Backend | Stream original uploaded image asset |
| `DELETE /api/incidents/{id}` | Backend | Delete incident record and file asset |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete technical specifications.
