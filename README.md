# ResQVision

ResQVision is an AI-assisted disaster and rescue response assessment system developed during a one-day hackathon. It detects people in emergency/disaster scene imagery using YOLO, extracts deterministic scene features, and feeds structured evidence into an LLM via Groq API (`openai/gpt-oss-120b`) to produce schema-validated incident assessments.

> **Privacy & Integrity Principle**: The LLM *never* sees raw image pixels—only deterministic, structured evidence. Furthermore, 2D image detection *never* assumes or establishes real-world geographic coordinates unless explicitly geotagged by external telemetry.

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

- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Backend**: Python FastAPI with Pydantic validation
- **Object Detection**: Ultralytics YOLO (Nano model, person class only)
- **Reasoning**: Groq API (`openai/gpt-oss-120b`) with strict Pydantic JSON schema
- **Storage**: Local JSON store with file-based persistence

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete specifications, API contracts, and roadmap.
