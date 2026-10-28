#!/usr/bin/env python3
"""Stamp every page's css/js links with a fresh ?v=<time>, so browsers and GitHub Pages never serve an old copy.
Run it before every push to the public preview:  python3 tools/stamp_version.py
"""
import re
import time
from pathlib import Path

root = Path(__file__).resolve().parent.parent
v = time.strftime("%Y%m%d%H%M%S")
for page in sorted(root.glob("*.html")):
    s = page.read_text()
    new = re.sub(r'((?:href|src)="(?:css|js)/[A-Za-z0-9_.-]+\.(?:css|js))(?:\?v=\w+)?"', r'\1?v=' + v + '"', s)
    if new != s:
        page.write_text(new)
        print("stamped", page.name)
print("version", v)
