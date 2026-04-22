from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)

def split_docs(documents: list[Document]) -> list[Document]:
    """Split a list of Documents into chunks, preserving metadata."""
    return _splitter.split_documents(documents)
