import json
import re
import requests
from config import LLM_MODEL

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

NOT_FOUND_RESPONSE = "I cannot answer from the provided documents."

_NOT_FOUND_SIGNALS = [
    "cannot answer", "not found", "no information",
    "not present", "not provided", "context does not", "context doesn't"
]

def _dedup_words(text: str) -> str:
    """Remove consecutive duplicate words produced by model repetition."""
    tokens = text.split(" ")
    result = []
    for i, token in enumerate(tokens):
        if i == 0 or token.lower() != tokens[i - 1].lower():
            result.append(token)
    return " ".join(result)

def stream_answer(context: str, question: str):
    # Strict prompt to prevent hallucination
    prompt = f"""You are a medical assistant. Answer using ONLY the context below.
Rules:
- Write each word ONCE only. Never repeat words.
- Be concise and direct.
- If answer not in context, say exactly: I cannot answer from the provided documents.

Context:
{context}

Question: {question}
Answer:"""
    
    payload = {
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": 0, "num_ctx": 1024, "repeat_penalty": 1.5, "repeat_last_n": 64}
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
                    chunk = _dedup_words(chunk)
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
