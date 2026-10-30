import os, subprocess, io, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "dist")
os.makedirs(OUT, exist_ok=True)

bundle = os.path.join(OUT, "app.js")
subprocess.run([
    "npx", "esbuild", os.path.join(SRC, "app.js"),
    "--bundle", "--format=iife", "--target=es2020", "--minify",
    "--outfile=" + bundle
], check=True, shell=True)

js = io.open(bundle, encoding="utf-8").read()
css = io.open(os.path.join(SRC, "style.css"), encoding="utf-8").read()
html = io.open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
html = html.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)

spec = io.open(os.path.join(SRC, "spec.js"), encoding="utf-8").read()
m = re.search(r'fileName:\s*"([^"]+)"', spec)
name = (m.group(1) if m else "马自达13B转子发动机") + ".html"

target = os.path.join(HERE, name)
io.open(target, "w", encoding="utf-8", newline="\n").write(html)
print("built", target, round(os.path.getsize(target) / 1024), "KB")
