"""Application entrypoint shim for running PaperBoi with `uvicorn main:app`."""
from backend.main import app  # pragma: no cover

__all__ = ["app"]
