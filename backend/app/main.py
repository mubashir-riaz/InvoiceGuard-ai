# FastAPI application factory – includes all API routers.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, clients, contracts, invoices, discrepancies
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(clients.router)
app.include_router(contracts.router)
app.include_router(invoices.router)
app.include_router(discrepancies.router)   


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}