var NAV_ITEMS = [
    {key:"parameters", icon:"tune", label:"Parameters"},
    {key:"dashboard", icon:"dashboard", label:"Dashboard"},
    {key:"history", icon:"history", label:"History"},
    {key:"about", icon:"info", label:"About"},
];

var HISTORY_KEY = "structuraml_history";
var HISTORY_MAX = 50;

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
    s = String(s).replace(/,/g, '');
    var m = s.match(/[-+]?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : 0;
}

function fmtParam(key, val) {
    var raw = {"fc":val.toFixed(0),"fy":val.toFixed(0),"z":val.toFixed(2),
               "R":val.toFixed(1),"v":val.toFixed(0),"W":val.toFixed(1),
               "La":val.toFixed(1),"Lb":val.toFixed(1),"n":val.toFixed(0),
               "H":val.toFixed(1),"Hgf":val.toFixed(1),"A":val.toFixed(0),
               "p":val.toFixed(1),"Ag":String(val)};
    return raw[key] || String(val);
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

var R2_VALUES = {
    column: '0.930',
    drift: '0.926',
    sway: '0.958'
};

function updateResults(results) {
    if (!results) {
        document.getElementById('res-column-fail').innerHTML = '--';
        document.getElementById('res-drift').innerHTML = '--';
        document.getElementById('res-sway').innerHTML = '--';
        document.getElementById('status-badge').textContent = 'READY';
        document.getElementById('status-badge').className = 'px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded';
        document.getElementById('limits-rows').innerHTML = '';
        return;
    }
    document.getElementById('res-column-fail').innerHTML = Number(results.column_fail_pct).toFixed(2) + '% <span class="text-[10px] text-slate-400 font-normal">(R&sup2; = ' + R2_VALUES.column + ')</span>';
    document.getElementById('res-drift').innerHTML = Number(results.max_story_drift).toFixed(4) + ' <span class="text-[10px] text-slate-400 font-normal">(R&sup2; = ' + R2_VALUES.drift + ')</span>';
    document.getElementById('res-sway').innerHTML = Number(results.max_story_sway).toFixed(2) + ' mm <span class="text-[10px] text-slate-400 font-normal">(R&sup2; = ' + R2_VALUES.sway + ')</span>';
    document.getElementById('status-badge').textContent = 'PREDICTED';
    document.getElementById('status-badge').className = 'px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded';
}

var actualAllowable = {};

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

    actualAllowable.drift = {av: dr.toFixed(2), lv: ls.drift_mm + ' mm'};
    actualAllowable.sway = {av: sw.toFixed(2), lv: ls.sway_mm + ' mm'};

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

    document.getElementById('av-drift').textContent = actualAllowable.drift.av + ' / ' + actualAllowable.drift.lv;
    document.getElementById('av-sway').textContent = actualAllowable.sway.av + ' / ' + actualAllowable.sway.lv;
}

var centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
        var width = chart.width, height = chart.height, ctx = chart.ctx;
        ctx.save();
        var centerX = width / 2;
        var centerY = height / 2;
        var pct = chart.data.datasets[0].data[0];
        if (pct === 0) { ctx.restore(); return; }
        var displayText = pct.toFixed(1) + '%';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.round(Math.min(width, height) * 0.13) + 'px Inter, sans-serif';
        ctx.fillStyle = chart.data.datasets[0].backgroundColor[0];
        ctx.fillText(displayText, centerX, centerY);
        ctx.restore();
    }
};

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
        },
        plugins: [centerTextPlugin]
    });
}

