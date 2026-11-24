"""Single-switch comparison table: stitch the stills of several versions at the same set of times into one table (rows = times, columns = versions), with a header row.
Usage: python tools/ab_table.py out.png cell_width "name1=dir1" "name2=dir2" ... (each dir holds the tXXX.XX.png files produced by web_stills)"""
import sys, glob, os
import skia

out, cw = sys.argv[1], int(sys.argv[2])
cols = [a.split("=", 1) for a in sys.argv[3:]]
files = [sorted(glob.glob(os.path.join(d, "t*.png"))) for _, d in cols]
rows = len(files[0])
first = skia.Image.open(files[0][0])
ch = round(cw * first.height() / first.width())
head, lab = 70, 120
W, H = lab + cw * len(cols), head + ch * rows
surf = skia.Surface(W, H)
c = surf.getCanvas()
c.clear(skia.Color(24, 20, 36))
font = skia.Font(skia.Typeface("Microsoft YaHei"), 26)
small = skia.Font(skia.Typeface("Microsoft YaHei"), 24)
white = skia.Paint(Color=skia.Color(240, 236, 250), AntiAlias=True)
for j, (name, _) in enumerate(cols):
    c.drawString(name, lab + j * cw + 10, 46, font, white)
for i in range(rows):
    t = os.path.basename(files[0][i])[1:-4].lstrip("0") or "0"
    c.drawString(f"{float(t):g} s", 14, head + i * ch + ch / 2, small, white)
    for j in range(len(cols)):
        img = skia.Image.open(files[j][i])
        c.drawImageRect(img, skia.Rect.MakeXYWH(lab + j * cw, head + i * ch, cw, ch), skia.SamplingOptions(skia.FilterMode.kLinear))
surf.makeImageSnapshot().save(out, skia.kPNG)
print(out, W, H)
