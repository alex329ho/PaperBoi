"""Backend wrapper to execute shared integration scenarios."""
from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from integration.test_scenarios import (  # noqa: E402,F401
    test_news_fetching_filtering_and_error_recovery,
    test_offline_to_online_transition_and_data_consistency,
    test_user_registration_and_first_use_flow,
)

__all__ = [
    "test_user_registration_and_first_use_flow",
    "test_news_fetching_filtering_and_error_recovery",
    "test_offline_to_online_transition_and_data_consistency",
]
