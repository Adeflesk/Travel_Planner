"""
main.py - Entry point shim

This top-level module keeps imports working for existing callers by
exporting the `app` object from `app.main`.

Author: Travel Planner Team
"""

from app.main import app  # re-export FastAPI application


@app.get("/")
def root():
    return {"message": "Travel Planner API", "version": "1.0.0", "docs": "/docs"}
