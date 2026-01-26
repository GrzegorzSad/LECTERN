from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Query(BaseModel):
    prompt: str

@app.post("/query")
def query_rag(q: Query):
    # placeholder RAG logic
    return {"answer": f"Response to: {q.prompt}"}