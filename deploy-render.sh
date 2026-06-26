# Deploy to Render — just push to GitHub, Render auto-deploys
# 1. Go to https://render.com → New Web Service → connect this GitHub repo
# 2. Start command: uvicorn main:app --host 0.0.0.0 --port 10000
# 3. Done — Render pulls from GitHub automatically on every push

git push origin main
