---
title: Structural Response Prediction Using ML
emoji: 🏗️
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# 🏗️ Structural Response Prediction Using Machine Learning

An **M.Sc. thesis research project** that leverages **Gaussian Process Regression (GPR)** to predict critical structural performance metrics of Reinforced Concrete (RC) buildings. This web-based tool enables civil and structural engineers to input building parameters and instantly receive ML-driven predictions for column overstress, story drift, and story sway, along with code-based risk assessments.

---

## 🎯 Purpose

This project is developed as part of an **M.Sc. research-based thesis** focused on applying machine learning to predict structural behavior of RC buildings. The models are trained on a dataset of **over 400 RC building records from Bangladesh**. The application serves as a proof-of-concept for ML-assisted structural engineering assessment.

---

## 📊 ML Models

Three **Gaussian Process Regression (GPR)** models are employed, each using a Matern 1.5 kernel with PowerTransformer (Yeo-Johnson) and StandardScaler within a scikit-learn Pipeline:

| Model | Target | Features | R² Score |
|---|---|---|---|
| **Column Overstress** | Percentage of overstressed columns (%) | Concrete strength, short axis, floor area, live load, reduction factor, height, GF height, gross area, rebar % | **0.930** |
| **Story Drift** | Maximum inter-story drift (mm) | Concrete strength, long axis, short axis, stories, height, reduction factor, GF height, seismic coefficient, gross area | **0.926** |
| **Story Sway** | Maximum lateral sway at top (mm) | Stories, height, GF height, short axis, wind speed, floor area, live load, rebar %, gross area | **0.958** |

---

## 🧱 Input Parameters (14 Building Attributes)

| Parameter | Description | Default | Range |
|---|---|---|---|
| `fc` | Compressive Strength of Concrete (MPa) | 24.0 | 11.0 – 35.0 |
| `fy` | Yield Strength of Steel (MPa) | 413.0 | 250 – 550 |
| `z` | Seismic Zone Coefficient | 0.15 | 0.07 – 0.40 |
| `R` | Response Reduction Factor | 8.0 | 3.5 – 12.0 |
| `v` | Basic Wind Speed (m/s) | 58.0 | 31.0 – 80.0 |
| `W` | Typical Floor Live Load (kN/m²) | 2.0 | 1.0 – 6.0 |
| `La` | Dimension of Long Axis (m) | 22.0 | 4.0 – 115.0 |
| `Lb` | Dimension of Short Axis (m) | 14.5 | 3.0 – 70.0 |
| `n` | Number of Stories | 7 | 1 – 18 |
| `H` | Structure Height (m) | 26.0 | 3.0 – 65.0 |
| `Hgf` | Ground Floor Story Height (m) | 3.2 | 2.0 – 6.6 |
| `A` | Typical Floor Area (m²) | 220.0 | 15.0 – 8000.0 |
| `p` | Average Column Rebar Percentage (%) | 0.8 | 0.05 – 5.0 |
| `Ag` | Total Column Gross Section Area (mm²) | 4,000,000 | 100,000 – 60,000,000 |

---

## ⚙️ How It Works

1. **Enter** building parameters into the form
2. **Predict** — ML models compute column overstress, story drift, and story sway
3. **Assess** — Values are compared against code-based allowable limits
4. **Visualize** — Risk levels are displayed via doughnut charts with color-coded severity
5. **Review** — Full dashboard with structural details, history with localStorage, and export

### Risk Classification

| Ratio (Actual / Allowable) | Risk Level |
|---|---|
| > 1.00 | 🔴 Very High |
| 0.80 – 0.99 | 🟠 Moderate |
| 0.50 – 0.79 | 🟢 Low |
| < 0.50 | 🔵 Very Low |

If any metric falls into **Very High**, the system flags: *"Structure Appears Risky — Structural Assessment Required."*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **ML / Data Science** | scikit-learn (GaussianProcessRegressor), joblib, NumPy, Pandas |
| **Frontend** | Vanilla HTML/CSS/JS, Tailwind CSS (CDN), Chart.js |
| **Server** | Docker, Uvicorn |
| **Deployment** | Hugging Face Spaces, GitHub Actions, Render |

---

## 🚀 Run Locally

### Prerequisites
- Python 3.12+
- pip

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd ML_BUILDING_BENCHMARKING

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8501 --reload
```

Open **http://localhost:8501** in your browser.

### Using Docker

```bash
docker build -t structural-ml .
docker run -p 7860:7860 structural-ml
```

Open **http://localhost:7860**.

---

## 📁 Project Structure

```
├── main.py                         # FastAPI application entry point
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Container deployment
├── README.md                       # This file
├── .github/workflows/hf-sync.yml   # GitHub → HF Spaces auto-sync
│
├── frontend/
│   ├── index.html                  # Single-page application
│   ├── style.css                   # Custom styles
│   └── script.js                   # Frontend logic (charts, history, API)
│
├── utils/
│   ├── __init__.py                 # Public API exports
│   ├── pipeline.py                 # ML pipeline + risk assessment
│   └── features.py                 # Parameter definitions & metadata
│
├── models/
│   ├── column_overstress_gpr_model.pkl
│   ├── story_drift_gpr_model.joblib
│   └── story_sway_gpr_model.joblib
│
└── data/
    └── StructuralDataSet20.csv     # Training dataset (411 RC building records)
```

---

## 📬 Contact

For questions or collaboration, reach out to: **khaled.ce18@gmail.com**

---

## ⚠️ Disclaimer

This tool is a **research prototype** developed for academic purposes. The ML models are trained exclusively on data from Bangladesh. Results should be verified by a qualified structural engineer before any real-world application. Accuracy may vary for building configurations or regions outside the training domain.

---

## 📄 License

This project is a personal thesis work. See the [LICENSE](LICENSE) file for details.
