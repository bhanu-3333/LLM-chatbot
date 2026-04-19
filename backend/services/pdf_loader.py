"""
pdf_loader.py
Handles PDF text extraction with automatic OCR fallback for scanned PDFs.

Flow:
  1. Try PyPDFLoader (fast, text-based)
  2. If extracted text is too sparse → OCR fallback
     a. Try pytesseract (if Tesseract is installed)
     b. Try easyocr (pure Python, no system install needed)
  3. If all methods fail → raise with clear message
"""

import os
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader

MAX_PAGES        = 100   # safety limit for large files
MIN_CHARS_PAGE   = 20    # below this → treat page as needing OCR

# ── OCR engine detection ──────────────────────────────────────────────────────

def _tesseract_available() -> bool:
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def _easyocr_available() -> bool:
    try:
        import easyocr  # noqa
        return True
    except ImportError:
        return False

def _pdf2image_available() -> bool:
    try:
        import pdf2image  # noqa
        return True
    except ImportError:
        return False

# ── OCR helpers ───────────────────────────────────────────────────────────────

def _ocr_with_tesseract(images) -> list[str]:
    import pytesseract
    results = []
    for img in images:
        text = pytesseract.image_to_string(img)
        results.append(text)
    return results

def _ocr_with_easyocr(images) -> list[str]:
    import easyocr
    import numpy as np
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    results = []
    for img in images:
        arr = np.array(img)
        lines = reader.readtext(arr, detail=0)
        results.append(" ".join(lines))
    return results

def _pdf_to_images(file_path: str, max_pages: int):
    from pdf2image import convert_from_path
    return convert_from_path(file_path, first_page=1, last_page=max_pages, dpi=200)

# ── Main loader ───────────────────────────────────────────────────────────────

def load_pdf(file_path: str) -> list[Document]:
    """
    Load a PDF and return a list of LangChain Documents with metadata.
    Automatically falls back to OCR if text extraction yields sparse results.
    """
    file_name = os.path.basename(file_path)

    # Step 1: Try normal text extraction
    raw_docs = PyPDFLoader(file_path).load()
    raw_docs = raw_docs[:MAX_PAGES]

    text_docs = [d for d in raw_docs if len(d.page_content.strip()) >= MIN_CHARS_PAGE]

    if len(text_docs) == len(raw_docs) and text_docs:
        # All pages have good text — no OCR needed
        print(f"[pdf_loader] Text-based PDF — {len(text_docs)} pages extracted")
        return text_docs

    # Step 2: Some or all pages are sparse — OCR fallback
    scanned_pages = [i for i, d in enumerate(raw_docs) if len(d.page_content.strip()) < MIN_CHARS_PAGE]
    print(f"[ocr] Detected scanned PDF — {len(scanned_pages)} pages need OCR")

    if not _pdf2image_available():
        # Can't do OCR without pdf2image — return whatever text we have
        if text_docs:
            print("[ocr] pdf2image not available — returning text-only pages")
            return text_docs
        raise ValueError(
            "PDF contains no extractable text and pdf2image is not installed for OCR. "
            "Install poppler and pdf2image to enable OCR support."
        )

    # Convert PDF to images
    print(f"[ocr] Converting PDF to images (max {MAX_PAGES} pages)...")
    images = _pdf_to_images(file_path, MAX_PAGES)
    print(f"[ocr] {len(images)} page images ready")

    # Choose OCR engine
    if _tesseract_available():
        print("[ocr] Using Tesseract")
        ocr_texts = _ocr_with_tesseract(images)
    elif _easyocr_available():
        print("[ocr] Using EasyOCR")
        ocr_texts = _ocr_with_easyocr(images)
    else:
        if text_docs:
            print("[ocr] No OCR engine available — returning text-only pages")
            return text_docs
        raise ValueError(
            "PDF contains no extractable text. "
            "Install Tesseract (pytesseract) or EasyOCR to enable OCR support."
        )

    # Build Document objects from OCR output
    ocr_docs = []
    for page_num, text in enumerate(ocr_texts):
        text = text.strip()
        char_count = len(text)
        print(f"[ocr] Processing page {page_num + 1}... extracted {char_count} characters")

        if char_count < MIN_CHARS_PAGE:
            print(f"[ocr] Page {page_num + 1} still empty after OCR — skipping")
            continue

        ocr_docs.append(Document(
            page_content=text,
            metadata={"source": file_name, "page": page_num}
        ))

    print(f"[ocr] Total pages processed: {len(ocr_docs)}")

    # Merge: prefer OCR result for scanned pages, keep text for good pages
    page_map = {d.metadata["page"]: d for d in text_docs}
    for d in ocr_docs:
        page_map[d.metadata["page"]] = d  # OCR overwrites sparse text pages

    final_docs = [page_map[k] for k in sorted(page_map.keys())]

    if not final_docs:
        raise ValueError("Unable to extract text from PDF — both text extraction and OCR failed")

    return final_docs
