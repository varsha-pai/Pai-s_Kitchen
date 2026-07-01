import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file relative to this file
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database.connection import engine, Base
from .routes import auth, pantry, recipes

# Automatically create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Pai's Kitchen API",
    description="Backend API for Pai's Kitchen - AI Pantry-to-Recipe engine",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the Vite host (e.g., http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(pantry.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")

# Serve React static frontend files in production
base_dir = Path(__file__).resolve().parents[1]  # /app (docker) or backend (local)
frontend_dist_path = base_dir / "frontend" / "dist"

if not frontend_dist_path.exists():
    # Try local dev root fallback (one level higher)
    frontend_dist_path = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if frontend_dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist_path / "assets")), name="static")

    @app.get("/{path_name:path}")
    async def serve_spa(path_name: str):
        # Ignore API routes (allow FastAPI to raise 404 naturally)
        if path_name.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Check if the requested file exists in dist (like favicon.ico)
        file_path = frontend_dist_path / path_name
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
            
        # Fallback to SPA index.html
        return FileResponse(str(frontend_dist_path / "index.html"))
else:
    @app.get("/")
    def home():
        return {
            "message": "Welcome to Pai's Kitchen API!",
            "status": "online",
            "docs": "/docs",
            "info": "Frontend build files not found. Run npm run build in frontend directory."
        }
