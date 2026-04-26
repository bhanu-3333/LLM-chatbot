# Offline Medical RAG System

## Overview
This repository contains an offline-first Retrieval-Augmented Generation (RAG) system designed specifically for the medical sector. The application provides medical professionals with a secure, local environment to upload patient documents, parse unstructured medical data, and query a local Large Language Model (LLM) for clinical insights and historical summarization. 

By operating entirely without internet connectivity for inference and embedding, the system guarantees zero data exfiltration, ensuring strict adherence to data privacy regulations such as HIPAA regarding Protected Health Information (PHI).

## System Capabilities
- **Air-Gapped Processing:** Utilizes local embedding models and LLMs to ensure that sensitive medical data never leaves the host machine.
- **Patient-Centric Context:** Implements isolated vector spaces for individual patients, allowing multi-document contextual memory per patient record.
- **Information Retrieval:** Built on a RAG architecture using LangChain to retrieve and inject relevant clinical context before LLM generation.
- **Role-Based Access:** Secures endpoint access via JWT-based authentication for registered clinical personnel.

## System Architecture

### Frontend Layer
- **Framework:** React
- **Build Tool:** Vite
- **Routing:** React Router
- **Styling:** Custom CSS (No external UI libraries)

### Backend Layer
- **Framework:** FastAPI (Python)
- **Database:** SQLite with SQLAlchemy ORM (relational metadata mapping)
- **RAG Pipeline:** LangChain
- **Embeddings:** HuggingFace `all-MiniLM-L6-v2` (configured for strict offline execution)

### Inference Engine
- **Platform:** Ollama
- **Supported Models:** Mistral, Llama 3, Phi-3 (configurable via backend settings)

## Developer Setup Instructions

### System Requirements
- Python 3.9+
- Node.js 18+
- Ollama installed locally

### 1. Initialize the Inference Engine
The system requires a localized AI model. Open a terminal and pull the default model prior to running the application:
```bash
ollama pull mistral
```

### 2. Backend Environment Configuration
Navigate to the backend directory and establish a virtual environment:
```bash
cd backend
python -m venv venv
```

Activate the environment:
- **Windows:** `venv\Scripts\activate`
- **Unix/macOS:** `source venv/bin/activate`

Install dependencies and start the local server:
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
The FastAPI instance will initialize on `http://localhost:8000`.

### 3. Frontend Environment Configuration
In a separate terminal session, navigate to the frontend directory:
```bash
cd medical-rag-frontend
npm install
npm run dev
```
The React application will initialize on `http://localhost:5173`.

## Operational Workflow
1. **Authentication:** Register a clinical user account and authenticate via the web interface.
2. **Patient Registration:** Generate a unique Patient ID via the dashboard.
3. **Data Ingestion:** Upload clinical documents (PDF, TXT). The backend processes, chunks, embeds, and stores the document vectors into the patient's specific offline index.
4. **Query Execution:** Utilize the chat interface to query the localized LLM. The system retrieves the most relevant vector chunks to synthesize an accurate response based exclusively on the provided documents.

## Deployment Constraints and Guidelines
Due to the architectural requirement of processing data strictly offline to protect PHI, standard ephemeral cloud deployments (e.g., Vercel, Render free/standard tiers) are structurally incompatible. Local inference requires persistent storage and significant compute resources.

**Recommended Infrastructures:**
- **On-Premise Server:** Deploy within a localized, firewalled hospital/clinic network using a dedicated workstation equipped with a discrete GPU to minimize latency.
- **Dedicated Cloud Instance (IaaS):** If remote access is strictly necessary, deploy a containerized environment onto a dedicated GPU instance (e.g., AWS EC2 G-series, Azure NV-series) within a secure Virtual Private Cloud (VPC).

## License
Proprietary software. Restricted for internal clinical demonstration and authorized medical deployment.
