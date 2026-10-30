from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "rotor-engine", "shots_sales")
DST = os.path.join(HERE, "examples", "13b", "screenshots")
os.makedirs(DST, exist_ok=True)

for src, name in [
    ("s-hero.png", "01-hero.jpg"),
    ("s-cut.png", "02-cut.jpg"),
    ("s-explode.png", "03-explode.jpg"),
    ("s-fault.png", "04-fault.jpg"),
]:
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    im = im.resize((1280, 720), Image.LANCZOS)
    im.save(os.path.join(DST, name), quality=86, optimize=True)

print("ok", os.listdir(DST))
