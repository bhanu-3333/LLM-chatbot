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
    # Insert space before capital letters after lowercase (camelCase fix)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    # Insert space between digits and letters
    text = re.sub(r'(\d)([A-Za-z])', r'\1 \2', text)
    text = re.sub(r'([A-Za-z])(\d)', r'\1 \2', text)
    return text

def _extract_direct(docs: list, question: str):
    """
    Extract answer directly from docs by finding lines matching each
    query keyword separately. Returns (answer_text, precise_citations).
    """
    stopwords = {"what", "is", "the", "of", "this", "that", "are", "was", "were", "patient",
                 "give", "tell", "show", "value", "result", "level", "test", "in", "for", "and"}
    keywords = [w.upper() for w in question.split() if len(w) >= 2 and w.lower() not in stopwords]

    if not keywords:
        return None, []

    found_lines = []
    precise_sources = []
    seen = set()
    matched_keywords = set()

    import os as _os

    # Pass 1: exact keyword match — search each doc separately to track source
    for kw in keywords:
        for doc in docs:
            lines = doc.page_content.split('\n')
            for line in lines:
                if kw in line.upper() and re.search(r'\d+\.?\d*', line):
                    clean = line.strip()
                    if re.match(r'^\d+\.', clean):
                        continue
                    if clean and clean not in seen and 5 <= len(clean) <= 100:
                        found_lines.append(clean)
                        seen.add(clean)
                        matched_keywords.add(kw)
                        # Track exact source for this answer line
                        src = _os.path.basename(doc.metadata.get("source", "unknown"))
                        doc_type = doc.metadata.get("type", "pdf")
                        page = doc.metadata.get("page", None)
                        if doc_type == "image":
                            label = f"{src} (Image OCR)"
                        elif page is not None:
                            label = f"{src} (Page {page + 1})"
                        else:
                            label = src
                        if label not in precise_sources:
                            precise_sources.append(label)
                        break

    # Pass 2: OCR suffix match for unmatched keywords
    unmatched = [kw for kw in keywords if kw not in matched_keywords]
    for kw in unmatched:
        suffix = kw[-2:] if len(kw) >= 3 else kw
        for doc in docs:
            content_upper = doc.page_content.upper()
            pos = 0
            while True:
                pos = content_upper.find(suffix, pos)
                if pos == -1:
                    break
                line_start = doc.page_content.rfind('\n', 0, pos) + 1
                line_end = doc.page_content.find('\n', pos)
                if line_end == -1:
                    line_end = len(doc.page_content)
                line = doc.page_content[line_start:line_end].strip()
                if re.search(r'\d+\.?\d*', line) and 5 <= len(line) <= 100 and line not in seen and not re.match(r'^\d+\.', line):
                    found_lines.append(line)
                    seen.add(line)
                    src = _os.path.basename(doc.metadata.get("source", "unknown"))
                    doc_type = doc.metadata.get("type", "pdf")
                    page = doc.metadata.get("page", None)
                    if doc_type == "image":
                        label = f"{src} (Image OCR)"
                    elif page is not None:
                        label = f"{src} (Page {page + 1})"
                    else:
                        label = src
                    if label not in precise_sources:
                        precise_sources.append(label)
                    break
                pos += 1

    answer = "\n".join(found_lines) if found_lines else None
    return answer, precise_sources

def _is_value_question(question: str) -> bool:
    """Returns True if the question is asking for a specific lab value/result."""
    value_triggers = ["what is", "what are", "value", "result", "level", "reading", "score", "time", "ratio", "count"]
    q = question.lower()
    return any(t in q for t in value_triggers)

def stream_answer(context: str, question: str, docs: list = None):
    # Only use direct extraction for value/result questions
    if _is_value_question(question) and docs:
        direct, precise_citations = _extract_direct(docs, question)
        if direct:
            # Fix common OCR errors where leading characters are dropped (CRP → RP, etc.)
            fixed_lines = []
            for line in direct.split('\n'):
                for kw in [w.upper() for w in question.split() if len(w) >= 2]:
                    truncated = kw[1:]
                    if len(truncated) >= 2 and line.upper().startswith(truncated):
                        line = kw + line[len(truncated):]
                        break
                fixed_lines.append(line)
            direct = "\n".join(fixed_lines)
            print(f"[ollama] Direct extraction: {repr(direct)}")
            # Send precise citations first, then the answer
            if precise_citations:
                yield json.dumps({"citations": precise_citations}) + "\n"
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
