import os
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SERVICE_KEY = os.environ.get("RAG_SERVICE_KEY")

class ServiceAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/docs", "/openapi.json", "/health"]:
            return await call_next(request)

        key = request.headers.get("x-service-key")

        if not key or key != SERVICE_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized"},
            )

        return await call_next(request)