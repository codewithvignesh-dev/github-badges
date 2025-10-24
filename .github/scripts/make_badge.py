import os, requests

TOKEN = os.environ["GITHUB_TOKEN"]
REPO = os.environ["TARGET_REPO"]
OUT = os.environ.get("OUTPUT_FILE", "views.svg")

r = requests.get(f"https://api.github.com/repos/{REPO}/traffic/views",
                 headers={"Authorization": f"Bearer {TOKEN}"})
data = r.json()
count, uniques = data.get("count", 0), data.get("uniques", 0)

# Simple SVG badge
svg = f'''
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20">
  <rect width="150" height="20" fill="#555"/>
  <rect x="70" width="80" height="20" fill="#4c1"/>
  <text x="5" y="14" fill="#fff" font-size="11" font-family="Verdana">views</text>
  <text x="75" y="14" fill="#fff" font-size="11" font-family="Verdana">{count}</text>
</svg>
'''

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    f.write(svg)
print(f"✅ Badge updated for {REPO}: {count} views")
