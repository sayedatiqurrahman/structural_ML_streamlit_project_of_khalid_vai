var NAV_ITEMS = [
    {key:"parameters", icon:"tune", label:"Parameters"},
    {key:"dashboard", icon:"dashboard", label:"Dashboard"},
    {key:"about", icon:"info", label:"About"},
];

var RC = {"Very High": "#EF4444", "Moderate": "#F97316", "Low": "#22C55E", "Very Low": "#3B82F6"};
var RC_TAILWIND = {"Very High": "text-red-600", "Moderate": "text-orange-500", "Low": "text-green-600", "Very Low": "text-blue-600"};
var RC_BG = {"Very High":"bg-red-50 text-red-600","Moderate":"bg-orange-50 text-orange-600","Low":"bg-green-50 text-green-600","Very Low":"bg-blue-50 text-blue-600"};

var PARAM_INPUTS = [
    {key:"fc", suffix:" MPa"}, {key:"fy", suffix:" MPa"}, {key:"z", suffix:""},
    {key:"R", suffix:""}, {key:"v", suffix:" m/s"}, {key:"W", suffix:" kN/m\u00b2"},
    {key:"La", suffix:""}, {key:"Lb", suffix:""}, {key:"n", suffix:""},
    {key:"H", suffix:""}, {key:"Hgf", suffix:""}, {key:"A", suffix:""},
    {key:"p", suffix:""}, {key:"Ag", suffix:" sqmm"},
];

var chartInstances = {};
var state_params = {};
var state_results = null;
var state_limits = null;
var state_page = "parameters";

function parseNumber(s) {
    var m = String(s).match(/[-+]?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : 0;
}

function fmtParam(key, val) {
    var m = {"fc":val.toFixed(0)+" MPa","fy":val.toFixed(0)+" MPa","z":val.toFixed(2),
             "R":val.toFixed(1),"v":val.toFixed(0)+" m/s","W":val.toFixed(1)+" kN/m\u00b2",
             "La":val.toFixed(1),"Lb":val.toFixed(1),"n":val.toFixed(0),
             "H":val.toFixed(1),"Hgf":val.toFixed(1),"A":val.toFixed(0),
             "p":val.toFixed(1),"Ag":Number(val).toLocaleString()+" sqmm"};
    return m[key] || String(val);
}

function renderSidebar(currentPage) {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var html = '';
    NAV_ITEMS.forEach(function(item) {
        var active = item.key === currentPage;
        var cls = active
            ? 'flex items-center gap-3 bg-secondary-container text-on-secondary-container rounded-lg px-3 py-2 mx-4 cursor-pointer transition-transform active:scale-95 font-label text-label-large'
            : 'flex items-center gap-3 text-on-surface-variant px-3 py-2 mx-4 hover:bg-surface-variant rounded-lg cursor-pointer transition-transform active:scale-95 font-label text-label-large';
        html +=
          '<div class="' + cls + '" onclick="navigateTo(\'' + item.key + '\')">' +
            '<span class="material-symbols-outlined">' + item.icon + '</span>' +
            '<span>' + item.label + '</span>' +
          '</div>';
    });
    nav.innerHTML = html;
}

function updateHeaderNav(page) {
    document.querySelectorAll('.nav-link').forEach(function(a) {
        var p = a.getAttribute('data-page');
        if (p === page) {
            a.className = 'nav-link text-primary font-bold border-b-2 border-primary pb-1 cursor-pointer';
        } else {
            a.className = 'nav-link text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer';
        }
    });
}

function showPage(page) {
    document.querySelectorAll('[id^="page-"]').forEach(function(el) {
        el.style.display = 'none';
    });
    var target = document.getElementById('page-' + page);
    if (target) {
        target.style.display = 'flex';
        target.style.flexDirection = 'column';
        target.style.gap = '2rem';
        target.style.width = '100%';
    }
}

function updateInputs(params) {
    if (!params) return;
    PARAM_INPUTS.forEach(function(p) {
        var el = document.getElementById('p_' + p.key);
        if (el && params[p.key] !== undefined) {
            el.value = fmtParam(p.key, params[p.key]);
        }
    });
}

function updateResults(results) {
    if (!results) {
        document.getElementById('res-column-fail').textContent = '--';
        document.getElementById('res-drift').textContent = '--';
        document.getElementById('res-sway').textContent = '--';
        document.getElementById('res-torsion').textContent = '--';
        document.getElementById('status-badge').textContent = 'READY';
        document.getElementById('status-badge').className = 'px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded';
        document.getElementById('limits-rows').innerHTML = '';
        return;
    }
    document.getElementById('res-column-fail').textContent = Number(results.column_fail_pct).toFixed(2) + '%';
    document.getElementById('res-drift').textContent = Number(results.max_story_drift).toFixed(4);
    document.getElementById('res-sway').textContent = Number(results.max_story_sway).toFixed(2) + ' mm';
    document.getElementById('res-torsion').textContent = Number(results.torsion).toFixed(4);
    document.getElementById('status-badge').textContent = 'PREDICTED';
    document.getElementById('status-badge').className = 'px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded';
}

function updateLimits(limits, results) {
    var container = document.getElementById('limits-rows');
    if (!container) return;
    if (!limits || !limits.limits || !results) {
        container.innerHTML = '';
        return;
    }
    var ls = limits.limits;
    var dr = results.max_story_drift;
    var sw = results.max_story_sway;
    var drift_ratio = (dr / ls.drift_mm * 100).toFixed(1);
    var sway_ratio = (sw / ls.sway_mm * 100).toFixed(1);
    var s = limits.safety || {};
    var items = [
        {nm:"Drift (actual/allowable)", k:"drift", uv:"mm", av:dr, lv:ls.drift_mm, ratio:drift_ratio, pass:s.drift_pass},
        {nm:"Sway (actual/allowable)", k:"sway", uv:"mm", av:sw, lv:ls.sway_mm, ratio:sway_ratio, pass:s.sway_pass},
    ];
    var html = '';
    items.forEach(function(it) {
        var icon = it.pass ? 'check_circle' : 'cancel';
        var icc = it.pass ? 'text-green-600' : 'text-red-500';
        html +=
          '<div class="flex justify-between items-center py-1.5 text-xs border-t border-slate-100">' +
            '<span class="text-slate-500">' + it.nm + '</span>' +
            '<span class="font-semibold text-slate-700">' + it.av + ' / ' + it.lv + ' ' + it.uv + ' (' + it.ratio + '%) <span class="' + icc + ' material-symbols-outlined text-sm align-middle">' + icon + '</span></span>' +
          '</div>';
    });
    container.innerHTML = html;
}

function createChart(canvasId, pct, color) {
    var existing = chartInstances[canvasId];
    if (existing) { existing.destroy(); }
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [pct, Math.max(0, 100 - pct)],
                backgroundColor: [color, '#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '78%',
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false }
            },
            animation: {
                animateRotate: true,
                duration: 600
            }
        }
    });
}

