PARAM_LABELS = {
    "fc": "Concrete fc (MPa)", "fy": "Steel fy (MPa)",
    "z": "Seismic Coeff z", "R": "Reduction R",
    "v": "Wind Speed v (m/s)", "W": "Live Load W (kN/m²)",
    "La": "Long Axis La (m)", "Lb": "Short Axis Lb (m)",
    "n": "No. of Story n", "H": "Total Height H (m)",
    "Hgf": "GF Height Hgf (m)", "A": "Floor Area A (m²)",
    "p": "Rebar Ratio p (%)", "Ag": "Gross Area Ag (mm²)",
}

PARAM_META = {
    "fc": {"min": 11.0, "max": 35.0, "step": 0.5},
    "fy": {"min": 250, "max": 550, "step": 5.0},
    "z": {"min": 0.07, "max": 0.40, "step": 0.01},
    "R": {"min": 3.5, "max": 12.0, "step": 0.5},
    "v": {"min": 31.0, "max": 80.0, "step": 1.0},
    "W": {"min": 1.0, "max": 6.0, "step": 0.1},
    "La": {"min": 4.0, "max": 115.0, "step": 0.5},
    "Lb": {"min": 3.0, "max": 70.0, "step": 0.5},
    "n": {"min": 1, "max": 18, "step": 1},
    "H": {"min": 3.0, "max": 65.0, "step": 0.5},
    "Hgf": {"min": 2.0, "max": 6.6, "step": 0.1},
    "A": {"min": 15.0, "max": 8000.0, "step": 1.0},
    "p": {"min": 0.05, "max": 5.0, "step": 0.1},
    "Ag": {"min": 100000, "max": 60000000, "step": 10000.0},
}

DEFAULT_PARAMS = {
    "fc": 24.0, "fy": 413.0, "z": 0.15, "R": 8.0,
    "v": 58.0, "W": 2.0, "La": 22.0, "Lb": 14.5,
    "n": 7, "H": 26.0, "Hgf": 3.2, "A": 220.0,
    "p": 0.8, "Ag": 4000000.0,
}

FEATURE_NAMES = {
    "sway": [
        "No of Story, n", "Structure Height, H (m)", "GF Story Height, Hgf (m)",
        "Dimension of Short Axis, Lb (m)", "Basic Wind Speed, v (m/s)",
        "Typical Floor Area, A (sqm)", "Typical Floor Live Load, W (KN/sqm)",
        "Average Column Rebar Percentage, p (%)",
        "Total Column Gross Section Area, Ag (sqmm)",
    ],
    "drift": [
        "Compressive Strength of Concrete, fc (Mpa)",
        "Dimension of Long Axis, La (m)", "Dimension of Short Axis, Lb (m)",
        "No of Story, n", "Structure Height, H (m)", "Response Reduction Factor, R",
        "GF Story Height, Hgf (m)", "Seismic Zone Coefficient, z",
        "Total Column Gross Section Area, Ag (sqmm)",
    ],
    "column": [
        "Compressive Strength of Concrete, fc (Mpa)",
        "Dimension of Short Axis, Lb (m)", "Typical Floor Area, A (sqm)",
        "Typical Floor Live Load, W (KN/sqm)", "Response Reduction Factor, R",
        "Structure Height, H (m)", "GF Story Height, Hgf (m)",
        "Total Column Gross Section Area, Ag (sqmm)",
        "Average Column Rebar Percentage, p (%)",
    ],
}
