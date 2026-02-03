from fastapi import FastAPI, UploadFile, File, Form, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db
from .middleware.service_auth import ServiceAuthMiddleware
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

app = FastAPI(title="RAG Microservice")

app.add_middleware(ServiceAuthMiddleware)

embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")

def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    chunks = splitter.split_text(text)
    return chunks

def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text chunks.
    Returns a list of vectors (floats).
    """
    return embeddings_model.embed_documents(chunks)

class RetrieveRequest(BaseModel):
    query: str

@app.post("/process-file")
async def process_file(file: UploadFile = File(None), link: str = Form(None)):
    if file:
        content = await file.read()
        text = content.decode("utf-8")
        
        chunks = chunk_text(text)
        vectors = embed_chunks(chunks)

        return {
            "status": "received file",
            "filename": file.filename,
            "chunks_count": len(chunks),
            "chunks_preview": chunks[:3],
            "vectors_preview": vectors[:3]  # optional, just for testing
        }

    elif link:
        return {"status": "received link", "link": link}
    else:
        return {"status": "no file or link provided"}

@app.post("/retrieve-chunks")
async def retrieve_chunks(request: RetrieveRequest):
    return {"query": request.query, "retrieved": ["This is a dummy chunk"]}

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT NOW()")).scalar()
        return {"status": "ok", "server_time": str(result)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