function updateCharts(risks) {
    if (!risks) {
        ['column','drift','sway','torsion'].forEach(function(id) {
            var rl = document.getElementById('rl-' + id);
            if (rl) { rl.textContent = 'Pending'; rl.className = 'text-[10px] font-bold text-slate-400'; }
            createChart('cht-' + id, 0, '#e2e8f0');
        });
        return;
    }
    ['column','drift','sway','torsion'].forEach(function(id) {
        var ri = risks[id];
        if (!ri) return;
        var color = RC[ri.label] || '#94A3B8';
        var tc = RC_TAILWIND[ri.label] || 'text-slate-400';
        var rl = document.getElementById('rl-' + id);
        if (rl) { rl.textContent = ri.label; rl.className = 'text-[10px] font-bold ' + tc; }
        createChart('cht-' + id, ri.pct, color);
    });
}

function updateAction(limits) {
    var box = document.getElementById('action-box');
    if (!box) return;
    if (!limits || !limits.action) {
        box.innerHTML = '';
        return;
    }
    var at = limits.action[0], a2 = limits.action[1], aty = limits.action[2] || 'info';
    var styles = {
        error: {bg:"bg-red-50", bd:"border-red-100", ic:"text-red-600", tt:"text-red-900", icon:"error"},
        warning: {bg:"bg-orange-50", bd:"border-orange-100", ic:"text-orange-600", tt:"text-orange-900", icon:"warning"},
        info: {bg:"bg-green-50", bd:"border-green-100", ic:"text-green-600", tt:"text-green-900", icon:"check_circle"},
        success: {bg:"bg-blue-50", bd:"border-blue-100", ic:"text-blue-600", tt:"text-blue-900", icon:"check_circle"},
    };
    var s = styles[aty] || styles.info;
    box.innerHTML =
      '<div class="mt-6 p-4 rounded-xl ' + s.bg + ' border ' + s.bd + '">' +
        '<div class="flex gap-3">' +
          '<span class="material-symbols-outlined ' + s.ic + '">' + s.icon + '</span>' +
          '<div>' +
            '<p class="text-xs font-bold ' + s.tt + '">' + at + '</p>' +
            '<p class="text-[11px] ' + s.tt + ' leading-tight mt-1">' + a2 + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
}

