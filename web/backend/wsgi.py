"""
Vercel production configuration for FastAPI
"""
import os
from app.main import app

# Ensure WSGI compatibility for serverless
application = app

# Export for Vercel
__all__ = ['application', 'app']
