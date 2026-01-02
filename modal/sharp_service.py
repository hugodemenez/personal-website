"""
Modal SHARP worker (stub)

This file documents the intended flow for running Apple ML SHARP on a GPU
and writing the resulting .ply + preview assets to object storage.
Wire this to Modal in a follow-up iteration.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class SharpJobRequest:
    slug: str
    image_url: str
    image_hash: str


@dataclass
class SharpJobResult:
    status: str
    ply_url: Optional[str] = None
    preview_image_url: Optional[str] = None
    error: Optional[str] = None


def run_sharp_job(request: SharpJobRequest) -> SharpJobResult:
    """
    Placeholder implementation.

    Real flow:
    - download image_url
    - run SHARP inference
    - upload .ply + preview to storage
    - return public URLs
    """
    return SharpJobResult(
        status="pending",
        error="Modal worker not yet implemented",
    )
