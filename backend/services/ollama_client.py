import json
import re
import requests
from config import LLM_MODEL

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

NOT_FOUND_RESPONSE = "I cannot answer from the provided documents."

_NOT_FOUND_SIGNALS = [
    "cannot answer from the provided documents",
    "not found in the provided",
    "not present in the provided",
    "not available in the provided documents",
    "information is not available",
    "not found.",
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

def _extract_direct(context: str, question: str) -> str:
    """
    Extract answer directly from context by finding lines that contain
    ALL significant query keywords AND a numeric value.
    """
    # Filter to meaningful keywords (skip common words)
    stopwords = {"what", "is", "the", "of", "this", "that", "are", "was", "were", "patient", "give", "tell", "show", "value", "result", "level", "test"}
    keywords = [w.upper() for w in question.split() if len(w) >= 2 and w.lower() not in stopwords]

    if not keywords:
        return None

    lines = context.split('\n')
    best_line = None
    best_score = 0

    for line in lines:
        line_upper = line.upper()
        # Count how many keywords appear in this line
        matches = sum(1 for kw in keywords if kw in line_upper)
        # Line must have a number (result value) and match at least half the keywords
        if matches >= max(1, len(keywords) // 2) and re.search(r'\d+\.?\d*', line):
            if matches > best_score:
                best_score = matches
                best_line = line.strip()

    return best_line if best_line else None

def _is_value_question(question: str) -> bool:
    """Returns True if the question is asking for a specific lab value/result."""
    value_triggers = ["what is", "what are", "value", "result", "level", "reading", "score", "time", "ratio", "count"]
    q = question.lower()
    return any(t in q for t in value_triggers)

def stream_answer(context: str, question: str):
    # Only use direct extraction for value/result questions
    if _is_value_question(question):
        direct = _extract_direct(context, question)
        if direct:
            print(f"[ollama] Direct extraction: {repr(direct)}")
            yield json.dumps({"chunk": direct}) + "\n"
            return

    prompt = f"""Medical report data:
---
{context}
---
Answer this question using ONLY the data above: {question}

Rules:
- If the answer is clearly present in the data, state it directly in 1-2 lines.
- If the data does not contain enough information to answer, reply ONLY with: "This information is not available in the provided documents."
- Do NOT explain, reason, or add anything beyond what the data says.
Answer:"""

    payload = {
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": 0, "num_ctx": 2048, "repeat_penalty": 1.8, "num_predict": 50}
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

        # Fix missing spaces from poor OCR or model output
        clean_response = re.sub(r'([a-z])([A-Z])', r'\1 \2', clean_response)
        clean_response = re.sub(r'(\d)([A-Za-z])', r'\1 \2', clean_response)
        clean_response = re.sub(r'([A-Za-z])(\d)', r'\1 \2', clean_response)
        # Fix words run together (e.g. "notavailable" → "not available") — only for known stopwords
        import re as _re
        clean_response = _re.sub(r'\b(not)(available|found|present|provided|mentioned|stated|given|included|specified)\b', r'\1 \2', clean_response, flags=_re.IGNORECASE)

        print(f"[ollama] Clean response: {repr(clean_response[:200])}")

        # Send as single chunk — avoids word boundary issues from token streaming
        yield json.dumps({"chunk": clean_response}) + "\n"

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
