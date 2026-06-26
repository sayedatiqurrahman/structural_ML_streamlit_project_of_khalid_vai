#!/bin/bash
# Sync source code to Hugging Face Space (preserves models on HF)
# Usage: bash sync-hf.sh


set -e

HF_TOKEN="${HF_HUGGINGFACE_TOKEN:-}"
if [ -z "$HF_TOKEN" ]; then
    echo "Error: HF_HUGGINGFACE_TOKEN env var not set"
    echo "Create a .env file with: HF_HUGGINGFACE_TOKEN=hf_xxx"
    exit 1
fi

HF_URL="https://dev-atiqur-rahman:${HF_TOKEN}@huggingface.co/spaces/dev-atiqur-rahman/structural-ml"
TEMP_DIR="hf-temp"

echo "Cloning HF Space..."
git clone --depth 1 "$HF_URL" "$TEMP_DIR"

cd "$TEMP_DIR"
git config user.email "user@example.com"
git config user.name "user"

echo "Copying source files..."
rm -rf frontend/ utils/
cp -r ../frontend ../utils ../main.py ../requirements.txt ../Dockerfile .

git add .
if git diff --quiet && git diff --staged --quiet; then
    echo "No changes to sync"
else
    git commit -m "Sync source code"
    git push
    echo "Done! HF Space updated."
fi

cd ..
rm -rf "$TEMP_DIR"
