"""Debug: print the pop-up / fall times of every object in the leonida scene. Usage: python pop_times.py [name fragment ...]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # let scripts under tools/ find the popup package
from popup.pipeline.frames import PRESETS
from popup.pipeline.web_capture import capture_session

pats = sys.argv[1:] or [""]
with capture_session("scenes/leonida/index.js", ["styles/leonida.js:Sunset"], PRESETS["preview"]) as cap:
    for pat in pats:
        for name, t0, down in cap.page.evaluate("p => window.leonidaTimes(p)", pat):
            print(f"{t0:6.2f}  {'' if down is None else f'{down:6.2f}':>6}  {name}")
    cap.check_errors()
