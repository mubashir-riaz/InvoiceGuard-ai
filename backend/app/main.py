# FastAPI application factory.
# Creates the app, includes routers, and sets up CORS (minimal).
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

# Allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}