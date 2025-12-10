"""
ASGI app for Vercel deployment
This file is required by Vercel to know how to run the FastAPI application
"""
from app.main import app

# Export the app for Vercel
__all__ = ['app']
