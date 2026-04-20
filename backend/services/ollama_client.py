from langchain_ollama import OllamaLLM
from config import LLM_MODEL

llm = OllamaLLM(
    model=LLM_MODEL,
    temperature=0.1,
    num_ctx=2048,  # Reduce context window for faster processing
    num_thread=8   # Use more threads for CPU inference
)

NOT_FOUND_RESPONSE = "I cannot answer from the provided documents."

_NOT_FOUND_SIGNALS = [
    "cannot answer", "not found", "no information",
    "not present", "not provided", "context does not", "context doesn't"
]

def generate_answer(context: str, question: str) -> str:
    prompt = f"""You are a strict medical document assistant.

RULES:
- Answer ONLY using information from the context below.
- Do NOT explain, summarize, or reason outside the context.
- Do NOT add any text before or after your answer.
- If the answer is not present in the context, respond with EXACTLY this phrase and nothing else:
  I cannot answer from the provided documents.

Context:
{context}

Question:
{question}

Answer:"""

    raw = llm.invoke(prompt).strip()
    lower = raw.lower()

    if not raw or any(signal in lower for signal in _NOT_FOUND_SIGNALS):
        return NOT_FOUND_RESPONSE

    return raw
