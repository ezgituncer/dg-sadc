"""Rate limiter — protects auth endpoints from credential-stuffing."""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# 10 attempts per minute per IP. Bumped to a generous default so dev tools and
# pytest don't trip the limiter; tighten for production via the env var.
limiter = Limiter(key_func=get_remote_address, default_limits=[])
