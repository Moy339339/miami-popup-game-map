"""Debug: list where sign lettering sticks out past its backing board / touches the edge (scenes/leonida/text_audit.js). Usage: python text_audit.py
left / right = how much space remains between each end of the text and the backing board edge (unit: font size); negative = sticks out past the board."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # let scripts under tools/ find the popup package
from popup.pipeline.frames import PRESETS
from popup.pipeline.web_capture import capture_session

with capture_session("scenes/leonida/text_audit.js", ["styles/leonida.js:Sunset"], PRESETS["preview"]) as cap:
    rows = cap.page.evaluate("() => window.leonidaTextAudit()")
    cap.check_errors()
seen = set()
for r in rows:
    key = (r["text"], r["kind"], r.get("left"), r.get("right"))
    if key in seen:
        continue
    seen.add(key)
    ext = f"over={r['over']}" if "over" in r else f"left={r['left']:+.2f} right={r['right']:+.2f}"
    print(f"{r['kind']:4}  {ext:24} px={r['px']:5}  canvas={r['canvas']}  {r['text'][:40]!r}  {r['font']}")
