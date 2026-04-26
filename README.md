# MedIntel AI — Offline Medical RAG System

### 🎥 [Click here to watch the MedIntel AI Demo Video](./medical-rag-frontend/src/assets/demo.mp4)

## Overview
This repository contains an offline-first Retrieval-Augmented Generation (RAG) system designed specifically for the medical sector. The application provides medical professionals with a secure, local environment to upload patient documents, parse unstructured medical data, and query a local Large Language Model (LLM) for clinical insights and historical summarization. 
## The Problem

Doctors deal with hundreds of patient records every day, but most of that information is buried inside long, unstructured documents — lab reports, discharge summaries, clinical notes. Finding something as simple as a lab value or a medication history means manually flipping through files or using basic keyword search that doesn't understand medical language.

That search takes minutes. Minutes that matter in a clinical setting.

On top of that, patient data can't be sent to cloud-based AI tools because of privacy regulations. So doctors are stuck — too much data, no intelligent way to access it quickly, and no safe way to use modern AI.

## The Solution

MedIntel AI is a fully offline AI assistant built for hospitals. Doctors upload patient documents once, and from that point they can just ask questions in plain English — "What is the CRP level?", "What medications is this patient on?", "Does this patient have a history of diabetes?" — and get answers pulled directly from the actual documents, with the source cited.

No internet. No data leaving the hospital. No hallucinated answers.

Each doctor has their own patient records. Each patient has their own isolated AI context. The system only answers from what's in the documents — if the information isn't there, it says so.

---

A local AI system that lets doctors upload patient reports and ask questions about them in plain English. Everything runs on your machine — no internet needed, no data leaves the hospital.

---

## What it does

Doctors log in, upload patient documents (PDFs, scanned images, lab reports), and then chat with an AI that answers questions based only on those documents. Each patient has their own isolated index, so there's no mixing of data between patients or doctors.

If the answer isn't in the documents, it says so. It doesn't guess.

---

## Stack

**Backend** — FastAPI + Python 3.10, SQLite, SQLAlchemy, LangChain  
**Frontend** — React 18, Vite, React Router  
**Embeddings** — `all-MiniLM-L6-v2` (HuggingFace, runs fully offline)  
**Vector DB** — FAISS  
**LLM** — Mistral 7B via Ollama (local, no API calls)  
**OCR** — Tesseract (for scanned/image-based reports)  
**Auth** — JWT tokens, bcrypt password hashing

---

## Setup

### Requirements
- Python 3.10
- Node.js 18+
- Ollama installed — https://ollama.com

### 1. Pull the model
```bash
ollama pull mistral
```

### 2. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
uvicorn main:app --reload
```
Runs at `http://127.0.0.1:8000`

### 3. Frontend
```bash
cd medical-rag-frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`

---

## How to use

1. Open `http://localhost:5173`
2. Register a doctor account (no hospital code needed)
3. Log in
4. Go to **Upload Reports** — add a patient name, age, gender, and upload their documents
5. Go to **Library** — find the patient and open their chat
6. Ask questions like:
   - "What is the CRP level?"
   - "What is the prothrombin time?"
   - "Does the patient have diabetes?"

The system answers from the uploaded documents only. If the information isn't there, it tells you.

---

## Supported file types

- PDF (text-based)
- PDF (scanned) — processed via OCR
- JPEG / PNG images
- Excel (.xlsx, .xls)
- Text files (.txt, .csv)

---

## Notes

- Mistral needs ~4.5GB free RAM. If it fails to load, close other apps and try again.
- The embedding model loads on first query and stays cached — subsequent queries are faster.
- All data is stored locally under `backend/storage/` and `backend/medical_rag.db`.
- No cloud deployment — this is intentionally an on-premise system.

---

## License

For internal clinical demonstration and authorized medical use only.