function updateCharts(risks) {
    if (!risks) {
        ['column','drift','sway'].forEach(function(id) {
            var rl = document.getElementById('rl-' + id);
            if (rl) { rl.textContent = 'Pending'; rl.className = 'text-[10px] font-bold text-slate-400'; }
            createChart('cht-' + id, 0, '#e2e8f0');
        });
        return;
    }
    ['column','drift','sway'].forEach(function(id) {
        var ri = risks[id];
        if (!ri) return;
        var color = RC[ri.label] || '#94A3B8';
        var tc = RC_TAILWIND[ri.label] || 'text-slate-400';
        var rl = document.getElementById('rl-' + id);
        if (rl) { rl.innerHTML = ri.label + ' <span class="font-normal">' + ri.pct.toFixed(1) + '%</span>'; rl.className = 'text-[10px] font-bold ' + tc; }
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
        error: {bg:"bg-red-50", bd:"border-red-100", ic:"text-red-600", tt:"text-red-900", icon:"warning"},
        success: {bg:"bg-green-50", bd:"border-green-100", ic:"text-green-600", tt:"text-green-900", icon:"check_circle"},
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
    [["column","Column Overstress"],["drift","Story Drift"],["sway","Story Sway"]].forEach(function(it) {
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
      '<div class="grid grid-cols-3 gap-4">' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Column Fail</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.column_fail_pct.toFixed(2) + '%</span></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Max Drift</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.max_story_drift.toFixed(4) + '</span></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><span class="text-xs font-semibold text-slate-500">Max Sway</span><span class="text-2xl font-black text-slate-900 block mt-1">' + results.max_story_sway.toFixed(2) + ' mm</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><h4 class="text-xs font-bold text-slate-400 uppercase mb-4">Risk Overview</h4>' + riskRows + '</div>' +
        '<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><h4 class="text-xs font-bold text-slate-400 uppercase mb-4">Structural Details</h4>' + detailRows + '</div>' +
      '</div>';
}

/* === HISTORY === */

function getHistory() {
    try {
        var raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
}

function saveHistory(params, results, limits) {
    var history = getHistory();
    var entry = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        params: JSON.parse(JSON.stringify(params)),
        results: JSON.parse(JSON.stringify(results)),
        limits: limits ? JSON.parse(JSON.stringify(limits)) : null,
    };
    history.unshift(entry);
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(e) {}
}

function deleteHistoryItem(id) {
    var history = getHistory().filter(function(e) { return e.id !== id; });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(e) {}
    renderHistory();
}

function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch(e) {}
    renderHistory();
}

function renderHistory() {
    var content = document.getElementById('history-content');
    if (!content) return;
    var history = getHistory();
    if (history.length === 0) {
        content.innerHTML =
          '<div class="flex flex-col items-center justify-center py-24 text-center">' +
            '<span class="material-symbols-outlined text-5xl text-slate-300">history</span>' +
            '<h2 class="text-xl font-bold text-slate-900 mt-4 mb-2">No Benchmarks Yet</h2>' +
            '<p class="text-slate-500 text-sm">Run a prediction and it will appear here.</p>' +
          '</div>';
        return;
    }
    var html =
      '<div class="flex items-center justify-between mb-4">' +
        '<div>' +
          '<h1 class="text-3xl font-black text-slate-900 tracking-tight">Benchmark History</h1>' +
          '<p class="text-slate-500 mt-1">' + history.length + ' saved prediction' + (history.length !== 1 ? 's' : '') + '</p>' +
        '</div>' +
        '<button onclick="clearHistory()" class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer active:scale-95">' +
          '<span class="material-symbols-outlined text-sm">delete_sweep</span> Clear All' +
        '</button>' +
      '</div>' +
      '<div class="space-y-3">';

    history.forEach(function(entry) {
        var p = entry.params;
        var r = entry.results;
        var risks = (entry.limits && entry.limits.risks) ? entry.limits.risks : {};
        var allPass = entry.limits && entry.limits.safety &&
            entry.limits.safety.drift_pass && entry.limits.safety.sway_pass && entry.limits.safety.column_pass;

        var statusIcon = allPass ? 'check_circle' : 'warning';
        var statusColor = allPass ? 'text-green-600' : 'text-orange-500';

        var riskLabels = '';
        ['column','drift','sway'].forEach(function(k) {
            var label = risks[k] ? risks[k].label : '--';
            var cls = RC_BG[label] || "bg-slate-100 text-slate-600";
            riskLabels += '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + cls + '">' + label + '</span> ';
        });

        html +=
          '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] overflow-hidden" onclick="restoreHistory(' + entry.id + ')">' +
            '<div class="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">' +
              '<div class="flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-sm ' + statusColor + '">' + statusIcon + '</span>' +
                '<span class="text-xs font-semibold text-slate-500">' + entry.timestamp + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-1.5">' + riskLabels +
                '<span class="material-symbols-outlined text-slate-300 text-sm ml-1 hover:text-red-500 transition-colors" onclick="event.stopPropagation();deleteHistoryItem(' + entry.id + ')">close</span>' +
              '</div>' +
            '</div>' +
            '<div class="px-5 py-3">' +
              '<div class="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">' +
                '<span class="text-slate-400">Stories:</span><span class="font-semibold text-slate-800 -ml-3">' + p.n + '</span>' +
                '<span class="text-slate-300">|</span>' +
                '<span class="text-slate-400">Height:</span><span class="font-semibold text-slate-800 -ml-3">' + p.H + ' m</span>' +
                '<span class="text-slate-300">|</span>' +
                '<span class="text-slate-400">Concrete:</span><span class="font-semibold text-slate-800 -ml-3">' + p.fc + ' MPa</span>' +
                '<span class="text-slate-300">|</span>' +
                '<span class="text-slate-400">Gross Area:</span><span class="font-semibold text-slate-800 -ml-3">' + Number(p.Ag).toLocaleString() + ' mm&sup2;</span>' +
              '</div>' +
              '<div class="h-px bg-slate-100 my-2.5"></div>' +
              '<div class="grid grid-cols-3 gap-3">' +
                '<div class="bg-slate-50 rounded-lg px-3 py-2"><span class="text-[10px] font-semibold text-slate-400 uppercase block">Drift</span><span class="text-sm font-bold text-slate-900">' + Number(r.max_story_drift).toFixed(4) + '</span></div>' +
                '<div class="bg-slate-50 rounded-lg px-3 py-2"><span class="text-[10px] font-semibold text-slate-400 uppercase block">Sway</span><span class="text-sm font-bold text-slate-900">' + Number(r.max_story_sway).toFixed(2) + ' mm</span></div>' +
                '<div class="bg-slate-50 rounded-lg px-3 py-2"><span class="text-[10px] font-semibold text-slate-400 uppercase block">Column Fail</span><span class="text-sm font-bold text-slate-900">' + Number(r.column_fail_pct).toFixed(2) + '%</span></div>' +
              '</div>' +
            '</div>' +
          '</div>';
    });

    html += '</div>';
    content.innerHTML = html;
}

function restoreHistory(id) {
    var history = getHistory();
    var entry = history.find(function(e) { return e.id === id; });
    if (!entry) return;
    state_params = JSON.parse(JSON.stringify(entry.params));
    state_results = JSON.parse(JSON.stringify(entry.results));
    state_limits = entry.limits ? JSON.parse(JSON.stringify(entry.limits)) : null;
    navigateTo('parameters');
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
    if (state_page === 'history') renderHistory();
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
        if (d.status !== 'ok') {
            alert('Prediction error: ' + (d.message || 'unknown'));
            return;
        }
        state_params = d.params;
        state_results = d.results;
        updateInputs(state_params);
        updateResults(state_results);
        return fetch('/api/calculate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({params: state_params, results: state_results})
        });
    })
    .then(function(r) { return r ? r.json() : null; })
    .then(function(d) {
        if (!d) return;
        if (d.status === 'ok') {
            state_limits = d.limits;
        }
        updateLimits(state_limits, state_results);
        var risks = state_limits ? state_limits.risks : null;
        updateCharts(risks);
        updateAction(state_limits);
        saveHistory(state_params, state_results, state_limits);
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
