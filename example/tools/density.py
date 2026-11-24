"""Fix item 3: object density check (measures how "thin" a frame is). Usage: python density.py [start end step] [scene entry]
For each time, lists: the number of standing objects in the frame n, the number inside the sharp band sharp, and the total area they cover area (overlaps are not de-duplicated);
frames with n below 30 (design rule C4) are marked "thin". Finally averages are given per 4 s segment, for easy comparison with the previous version."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # let scripts under tools/ find the popup package
from popup.pipeline.frames import PRESETS
from popup.pipeline.web_capture import capture_session

t0, t1, dt = (float(a) for a in sys.argv[1:4]) if len(sys.argv) >= 4 else (0.0, 48.0, 0.5)
scene = sys.argv[4] if len(sys.argv) >= 5 else "scenes/leonida/index.js"
times = [round(t0 + i * dt, 3) for i in range(int((t1 - t0) / dt) + 1)]
with capture_session(scene, ["styles/leonida.js:Sunset"], PRESETS["preview"]) as cap:
    rows = cap.page.evaluate("(ts) => window.leonidaDensity(ts, 0.75)", times)
    cap.check_errors()
for r in rows:
    flag = "  thin" if r["n"] < 30 else ""
    print(f"t={r['t']:6.2f}  n={r['n']:4d}  sharp={r['sharp']:4d}  area={r['area']:6.3f}{flag}")
print("--- average per 4 s ---")
for s in range(int(t0 // 4) * 4, int(t1) + 1, 4):
    seg = [r for r in rows if s <= r["t"] < s + 4]
    if seg:
        avg = lambda k: sum(r[k] for r in seg) / len(seg)
        print(f"{s:4d}-{s + 4:<4d} n={avg('n'):6.1f}  sharp={avg('sharp'):6.1f}  area={avg('area'):6.3f}")
