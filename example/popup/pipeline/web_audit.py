"""Run a scene's clipping audit (window.leonidaAudit) over a range of times and print overlapping pairs."""

from argparse import ArgumentParser
import json

from .frames import PRESETS
from .web_capture import capture_session


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--scene", required=True)
    parser.add_argument("--style", required=True)
    parser.add_argument("--t0", type=float, default=0)
    parser.add_argument("--t1", type=float, default=10)
    parser.add_argument("--step", type=float, default=0.1)
    parser.add_argument("--extra", default="", help="comma-separated extra instants, e.g. 200")
    parser.add_argument("--gpu", default="")
    args = parser.parse_args()
    n = int(round((args.t1 - args.t0) / args.step))
    times = [round(args.t0 + i * args.step, 4) for i in range(n + 1)]
    times += [float(v) for v in args.extra.split(",") if v]
    with capture_session(args.scene, [args.style], PRESETS["preview"], args.gpu) as capture:
        hits = capture.page.evaluate("times => window.leonidaAudit(times)", times)
        capture.check_errors()
    for h in sorted(hits, key=lambda h: h["t"]):
        print(f"t={h['t']:6.2f}  {h['pair']:60s} overlap={h['overlap']} at={h['at']}")
    print(f"{len(hits)} overlapping pairs over {len(times)} instants")
    return 1 if hits else 0


if __name__ == "__main__":
    raise SystemExit(main())
