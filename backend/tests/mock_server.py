"""Expose the mock server application for backend test runners."""
from __future__ import annotations

from integration.mock_server import app as mock_app, STATE as mock_state  # re-export for convenience

__all__ = ["mock_app", "mock_state"]
