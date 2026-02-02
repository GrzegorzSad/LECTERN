from fastapi import FastAPI, UploadFile, File, Form, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db
from .middleware.service_auth import ServiceAuthMiddleware

app = FastAPI(title="RAG Microservice")

app.add_middleware(ServiceAuthMiddleware)

class RetrieveRequest(BaseModel):
    query: str

@app.post("/process-file")
async def process_file(file: UploadFile = File(None), link: str = Form(None)):
    if file:
        return {"status": "received file", "filename": file.filename}
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