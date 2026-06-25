# import os
# import json
# from fastapi import FastAPI
# from fastapi.responses import HTMLResponse, JSONResponse
# from fastapi.middleware.cors import CORSMiddleware

# from utils import predict, compute_limits, DEFAULT_PARAMS

# app = FastAPI(title="StructuralML")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")


# @app.get("/", response_class=HTMLResponse)
# async def root():
#     with open(os.path.join(FRONTEND_DIR, "index.html"), encoding="utf-8") as f:
#         html = f.read()
#     with open(os.path.join(FRONTEND_DIR, "style.css"), encoding="utf-8") as f:
#         css = f.read()
#     with open(os.path.join(FRONTEND_DIR, "script.js"), encoding="utf-8") as f:
#         js = f.read()
#     html = html.replace("/*__CSS__*/", css)
#     html = html.replace("/*__JS__*/", js)
#     html = html.replace("<!--__INITIAL_DATA__-->", json.dumps({"params": dict(DEFAULT_PARAMS), "results": None, "limits": None}))
#     return html


# @app.post("/api/predict")
# async def api_predict(data: dict):
#     try:
#         params = {}
#         for k in ["fc", "fy", "z", "R", "v", "W", "La", "Lb", "n", "H", "Hgf", "A", "p", "Ag"]:
#             params[k] = float(data.get(k, DEFAULT_PARAMS[k]))
#         results = predict(params)
#         return {"status": "ok", "params": params, "results": results}
#     except Exception as e:
#         return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


# @app.post("/api/calculate")
# async def api_calculate(data: dict):
#     try:
#         params = data.get("params", {})
#         results = data.get("results", {})
#         if not params or not results:
#             return JSONResponse(status_code=400, content={"status": "error", "message": "Run prediction first"})
#         limits = compute_limits(params, results)
#         return {"status": "ok", "limits": limits}
#     except Exception as e:
#         return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8501, reload=True)
