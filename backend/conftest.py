"""Pytest configuration for resolving project imports.

This ensures the repository root is on ``sys.path`` so imports using the
``backend`` package name succeed regardless of where pytest is invoked from.
"""

from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PROJECT_ROOT.parent

# Prepend the repository root to ``sys.path`` so ``import backend`` works even
# when tests are executed from inside the ``backend`` directory.
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
