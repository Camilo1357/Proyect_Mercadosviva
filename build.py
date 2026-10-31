"""Prepare Vercel CDN assets from the canonical frontend sources."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
target = root / "public" / "src"
shutil.copytree(root / "frontend" / "src", target, dirs_exist_ok=True)
print("Frontend assets prepared in public/src")
