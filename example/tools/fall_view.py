"""Debug: find things that are still in the frame while they "tip toward the camera and lie flat, showing their backs". Usage: python fall_view.py [start end step] [min share]
Listed by share of the frame, largest first: name@y, maximum share, the moment of that maximum, the time it falls, the first / last times it is in the frame, and its vertical extent in the frame (-1 bottom ... 1 top)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # let scripts under tools/ find the popup package
from popup.pipeline.frames import PRESETS
from popup.pipeline.web_capture import capture_session

t0, t1, dt = (float(a) for a in sys.argv[1:4]) if len(sys.argv) >= 4 else (0.0, 48.0, 0.1)
minfrac = float(sys.argv[4]) if len(sys.argv) >= 5 else 0.004
times = [round(t0 + i * dt, 3) for i in range(int((t1 - t0) / dt) + 1)]
with capture_session("scenes/leonida/index.js", ["styles/leonida.js:Sunset"], PRESETS["preview"]) as cap:
    rows = cap.page.evaluate("([ts, m]) => window.leonidaFallView(ts, 0.75, m)", [times, minfrac])
    cap.check_errors()
for r in rows:
    print(f"{r['frac']:6.3f}  t={r['t']:6.2f}  down={r['down']:6.2f}  in {r['first']:6.2f}-{r.get('last', r['first']):6.2f}"
          f"  y[{r['bottom']:+.2f},{r['top']:+.2f}]{' corner behind camera' if r['behind'] else ''}  {r['name']}")
