from fastapi import FastAPI
from models.db import init_db
from routers import ingest, chat, auth, patients

app = FastAPI(
    title="Medical RAG API",
    description="Offline RAG system for patient document retrieval using FAISS and Ollama",
    version="1.0.0"
)

app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(chat.router)
app.include_router(patients.router)

@app.on_event("startup")
def on_startup():
    init_db()
    print("[startup] Database initialized.")
    print("[startup] Medical RAG API is ready.")
    print("[startup] Endpoints: POST /auth/register-hospital | /auth/register-doctor | /auth/login")
    print("[startup]            POST /upload | POST /chat | GET /health")

@app.get("/health", tags=["System"], summary="Health check")
def health():
    return {"status": "ok", "message": "API running"}

@app.get("/", tags=["System"], summary="Root")
def root():
    return {"message": "Medical RAG API — visit /docs for Swagger UI"}
