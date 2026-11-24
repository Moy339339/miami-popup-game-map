"""Stitch the t*.png files in a directory, sorted by file name, into a contact sheet: python sheet.py dir out.png [columns] [cell width]"""
import sys, glob, subprocess, os
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
w = int(sys.argv[4]) if len(sys.argv) > 4 else 270
files = sorted(glob.glob(os.path.join(d, "t*.png")))
rows = (len(files) + cols - 1) // cols
args = []
for f in files: args += ["-i", f]
fc = "".join(f"[{i}]scale={w}:-1[s{i}];" for i in range(len(files)))
blank = len(files) % cols
ins = "".join(f"[s{i}]" for i in range(len(files)))
# xstack layout
lay = "|".join(f"{(i % cols) * w}_{(i // cols)}*h0" for i in range(len(files)))
lay = "|".join(f"{(i % cols) * w}_" + ("0" if i // cols == 0 else "+".join(["h0"] * (i // cols))) for i in range(len(files)))
fc += f"{ins}xstack=inputs={len(files)}:layout={lay}:fill=black"
subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", fc, out], check=True)
print(out)