function renderDashboard() {
    var content = document.getElementById('dash-content');
    if (!content) return;
    var results = state_results;
    var limits = state_limits;
    if (!results) {
        content.innerHTML = '<div class="flex flex-col items-center justify-center py-24 text-center"><span class="material-symbols-outlined text-5xl text-slate-400">dashboard</span><h2 class="text-xl font-bold text-slate-900 mt-4 mb-2">No Results Yet</h2><p class="text-slate-500 text-sm">Run a prediction first.</p></div>';
        return;
    }
    var riskRows = '';
    var risks = (limits && limits.risks) ? limits.risks : {};
    [["column","Column Overstress"],["drift","Story Drift"],["sway","Story Sway"],["torsion","Torsion"]].forEach(function(it) {
        var ri = risks[it[0]];
        var label = ri ? ri.label : '--';
        var cls = RC_BG[label] || "bg-slate-100 text-slate-600";
        riskRows += '<div class="flex justify-between py-1.5 text-sm text-slate-500"><span>' + it[1] + '</span><span class="text-xs font-bold px-2 py-0.5 rounded-full ' + cls + '">' + label + '</span></div>';
    });
    var det = results.details || {};
    if (typeof det === 'string') { try { det = JSON.parse(det); } catch(e) { det = {}; } }
    var detailRows = '';
    [["Base Shear", (det.base_shear_kN || 0).toLocaleString() + ' kN'],
     ["Total Capacity", (det.total_capacity_kN || 0).toLocaleString() + ' kN'],
     ["Gravity Load", (det.total_gravity_kN || 0).toLocaleString() + ' kN'],
     ["Num Columns", det.num_cols || '-']].forEach(function(it) {
        detailRows += '<div class="flex justify-between py-1.5 text-sm"><span class="text-slate-500">' + it[0] + '</span><span class="font-semibold text-slate-900">' + it[1] + '</span></div>';
    });
    content.innerHTML =
      '<h1 class="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Column Fail</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.column_fail_pct.toFixed(2) + '%</span></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Max Drift</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.max_story_drift.toFixed(4) + '</span></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Max Sway</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.max_story_sway.toFixed(2) + ' mm</span></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Torsion</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.torsion.toFixed(4) + '</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><h4 class="text-xs font-bold text-slate-400 uppercase mb-4">Risk Overview</h4>' + riskRows + '</div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><h4 class="text-xs font-bold text-slate-400 uppercase mb-4">Structural Details</h4>' + detailRows + '</div>' +
      '</div>';
}

function renderAll() {
    renderSidebar(state_page);
    updateHeaderNav(state_page);
    showPage(state_page);
    updateInputs(state_params);
    updateResults(state_results);
    updateLimits(state_limits, state_results);
    var risks = state_limits ? state_limits.risks : null;
    updateCharts(risks);
    updateAction(state_limits);
    if (state_page === 'dashboard') renderDashboard();
}

/* === API ACTIONS === */

function collectParams() {
    var p = {};
    PARAM_INPUTS.forEach(function(pi) {
        var el = document.getElementById('p_' + pi.key);
        p[pi.key] = parseNumber(el ? el.value : '0');
    });
    return p;
}

function predictAction() {
    var params = collectParams();
    fetch('/api/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(params)
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.status === 'ok') {
            state_params = d.params;
            state_results = d.results;
            updateInputs(state_params);
            updateResults(state_results);
            updateLimits(state_limits, state_results);
            var risks = state_limits ? state_limits.risks : null;
            updateCharts(risks);
        } else {
            alert('Prediction error: ' + (d.message || 'unknown'));
        }
    })
    .catch(function(e) { alert('Network error: ' + e.message); });
}

function computeLimitsAction() {
    if (!state_results) {
        alert('Run prediction first.');
        return;
    }
    fetch('/api/calculate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({params: state_params, results: state_results})
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.status === 'ok') {
            state_limits = d.limits;
            updateLimits(state_limits, state_results);
            var risks = state_limits ? state_limits.risks : null;
            updateCharts(risks);
            updateAction(state_limits);
        } else {
            alert('Calculate error: ' + (d.message || 'unknown'));
        }
    })
    .catch(function(e) { alert('Network error: ' + e.message); });
}

function navigateTo(page) {
    state_page = page;
    renderAll();
}

/* === INIT === */

function loadInitialData() {
    var el = document.getElementById('initial-data');
    if (!el) return;
    var text = el.textContent || el.innerHTML || '';
    text = text.replace('<!--', '').replace('-->', '').trim();
    if (!text || text === 'null') return;
    try {
        var d = JSON.parse(text);
        state_params = d.params || {};
        state_results = d.results || null;
        state_limits = d.limits || null;
        if (d.error) { alert('Prediction error: ' + d.error); }
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-predict').addEventListener('click', predictAction);
    document.getElementById('btn-limits').addEventListener('click', computeLimitsAction);
    document.querySelectorAll('.nav-link').forEach(function(a) {
        a.addEventListener('click', function() {
            navigateTo(this.getAttribute('data-page'));
        });
    });
    loadInitialData();
    renderAll();
    document.querySelectorAll('input').forEach(function(inp) {
        inp.addEventListener('focus', function() {
            this.parentElement.classList.add('scale-[1.02]');
        });
        inp.addEventListener('blur', function() {
            this.parentElement.classList.remove('scale-[1.02]');
        });
    });
});
