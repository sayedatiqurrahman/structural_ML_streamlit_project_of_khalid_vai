import os
import json
import logging
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from utils import predict, compute_limits, DEFAULT_PARAMS, PARAM_LABELS

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("structuraml")

app = FastAPI(title="StructuralML")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
EXPECTED_KEYS = ["fc", "fy", "z", "R", "v", "W", "La", "Lb", "n", "H", "Hgf", "A", "p", "Ag"]


@app.get("/", response_class=HTMLResponse)
async def root():
    with open(os.path.join(FRONTEND_DIR, "index.html"), encoding="utf-8") as f:
        html = f.read()
    with open(os.path.join(FRONTEND_DIR, "style.css"), encoding="utf-8") as f:
        css = f.read()
    with open(os.path.join(FRONTEND_DIR, "script.js"), encoding="utf-8") as f:
        js = f.read()

    results = predict(DEFAULT_PARAMS)
    limits = compute_limits(DEFAULT_PARAMS, results)

    initial_data = {
        "params": dict(DEFAULT_PARAMS),
        "results": results,
        "limits": limits,
    }

    html = html.replace("/*__CSS__*/", css)
    html = html.replace("/*__JS__*/", js)
    html = html.replace("<!--__INITIAL_DATA__-->", json.dumps(initial_data))
    return html


@app.post("/api/predict")
async def api_predict(data: dict):
    try:
        logger.info("=== /api/predict called ===")
        logger.info("Raw request data: %s", json.dumps(data, default=str) if data else "EMPTY")

        missing = [k for k in EXPECTED_KEYS if k not in data]
        if missing:
            logger.warning("Missing keys: %s — using defaults for those", missing)
        unknown = [k for k in data if k not in EXPECTED_KEYS]
        if unknown:
            logger.warning("Unknown keys received: %s", unknown)

        params = {}
        for k in EXPECTED_KEYS:
            raw = data.get(k, DEFAULT_PARAMS[k])
            try:
                params[k] = float(raw)
            except (TypeError, ValueError):
                logger.warning("Cannot convert %s=%r to float, using default %s", k, raw, DEFAULT_PARAMS[k])
                params[k] = float(DEFAULT_PARAMS[k])

        logger.info("Parsed params: %s", json.dumps(params, default=str))

        results = predict(params)
        logger.info("Prediction results: %s", json.dumps(results, default=str))
        return {"status": "ok", "params": params, "results": results}
    except Exception as e:
        logger.error("Prediction error: %s", str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@app.post("/api/calculate")
async def api_calculate(data: dict):
    try:
        params = data.get("params", {})
        results = data.get("results", {})
        if not params or not results:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Run prediction first"})
        limits = compute_limits(params, results)
        return {"status": "ok", "limits": limits}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8501, reload=True)
