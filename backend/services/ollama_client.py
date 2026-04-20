import json
import requests
from config import LLM_MODEL

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

NOT_FOUND_RESPONSE = "I cannot answer from the provided documents."

_NOT_FOUND_SIGNALS = [
    "cannot answer", "not found", "no information",
    "not present", "not provided", "context does not", "context doesn't"
]

def stream_answer(context: str, question: str):
    # Strict prompt to prevent hallucination
    prompt = f"""You are a medical assistant. Answer the question using ONLY the provided context. 
If the answer is not in the context, say 'I cannot answer from the provided documents.'
Do not repeat words. Be concise.

Context:
{context}

Question:
{question}

Answer:"""
    
    payload = {
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": 0, "num_ctx": 1024}
    }

    try:
        # Stream=True with requests
        response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=None)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                chunk = data.get("response", "")
                if chunk:
                    # Yield ONLY the chunk as a JSON line
                    yield json.dumps({"chunk": chunk}) + "\n"
                if data.get("done"):
                    break
    except Exception as e:
        yield json.dumps({"chunk": f"\nError: {str(e)}"}) + "\n"

def generate_answer(context: str, question: str) -> str:
    """Fallback for non-streaming calls."""
    ans = ""
    for line in stream_answer(context, question):
        try:
            d = json.loads(line)
            if "chunk" in d: ans += d["chunk"]
        except: pass
    return ans.strip() if ans else "I cannot answer from the provided documents."
