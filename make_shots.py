from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "rotor-engine", "shots_sales")
DST = os.path.join(HERE, "examples", "13b", "screenshots")
os.makedirs(DST, exist_ok=True)

for src, name in [
    ("n-hero.png", "01-hero.jpg"),
    ("n-tour.png", "02-tour.jpg"),
    ("n-role.png", "03-role.jpg"),
    ("n-fault.png", "04-fault.jpg"),
]:
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    im = im.resize((1280, 720), Image.LANCZOS)
    im.save(os.path.join(DST, name), quality=86, optimize=True)

# 删掉旧图
for f in os.listdir(DST):
    if f.endswith(".jpg") and f not in {"01-hero.jpg", "02-tour.jpg", "03-role.jpg", "04-fault.jpg"}:
        os.remove(os.path.join(DST, f))
print(sorted(os.listdir(DST)))
