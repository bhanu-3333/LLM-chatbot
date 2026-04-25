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

def _fix_spaces(text: str) -> str:
    """Restore spaces that mistral drops between words under memory pressure."""
    # Insert space before capital letters (camelCase fix)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    # Insert space between letters and digits
    text = re.sub(r'(\d)([A-Za-z])', r'\1 \2', text)
    text = re.sub(r'([A-Za-z])(\d)', r'\1 \2', text)
    # Fix common run-together words using known boundaries
    fixes = [
        (r'(not)(available|found|present|provided|mentioned|stated|given|included|specified|in|the|as|there|is|of|for|above)', r'\1 \2'),
        (r'(there)(is|are|was|were|no|not)', r'\1 \2'),
        (r'(in)(the|this|these|those|a|an)', r'\1 \2'),
        (r'(of)(the|this|these|a|an)', r'\1 \2'),
        (r'(as)(there|the|a|an)', r'\1 \2'),
        (r'(for)(the|this|a|an|determining|whether)', r'\1 \2'),
        (r'(whether)(the|this|a|an)', r'\1 \2'),
    ]
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text

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

    # For diagnostic questions, check if any query keyword appears in context at all
    # If none do, skip the LLM entirely and return NOT_FOUND
    if not _is_value_question(question):
        stopwords = {"what", "is", "the", "of", "this", "that", "are", "was", "were", "patient",
                     "give", "tell", "show", "does", "have", "has", "had", "did", "do"}
        keywords = [w.lower() for w in question.split() if len(w) >= 4 and w.lower() not in stopwords]
        context_lower = context.lower()
        if keywords and not any(kw in context_lower for kw in keywords):
            print(f"[ollama] No keywords found in context — returning NOT_FOUND directly")
            yield json.dumps({"chunk": NOT_FOUND_RESPONSE}) + "\n"
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

        clean_response = _fix_spaces(full_response.strip())

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
