import os
import warnings
import logging
import numpy as np
import joblib

warnings.filterwarnings("ignore")
logger = logging.getLogger("structuraml")

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

_models = None


def load_models():
    global _models
    if _models is not None:
        return _models
    sway_path = os.path.join(MODELS_DIR, "story_sway_gpr_model.joblib")
    drift_path = os.path.join(MODELS_DIR, "story_drift_gpr_model.joblib")
    column_path = os.path.join(MODELS_DIR, "column_overstress_gpr_model.pkl")
    logger.info("Loading models from %s", MODELS_DIR)
    logger.info("  sway: %s (exists=%s)", sway_path, os.path.exists(sway_path))
    logger.info("  drift: %s (exists=%s)", drift_path, os.path.exists(drift_path))
    logger.info("  column: %s (exists=%s)", column_path, os.path.exists(column_path))
    _models = {
        "sway": joblib.load(sway_path),
        "drift": joblib.load(drift_path),
        "column": joblib.load(column_path),
    }
    for name, m in _models.items():
        logger.info("  %s model type: %s", name, type(m).__name__)
        if hasattr(m, "steps"):
            logger.info("    Pipeline steps: %s", [s[0] for s in m.steps])
    return _models


def predict(params: dict) -> dict:
    models = load_models()

    fc = params["fc"]; fy = params["fy"]; z = params["z"]; R = params["R"]
    v = params["v"]; W = params["W"]; La = params["La"]; Lb = params["Lb"]
    n = params["n"]; H = params["H"]; Hgf = params["Hgf"]; A = params["A"]
    p = params["p"]; Ag = params["Ag"]

    sway_input = np.array([[n, H, Hgf, Lb, v, A, W, p, Ag]], dtype=float)
    drift_input = np.array([[fc, La, Lb, n, H, R, Hgf, z, Ag]], dtype=float)
    column_input = np.array([[fc, Lb, A, W, R, H, Hgf, Ag, p]], dtype=float)

    logger.info("--- Model input arrays ---")
    logger.info("  Sway  input: n=%s H=%s Hgf=%s Lb=%s v=%s A=%s W=%s p=%s Ag=%s",
                n, H, Hgf, Lb, v, A, W, p, Ag)
    logger.info("  Drift input: fc=%s La=%s Lb=%s n=%s H=%s R=%s Hgf=%s z=%s Ag=%s",
                fc, La, Lb, n, H, R, Hgf, z, Ag)
    logger.info("  Col   input: fc=%s Lb=%s A=%s W=%s R=%s H=%s Hgf=%s Ag=%s p=%s",
                fc, Lb, A, W, R, H, Hgf, Ag, p)

    max_story_sway = max(0.0, float(models["sway"].predict(sway_input)[0]))
    max_story_drift = max(0.0, float(models["drift"].predict(drift_input)[0]))
    column_fail_pct = max(0.0, min(100.0, float(models["column"].predict(column_input)[0])))

    logger.info("--- Raw predictions ---")
    logger.info("  max_story_sway=%.4f  max_story_drift=%.4f  column_fail_pct=%.4f",
                max_story_sway, max_story_drift, column_fail_pct)

    torsion = round(1 + abs(La - Lb) / (La + Lb) * 0.3, 4)

    base_shear_kN = round(z * (W * A * n * 1.5) / max(R, 0.5), 1)
    num_cols = max(1, int((La * Lb) / 20))
    total_capacity_kN = round((0.85 * fc * Ag / 1e6 + p / 100 * fy * Ag / 1e6) * num_cols, 0)
    total_gravity_kN = round((5.0 + W * 0.4) * A * n, 0)

    return {
        "column_fail_pct": round(column_fail_pct, 2),
        "max_story_drift": round(max_story_drift, 4),
        "max_story_sway": round(max_story_sway, 2),
        "torsion": torsion,
        "details": {
            "base_shear_kN": base_shear_kN,
            "num_cols": num_cols,
            "total_capacity_kN": total_capacity_kN,
            "total_gravity_kN": total_gravity_kN,
        },
    }


def _classify_ratio(ratio):
    if ratio > 1.0:
        return "Very High"
    elif ratio >= 0.80:
        return "Moderate"
    elif ratio >= 0.50:
        return "Low"
    return "Very Low"


def compute_limits(params: dict, results: dict) -> dict:
    Hgf = params["Hgf"]
    H = params["H"]
    logger.info("--- compute_limits ---")
    logger.info("  Hgf=%s H=%s", Hgf, H)
    if results:
        logger.info("  results: col_fail=%s drift=%s sway=%s torsion=%s",
                    results.get("column_fail_pct"), results.get("max_story_drift"),
                    results.get("max_story_sway"), results.get("torsion"))

    allowable_drift_mm = (0.002 * Hgf) * 1000
    allowable_sway_mm = (H * 1000) / 500

    limits = {
        "drift_mm": round(allowable_drift_mm, 2),
        "sway_mm": round(allowable_sway_mm, 2),
    }

    risks = {}

    if results:
        cp = results["column_fail_pct"]
        if cp > 1:
            col_label = "Very High"
        else:
            col_label = "Low"
        risks["column"] = {"label": col_label, "pct": round(min(100, cp * 5), 1)}

        drift_ratio = results["max_story_drift"] / allowable_drift_mm if allowable_drift_mm > 0 else 0
        drift_label = _classify_ratio(drift_ratio)
        risks["drift"] = {"label": drift_label, "pct": round(min(100, drift_ratio * 100), 1)}

        sway_ratio = results["max_story_sway"] / allowable_sway_mm if allowable_sway_mm > 0 else 0
        sway_label = _classify_ratio(sway_ratio)
        risks["sway"] = {"label": sway_label, "pct": round(min(100, sway_ratio * 100), 1)}

    safety = {}
    if results:
        safety["drift_pass"] = (results["max_story_drift"] / allowable_drift_mm) <= 1 if allowable_drift_mm > 0 else False
        safety["sway_pass"] = (results["max_story_sway"] / allowable_sway_mm) <= 1 if allowable_sway_mm > 0 else False
        safety["column_pass"] = results["column_fail_pct"] <= 1

    labels = [r["label"] for r in risks.values()]
    if "Very High" in labels:
        action = ["Structure Appears Risky", "Structural Assessment Required.", "error"]
    else:
        action = ["Structure Appears Adequate", "Routine Monitoring is Sufficient.", "success"]

    return {
        "limits": limits,
        "safety": safety,
        "risks": risks,
        "action": action,
    }
