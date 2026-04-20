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
    """Remove consecutive duplicate words across the full response."""
    tokens = text.split()
    result = []
    for token in tokens:
        clean = token.strip(".,;:!?()")
        if not result or clean.lower() != result[-1].strip(".,;:!?()").lower():
            result.append(token)
    return " ".join(result)

def stream_answer(context: str, question: str):
    prompt = f"""You are a medical assistant. Answer using ONLY the context below.
Be concise and direct. Do not repeat yourself.
If answer not in context, say exactly: I cannot answer from the provided documents.

Context:
{context}

Question: {question}
Answer:"""

    payload = {
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": 0, "num_ctx": 1024, "repeat_penalty": 1.8, "repeat_last_n": 128}
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=None)
        response.raise_for_status()

        # Collect full response first, then dedup, then stream word by word
        full_response = ""
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                full_response += data.get("response", "")
                if data.get("done"):
                    break

        print(f"[ollama] Raw response: {repr(full_response[:200])}")

        # Dedup on the complete text — catches every-other-word repetition pattern
        clean_response = _dedup_words(full_response.strip())
        print(f"[ollama] Clean response: {repr(clean_response[:200])}")

        # Stream word by word so frontend still gets streaming effect
        words = clean_response.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield json.dumps({"chunk": chunk}) + "\n"

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
