document.addEventListener("DOMContentLoaded", function () {
    // Auto-open a tab if needed
    const filters = document.querySelectorAll('.filter');
    if (filters.length > 0) {
        const tableTab = document.querySelector('.tab[data-target="tab2"]');
        setTimeout(() => { if (tableTab) tableTab.click(); }, 100);
    }

    const tabsContainer = document.getElementById('settingsTabs');
    const filterBars = document.querySelectorAll('.js-chart-filters');

    function toggleFilters(targetKey) {
        const show = targetKey === 'tab1'; // show on Visual Overview only
        filterBars.forEach(el => el.style.display = show ? 'flex' : 'none');
    }

    // Initial state (your markup shows tab2 is active by default)
    const initialTarget = document.querySelector('.tab.active')?.dataset.target || 'tab1';
    toggleFilters(initialTarget);

    // Update on tab clicks
    tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab');
        if (!btn) return;
        toggleFilters(btn.dataset.target);
    });

    // ---- Global Color Registry (shared across all charts) ----
    const COLOR = (() => {
        const PALETTE = ['#6366f1', '#3bc3b8', '#f59e0b', '#e7382d', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#22c55e'];
        const FIXED = {
            'verified rate': '#6366f1',
            'verified count': '#3bc3b8',
            'unverified count': '#e7382d',
            'no_face_live': '#f59e0b',
            'face_mismatch': '#ef4444',
            'no_face_uploaded': '#8b5cf6',
            'in_session_check': '#6366f1',            // Left column
            'course_launch_verification': '#3bc3b8',
            'unknown': '#9ca3af',

            'device:desktop': '#6366f1',
            'device:tablet': '#3b82f6',
            'device:mobile': '#3bc3b8',

            'browser:chrome': '#f59e0b',
            'browser:safari': '#3b82f6',
            'browser:edge': '#3bc3b8',
            'browser:firefox': '#ef4444',

            'device:unknown':  '#9ca3af',
            'browser:unknown': '#9ca3af',
        };
        const cache = new Map();
        let next = 0;

        function get(key) {
        const k = String(key || 'unknown').toLowerCase();
        if (FIXED[k]) return FIXED[k];
        if (cache.has(k)) return cache.get(k);
        const c = PALETTE[next % PALETTE.length];
        cache.set(k, c);
        next += 1;
        return c;
        }

        function alpha(hex, a = 0.2) {
        const h = hex.replace('#','');
        const n = parseInt(h, 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
        }

        return { get, alpha };
    })();

    const AXIS_STYLE = {
        ticks: {
        color: '#858b8f',
        autoSkip: true,
        maxRotation: 0
        },
        grid: {
        color: '#ececf1',
        lineWidth: 0.7,
        borderDash: [2, 4],
        borderDashOffset: 0
        },
        border: { color: '#ffffff' }
    };

    // --- Shared bar sizing so both charts match
    const BAR = {
        categoryPct: 0.55,   // how much of the category width the bar cluster uses
        barPct: 0.90,        // spacing between bars within the cluster
        thickness: 16,       // fixed bar thickness
        maxThickness: 18
    };

    // Keep a little state so legend stays in sync
    let platformDim = 'browser'; // 'device' | 'browser'

    // ---- Shared state ----
    let currentRange = { start: null, end: null }; // "YYYY-MM-DD"
    let currentBucket = 'month';                   // day|week|month|year
    const charts = {};
    const filterUIs = [];                          // registered filter instances
    const bucketUI2Param = { Daily: 'day', Weekly: 'week', Monthly: 'month', Yearly: 'year' };
    const bucketParam2UI = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };

    const REASON_LABEL = {
        no_face_live: 'No Face Detected',
        face_mismatch: 'Face Mismatch',
        no_face_uploaded: 'No Headshot Face',
        unknown: 'Unknown'
    };
    const REASON_ORDER = ['no_face_live','face_mismatch','no_face_uploaded','unknown'];

    // --- Shared x-axis config (consistent date formatting + padding)
    function makeCategoryXAxis() {
        return {
            type: 'category',
            ...(AXIS_STYLE || {}),
            offset: true,            // always pad so single buckets don't hug edges
            ticks: {
            ...(AXIS_STYLE?.ticks || {}),
            maxRotation: 0,
            callback(value, index) {
                const raw = this.getLabelForValue
                ? this.getLabelForValue(value)
                : (this.chart?.data?.labels?.[index] ?? value);
                return formatBucketLabel(raw, currentBucket);
            }
            }
        };
    }

    // ---- Pretty date labels for x-axis ----
    function _dateFromISO(iso) {
        const [y, m, d] = String(iso).split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1); // avoid TZ shifts
    }
    function _fmt(d, withYear=false) {
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
    }
    function formatBucketLabel(iso, bucket) {
        const s = _dateFromISO(iso);

        if (bucket === 'day') {
        return _fmt(s, false); // "Aug 11"
        }
        if (bucket === 'week') {
        const e = new Date(s);
        e.setDate(e.getDate() + 6);
        const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
        const sameYear  = s.getFullYear() === e.getFullYear();
        if (sameMonth) return `${s.toLocaleString('en-US', { month: 'short' })} ${s.getDate()}–${e.getDate()}`;
        if (sameYear)  return `${_fmt(s, false)} – ${_fmt(e, false)}`;
        return `${_fmt(s, true)} – ${_fmt(e, true)}`;
        }
        if (bucket === 'month') {
        return s.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // "Aug 2025"
        }
        if (bucket === 'year') {
        return String(s.getFullYear());
        }
        return String(iso);
    }

    // ---- Filter UI initializer (supports multiple instances) ----
    function initChartFilters(container) {
        const dateInput   = container.querySelector('.js-date-range');
        const openDateEl  = container.querySelector('.js-open-date');
        const bucketRoot  = container.querySelector('.js-bucket');
        const bucketLabel = container.querySelector('.js-bucket-selected');
        const bucketItems = bucketRoot.querySelectorAll('.select-item.analytics-select-item');

        // Flatpickr per-instance
        const fp = flatpickr(dateInput, {
        mode: "range",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "M j, Y",
        clickOpens: true,
        onChange: (selected, _str, instance) => {
            if (selected.length === 2) {
            const [s, e] = selected;
            currentRange.start = instance.formatDate(s, "Y-m-d");
            currentRange.end   = instance.formatDate(e, "Y-m-d");
            syncPeers(ui);
            refreshCharts();
            }
        }
        });

        // Open picker when clicking the label (but not the input itself)
        if (openDateEl) {
        openDateEl.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
            fp.open();
            }
        });
        }

        // Bucket dropdown open/close (class-based)
        const itemsEl = bucketRoot.querySelector('.date-select-items');
        bucketRoot.addEventListener('click', (e) => {
        e.stopPropagation();
        // close others
        document.querySelectorAll('.date-select-items.is-open').forEach(el => {
            if (el !== itemsEl) el.classList.remove('is-open','animate-select-dropdown');
        });
        const isOpen = itemsEl.classList.contains('is-open');
        itemsEl.classList.toggle('is-open', !isOpen);
        itemsEl.classList.toggle('animate-select-dropdown', !isOpen);
        });

        // Bucket option selection
        bucketItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const uiText    = item.getAttribute('data-value');           // "Weekly"
            const newBucket = bucketUI2Param[uiText] || 'month';
            if (newBucket === currentBucket) {
            itemsEl.classList.remove('is-open','animate-select-dropdown');
            return;
            }
            currentBucket = newBucket;
            bucketLabel.textContent = uiText;
            bucketItems.forEach(i => i.classList.toggle('same-as-selected', i === item));
            itemsEl.classList.remove('is-open','animate-select-dropdown');

            syncPeers(ui);
            refreshCharts();
        });
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', (e) => {
        if (!bucketRoot.contains(e.target)) {
            itemsEl.classList.remove('is-open','animate-select-dropdown');
        }
        });

        // Instance API used by syncPeers/prime defaults
        const ui = {
        container,
        fp,
        setRange(start, end, {silent=false} = {}) {
            if (start && end) {
            if (silent) {
                fp.setDate([start, end], false, "Y-m-d");
                const d1 = fp.parseDate(start, "Y-m-d");
                const d2 = fp.parseDate(end,   "Y-m-d");
                fp.input.value = `${fp.formatDate(d1,"M j, Y")} to ${fp.formatDate(d2,"M j, Y")}`;
            } else {
                fp.setDate([start, end], true, "Y-m-d");
            }
            }
        },
        setBucket(bucket, {silent=false} = {}) {
            const uiText = bucketParam2UI[bucket] || 'Monthly';
            bucketLabel.textContent = uiText;
            bucketItems.forEach(i => i.classList.toggle('same-as-selected', i.getAttribute('data-value') === uiText));
            if (!silent) {
            currentBucket = bucket;
            refreshCharts();
            }
        }
        };

        filterUIs.push(ui);
        return ui;
    }

    // Mirror shared state into all other filter UIs without loops
    function syncPeers(sourceUI) {
        filterUIs.forEach(ui => {
        if (ui === sourceUI) return;
        if (currentRange.start && currentRange.end) {
            ui.setRange(currentRange.start, currentRange.end, {silent:true});
        }
        ui.setBucket(currentBucket, {silent:true});
        });
    }

    // ---- Data fetch (with cancellation) ----
    let fetchSeq = 0;
    let inflight = null;

    function buildQuery() {
        const params = new URLSearchParams();
        params.set('bucket', currentBucket);
        if (currentRange.start && currentRange.end) {
        params.set('start', currentRange.start);
        params.set('end', currentRange.end);
        }
        return params.toString();
    }

    async function fetchData() {
        if (inflight) inflight.abort();
        inflight = new AbortController();

        const seq = ++fetchSeq;
        const qs  = buildQuery();
        const url = `/admin/analytics/api/facial_verification/timeseries?${qs}`;
        let res;
        try {
        res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal: inflight.signal });
        } catch (err) {
        if (err.name === 'AbortError') return null; // stale
        throw err;
        }
        if (!res.ok) throw new Error('Failed to load chart data');

        const data = await res.json();
        if (seq < fetchSeq) return null; // only newest
        return data;
    }

    // ---- Chart builders ----
    function makePassRateLine(ctx) {
  const cRate = COLOR.get('Verified Rate');
  const cPass = COLOR.get('Verified Count');
  const cFail = COLOR.get('Unverified Count');

  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] }, // filled by ensurePassRateDatasets/update
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (items) => formatBucketLabel(items[0].label, currentBucket),
            label: (ctx) => {
              const { dataset, parsed } = ctx;
              const v = Number(parsed.y);
              // y1 = rate (0..1) => show as %
              if (dataset.yAxisID === 'y1') {
                return `${dataset.label}: ${Number.isFinite(v) ? Math.round(v * 100) + '%' : '—'}`;
              }
              // y2 = counts
              return `${dataset.label}: ${Number.isFinite(v) ? v : '—'}`;
            }
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'category',
          ...AXIS_STYLE,
          ticks: {
            ...(AXIS_STYLE.ticks || {}),
            maxRotation: 0,
            callback: function (value, index) {
              const raw = this.getLabelForValue
                ? this.getLabelForValue(value)
                : (this.chart?.data?.labels?.[index] ?? value);
              return formatBucketLabel(raw, currentBucket);
            }
          }
        },
        y1: {
          ...AXIS_STYLE,
          type: 'linear',
          position: 'left',
          min: 0,
          max: 1,
          ticks: {
            ...(AXIS_STYLE.ticks || {}),
            callback: v => `${Math.round(v * 100)}%`
          },
          title: { display: false }
        },
        y2: {
          ...AXIS_STYLE,
          type: 'linear',
          position: 'right',
          title: { display: false },
          grid: { ...(AXIS_STYLE.grid || {}), drawOnChartArea: false }
        }
      }
    }
  });
    }

    const STACKS = Object.freeze({
    LEFT:  'left',
    MID:   'mid',
    RIGHT: 'right'
    });

    function normStack(s) { return String(s || '').trim().toLowerCase(); }


    function makeFailuresByStepGrouped(ctx) {
    return new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
                title: (items) => formatBucketLabel(items[0].label, currentBucket),
                // ▼ UPDATED: add percent next to the count
                label: (ctx) => {
                const val   = Number(ctx.parsed.y) || 0;
                const total = (ctx.chart.$failStepTotals?.[ctx.dataIndex]) || 0;
                const pct   = total ? Math.round((val / total) * 100) : null;
                return `${ctx.dataset.label}: ${val}${pct !== null ? ` (${pct}%)` : ''}`;
                }
            }
            }
        },
        datasets: {
            bar: {
            categoryPercentage: BAR.categoryPct,
            barPercentage: BAR.barPct,
            barThickness: BAR.thickness,
            maxBarThickness: BAR.maxThickness,
            borderWidth: 1
            }
        },
        scales: {
            x: { ...makeCategoryXAxis(), stacked: false },
            y: {
            ...(AXIS_STYLE || {}),
            stacked: false,
            beginAtZero: true,
            ticks: { ...(AXIS_STYLE?.ticks || {}), precision: 0, callback: v => Number.isFinite(v) ? Math.round(v) : v }
            }
        }
        }
    });
    }

    // =============================
    // Failure Reasons (100% composition) — MATCHED BAR SIZE
    // =============================
    function makeFailureReasonsComposition(ctx) {
    return new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false, // we pass {x,y}
        plugins: {
            legend: { display: false },
            tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
                title: (items) => formatBucketLabel(items[0].label, currentBucket),
                label: (ctx) => {
                const pct = ctx.parsed.y ?? 0;
                const count = ctx.raw?._count ?? 0;
                return `${ctx.dataset.label}: ${Math.round(pct * 100)}% (${count})`;
                }
            }
            }
        },
        datasets: {
            bar: {
            categoryPercentage: BAR.categoryPct,  // <- same as grouped chart
            barPercentage: BAR.barPct,
            barThickness: BAR.thickness,
            maxBarThickness: BAR.maxThickness,
            borderWidth: 1
            }
        },
        scales: {
            x: { ...makeCategoryXAxis(), stacked: true },
            y: {
            ...(AXIS_STYLE || {}),
            stacked: true,
            beginAtZero: true,
            suggestedMax: 1,
            ticks: { ...(AXIS_STYLE?.ticks || {}), stepSize: 0.25, callback: v => `${Math.round((v ?? 0) * 100)}%` }
            }
        }
        }
    });
    }

    // ---- Updaters

    // 1) Failures by Verification Step (Course Launch vs In‑Session) — counts
    function updateFailuresByStepGrouped(chart, payload, legendEl) {
        const toNum = v => +v || 0;
        const labels = (payload.labels || []).slice();
        const len = labels.length;

        chart.data.labels = labels;

        const byReasonVT = payload.failures_by_reason_vt || {};
        const zeros = n => Array(n).fill(0);
        const fitLen = (arr, n) => { const a = (arr || []).map(toNum); if (a.length < n) a.push(...Array(n - a.length).fill(0)); return a.slice(0, n); };

        function sumByVT(vtKey) {
            const out = zeros(len);
            Object.values(byReasonVT).forEach(perVT => {
            const arr = fitLen(perVT?.[vtKey], len);
            for (let i = 0; i < len; i++) out[i] += arr[i];
            });
            return out;
        }

        let clv = sumByVT('course_launch_verification');
        let isc = sumByVT('in_session_check');
        clv = fitLen(clv, len);
        isc = fitLen(isc, len);

        // ▼ NEW: totals for each date so the tooltip can show percentages
        chart.$failStepTotals = labels.map((_, i) => toNum(clv[i]) + toNum(isc[i]));

        const cCLV = COLOR.get('course_launch_verification');
        const cISC = COLOR.get('in_session_check');
        const nz = arr => arr.map(v => (toNum(v) > 0 ? toNum(v) : null));

        chart.data.datasets = [
            {
            label: 'Course Launch',
            _colorKey: 'course_launch_verification',
            type: 'bar',
            data: nz(clv),
            backgroundColor: COLOR.alpha(cCLV, 0.65),
            borderColor: cCLV,
            borderWidth: 1
            },
            {
            label: 'In-Session Check',
            _colorKey: 'in_session_check',
            type: 'bar',
            data: nz(isc),
            backgroundColor: COLOR.alpha(cISC, 0.65),
            borderColor: cISC,
            borderWidth: 1
            }
        ];

        const maxVal = Math.max(1, ...clv.map(toNum), ...isc.map(toNum));
        if (chart.options?.scales?.x) chart.options.scales.x.offset = true;
        if (chart.options?.scales?.y) {
            chart.options.scales.y.beginAtZero = true;
            chart.options.scales.y.suggestedMax = Math.ceil(maxVal * 1.2);
            chart.options.scales.y.stacked = false;
        }

        chart.update();
        renderCheckboxLegend(legendEl, chart);
    }


    // Unstacked Failure Reasons (percent side-by-side; fallback to counts)
    function updateFailureReasonsComposition(chart, payload, legendEl) {
    const toNum = v => +v || 0;
    const labels = (payload.labels || []).slice();
    const len = labels.length;

    chart.data.labels = labels;

    const reasonSeriesRaw = payload.failures_by_reason || {};
    const byReasonVT      = payload.failures_by_reason_vt || {};

    function buildReason(key) {
        if (Array.isArray(reasonSeriesRaw[key])) return reasonSeriesRaw[key].map(toNum);
        const out = Array(len).fill(0);
        const perVT = byReasonVT[key] || {};
        ['in_session_check','course_launch_verification'].forEach(vt => {
        const arr = (perVT[vt] || []).map(toNum);
        for (let i = 0; i < len; i++) out[i] += arr[i] || 0;
        });
        return out;
    }

    const preferred = ['no_face_live', 'face_mismatch', 'no_face_uploaded'];
    const allReasons = Array.from(new Set([
        ...preferred,
        ...Object.keys(reasonSeriesRaw || {}),
        ...Object.keys(byReasonVT || {})
    ])).filter(Boolean);

    const reasonCounts = {};
    allReasons.forEach(k => { reasonCounts[k] = buildReason(k); });

    const totals = labels.map((_d, i) =>
        allReasons.reduce((sum, k) => sum + toNum((reasonCounts[k] || [])[i]), 0)
    );

    // ---- DEBUG (kept)
    (function debugReasons() {
        console.groupCollapsed('[failureReasonsComposition] computed');
        console.log('labels:', labels);
        console.log('reasons:', allReasons);
        const rows = labels.map((d, i) => {
        const row = { date: d, total: totals[i] };
        allReasons.forEach(k => { row[k] = toNum((reasonCounts[k] || [])[i]); });
        return row;
        });
        console.table(rows);
        console.groupEnd();
    })();

    const labelMap = {
        no_face_live: 'No Face Detected',
        face_mismatch: 'Face Mismatch',
        no_face_uploaded: 'No Headshot Face'
    };
    const colorFor = key => COLOR.get(key);

    chart.options.parsing = false;   // we pass {x,y}
    chart.options.scales.x.offset = true;

    const allZero = totals.every(t => (toNum(t) === 0));

    if (allZero) {
        // --- Fallback: grouped COUNTS (unstacked)
        chart.options.scales.x.stacked = false;
        chart.options.scales.y.stacked = false;
        chart.options.scales.y.beginAtZero = true;
        chart.options.scales.y.suggestedMax = undefined;
        chart.options.scales.y.ticks = {
        ...(AXIS_STYLE?.ticks || {}),
        precision: 0,
        callback: v => Number.isFinite(v) ? Math.round(v) : v
        };

        const datasets = allReasons.map(key => {
        const counts = (reasonCounts[key] || []).map(toNum);
        const color  = colorFor(key);
        const data   = counts.map((c, i) => ({ x: labels[i], y: c > 0 ? c : null }));
        return {
            label: labelMap[key] || key.replace(/_/g, ' '),
            _colorKey: key,
            type: 'bar',
            data,
            backgroundColor: COLOR.alpha(color, 0.65),
            borderColor: color,
            borderWidth: 1
        };
        });

        chart.data.datasets = datasets;

        const maxVal = Math.max(1, ...datasets.flatMap(ds => ds.data).map(p => toNum(p?.y || 0)));
        chart.options.scales.y.suggestedMax = Math.ceil(maxVal * 1.2);

        chart.update();
        renderCheckboxLegend(legendEl, chart);
        return;
    }

    // --- Normal case: grouped PERCENTS (unstacked)
    chart.options.scales.x.stacked = false;
    chart.options.scales.y.stacked = false;
    chart.options.scales.y.beginAtZero = true;
    chart.options.scales.y.suggestedMax = 1;
    chart.options.scales.y.ticks = {
        ...(AXIS_STYLE?.ticks || {}),
        stepSize: 0.25,
        callback: v => `${Math.round((v ?? 0) * 100)}%`
    };

    const datasets = allReasons.map(key => {
        const counts = (reasonCounts[key] || []).map(toNum);
        const color  = colorFor(key);
        const data   = counts.map((c, i) => ({
        x: labels[i],
        y: totals[i] ? (c / totals[i]) : 0,
        _count: c
        }));
        return {
        label: labelMap[key] || key.replace(/_/g, ' '),
        _colorKey: key,
        type: 'bar',
        // NOTE: no 'stack' property -> unstacked (grouped)
        data,
        backgroundColor: COLOR.alpha(color, 0.65),
        borderColor: color,
        borderWidth: 1
        };
    });

    chart.data.datasets = datasets;

    chart.update();
    renderCheckboxLegend(legendEl, chart);
    }

    // ===============
    // Failure Reasons by Step (grouped stacks)
    // mode: 'percent' (default) or 'count'
    // ===============
    // builder (grouped bars, not stacked)
    function makeFailureReasonsByStepCategories(ctx, { mode = 'count' } = {}) {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: (items) => items?.[0]?.label ?? '',
                    label: (ctx) => {
                    const isPct = ctx.chart?.$mode === 'percent';
                    const y = ctx.parsed.y ?? 0;
                    const count = ctx.raw?._count ?? 0;
                    const total = ctx.raw?._total ?? null;
                    return isPct
                        ? `${ctx.dataset.label}: ${Math.round(y * 100)}% (${count}${total != null ? ` of ${total}` : ''})`
                        : `${ctx.dataset.label}: ${count}`;
                    }
                }
                }
            },
            datasets: {
                bar: {
                categoryPercentage: BAR.categoryPct,
                barPercentage: BAR.barPct,
                barThickness: BAR.thickness,
                maxBarThickness: BAR.maxThickness,
                borderWidth: 1
                }
            },
            scales: {
                x: {
                type: 'category',
                ...(AXIS_STYLE || {}),
                offset: true,
                stacked: false,
                ticks: { ...(AXIS_STYLE?.ticks || {}), maxRotation: 0 }
                },
                y: {
                ...(AXIS_STYLE || {}),
                stacked: false,
                beginAtZero: true,
                suggestedMax: 1,
                ticks: {
                    ...(AXIS_STYLE?.ticks || {}),
                    stepSize: 0.25,
                    callback: function (v) {
                    const isPct = this.chart?.$mode === 'percent';
                    return isPct ? `${Math.round((v ?? 0) * 100)}%` : (Number.isFinite(v) ? Math.round(v) : v);
                    }
                }
                }
            }
            }
        });
        chart.$mode = mode;
        return chart;
    }

    // updater
    function updateFailureReasonsByStepCategories(chart, payload, legendEl, { mode = 'count' } = {}) {
    chart.$mode = mode;

    const toNum = v => +v || 0;
    const byReasonVT = payload.failures_by_reason_vt || {}; // {reason: {in_session_check:[], course_launch_verification:[]}}
    const vtKeys = ['in_session_check','course_launch_verification'];
    const vtLabel = { in_session_check: 'In-Session Check', course_launch_verification: 'Course Launch' };

    // Determine which reasons exist (respect preferred order first)
    const allReasons = Array.from(new Set([
        ...REASON_ORDER,
        ...Object.keys(byReasonVT || {})
    ])).filter(Boolean);

    // Aggregate counts across the selected time range
    const sums = reason => {
        const perVT = byReasonVT[reason] || {};
        const isc = (perVT.in_session_check || []).reduce((a,b)=>a+toNum(b), 0);
        const clv = (perVT.course_launch_verification || []).reduce((a,b)=>a+toNum(b), 0);
        return { isc, clv, total: isc + clv };
    };

    // Build arrays in reason order
    const reasons = allReasons.filter(r => byReasonVT[r]); // keep ones present
    const xLabels = reasons.map(r => REASON_LABEL[r] || r.replace(/_/g,' '));

    const iscCounts = [];
    const clvCounts = [];
    const totals    = [];

    reasons.forEach(r => {
        const { isc, clv, total } = sums(r);
        iscCounts.push(isc);
        clvCounts.push(clv);
        totals.push(total);
    });

    // Build datasets (grouped, not stacked). Keep counts in raw for tooltips.
    const cISC = COLOR.get('in_session_check');
    const cCLV = COLOR.get('course_launch_verification');

    const makeData = (countsArr) => countsArr.map((c, i) =>
        mode === 'percent'
        ? ({ x: xLabels[i], y: totals[i] ? c / totals[i] : 0, _count: c, _share: totals[i] })
        : ({ x: xLabels[i], y: c, _count: c, _share: totals[i] })
    );

    chart.data.labels = xLabels;
    chart.data.datasets = [
        {
        label: vtLabel.in_session_check,
        _colorKey: 'in_session_check',
        type: 'bar',
        data: makeData(iscCounts),
        backgroundColor: COLOR.alpha(cISC, 0.65),
        borderColor: cISC,
        borderWidth: 1
        },
        {
        label: vtLabel.course_launch_verification,
        _colorKey: 'course_launch_verification',
        type: 'bar',
        data: makeData(clvCounts),
        backgroundColor: COLOR.alpha(cCLV, 0.65),
        borderColor: cCLV,
        borderWidth: 1
        }
    ];

    // Y-axis tuning
    if (mode === 'percent') {
        chart.options.scales.y.suggestedMax = 1;
        chart.options.scales.y.ticks.stepSize = 0.25;
    } else {
        const maxVal = Math.max(1, ...iscCounts, ...clvCounts);
        chart.options.scales.y.suggestedMax = Math.ceil(maxVal * 1.2);
        delete chart.options.scales.y.ticks.stepSize;
    }

    chart.update();
    renderCheckboxLegend(legendEl, chart);
    }

    function makeSimilarityTrend(ctx) {
        const cSucc = COLOR.get('verified count');   // greenish
        const cFail = COLOR.get('unverified count'); // redish

        return new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [
            {
                label: 'Avg Similarity (Success)',
                _colorKey: 'verified count',
                type: 'line',
                data: [],
                tension: 0.3, borderWidth: 2, pointRadius: 2, spanGaps: true,
                borderColor: cSucc, backgroundColor: COLOR.alpha(cSucc, 0.15), fill: false,
                yAxisID: 'y'
            },
            {
                label: 'Avg Similarity (Failure)',
                _colorKey: 'unverified count',
                type: 'line',
                data: [],
                tension: 0.3, borderWidth: 2, pointRadius: 2, spanGaps: true,
                borderColor: cFail, backgroundColor: COLOR.alpha(cFail, 0.15), fill: false,
                yAxisID: 'y'
            }
            ]},
            options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: (items) => formatBucketLabel(items[0].label, currentBucket),
                    label: (ctx) => {
                        // values are 0..1 -> show %
                        const v = Number(ctx.parsed.y) || 0;
                        // we stored counts in _n on each point for the tooltip
                        const n = ctx.raw?._n ?? null;
                        return `${ctx.dataset.label}: ${Math.round(v*100)}%${n!=null?` (${n})`:''}`;
                    }
                }
                }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { ...makeCategoryXAxis() },
                y: {
                    ...(AXIS_STYLE || {}),
                    beginAtZero: true,
                    min: 0, max: 1,
                    ticks: { ...(AXIS_STYLE?.ticks||{}), callback: v => `${Math.round(v*100)}%` }
                }
            }
            }
        });
    }

    function updateSimilarityTrend(chart, payload, legendEl) {
        const labels = payload.labels || [];
        chart.data.labels = labels;

        const s = payload.similarity || {};
        const aSucc = (s.avg_success || []).map(Number);
        const nSucc = (s.n_success   || []).map(Number);
        const aFail = (s.avg_failure || []).map(Number);
        const nFail = (s.n_failure   || []).map(Number);

        // attach n to each point for tooltips
        chart.data.datasets[0].data = aSucc.map((v,i) => ({x: labels[i], y: v ?? null, _n: nSucc[i] ?? null}));
        chart.data.datasets[1].data = aFail.map((v,i) => ({x: labels[i], y: v ?? null, _n: nFail[i] ?? null}));

        chart.update();
        renderCheckboxLegend(legendEl, chart);
    }

    function makePlatformDonut(ctx) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: { labels: [], datasets: [{
                label: 'Share of Attempts',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]},
            options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { display: false },
                tooltip: {
                callbacks: {
                    label: (ctx) => {
                    const label = ctx.label || '';
                    const value = Number(ctx.parsed) || 0;
                    const total = ctx.dataset._totals?.[ctx.dataIndex] || 0;
                    const fails = ctx.dataset._fails?.[ctx.dataIndex]  || 0;
                    const rate  = total ? Math.round((fails/total)*100) : 0;
                    return `${label}: ${value} (${rate}% fail)`;
                    }
                }
                }
            }
            }
        });
    }

    function updatePlatformDonut(chart, payload, legendEl, { dim = 'browser' } = {}) {
        platformDim = dim;

        const items  = (payload.platform || {})[dim === 'browser' ? 'by_browser' : 'by_device'] || [];
        const labels = items.map(r => (r.key || 'Unknown').replace(/\b\w/g, c => c.toUpperCase()));
        const totals = items.map(r => +r.total || 0);
        const fails  = items.map(r => +r.failures || 0);

        chart.data.labels = labels;
        chart.data.datasets[0].data    = totals;
        chart.data.datasets[0]._totals = totals;
        chart.data.datasets[0]._fails  = fails;

        const scope = (dim === 'browser') ? 'browser' : 'device';
        const norm  = s => String(s || 'unknown').trim().toLowerCase().replace(/\s+/g, ' ');

        const colors = labels.map(lbl => {
            const key = `${scope}:${norm(lbl)}`;       // ← namespaced key
            const hex = COLOR.get(key);                // ← will hit FIXED first, else fall back to palette (but scoped)
            return { bg: COLOR.alpha(hex, 0.65), b: hex };
        });

        chart.data.datasets[0].backgroundColor = colors.map(c => c.bg);
        chart.data.datasets[0].borderColor     = colors.map(c => c.b);

        // reset visibility when switching dims (unchanged)
        if (chart.setDataVisibility) {
            for (let i = 0; i < labels.length; i++) chart.setDataVisibility(i, true);
        } else if (chart.getDatasetMeta(0)?.data) {
            chart.getDatasetMeta(0).data.forEach(el => { if (el) el.hidden = false; });
        }

        chart.update();
        renderPlatformSliceLegend(legendEl, chart);
    }

    // Legend for a single-dataset donut: one checkbox per slice
    function renderPlatformSliceLegend(containerEl, chart) {
        containerEl.innerHTML = '';
        const labels = chart.data.labels || [];
        const ds = chart.data.datasets?.[0] || {};
        const borders = Array.isArray(ds.borderColor) ? ds.borderColor : [];

        labels.forEach((lbl, i) => {
            const color = borders[i] || COLOR.get(lbl);

            const wrapper = document.createElement('label');
            wrapper.className = 'legend-item';
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '0.5rem';
            wrapper.style.marginRight = '0.75rem';

            const box = document.createElement('label');
            box.className = 'container';
            box.style.setProperty('--legend-color', color);

            const input = document.createElement('input');
            input.type = 'checkbox';
            // visible unless explicitly hidden
            const isVisible = chart.getDataVisibility ? chart.getDataVisibility(i) : !(chart.getDatasetMeta(0)?.data?.[i]?.hidden);
            input.checked = isVisible;

            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';
            checkmark.style.setProperty('border-color', color, 'important');
            if (isVisible) checkmark.style.setProperty('background-color', color, 'important');

            input.addEventListener('change', () => {
            // Chart.js v3/v4 API w/ fallback
            if (chart.setDataVisibility) {
                chart.setDataVisibility(i, input.checked);
            } else if (chart.getDatasetMeta(0)?.data?.[i]) {
                chart.getDatasetMeta(0).data[i].hidden = !input.checked;
            } else {
                // last resort: null out the datapoint
                const v = chart.data.datasets[0].data[i];
                chart.data.datasets[0].data[i] = input.checked ? (v ?? 0) : null;
            }
            checkmark.style.setProperty('background-color', input.checked ? color : 'transparent', 'important');
            chart.update();
            });

            const text = document.createElement('span');
            text.textContent = lbl;

            box.appendChild(input);
            box.appendChild(checkmark);
            wrapper.appendChild(box);
            wrapper.appendChild(text);
            containerEl.appendChild(wrapper);
        });
    }

    // Legend that looks like your others, but switches the dimension
    function renderPlatformDimLegend(containerEl, { dim, onChange }) {
        containerEl.innerHTML = '';

        const items = [
            { key: 'device',  label: 'Devices',  color: COLOR.get('Devices') },
            { key: 'browser', label: 'Browsers', color: COLOR.get('Browsers') },
        ];

        items.forEach(({ key, label, color }) => {
            const id = `platform-dim-${key}`;

            const wrapper = document.createElement('label');
            wrapper.className = 'legend-item';
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '0.5rem';
            wrapper.style.marginRight = '0.75rem';

            const box = document.createElement('label');
            box.className = 'container';
            box.style.setProperty('--legend-color', color);

            const input = document.createElement('input');
            input.type = 'checkbox';           // keep same look as others
            input.id = id;
            input.checked = (dim === key);     // single-select behavior below

            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';
            checkmark.style.setProperty('border-color', color, 'important');
            if (input.checked) checkmark.style.setProperty('background-color', color, 'important');

            input.addEventListener('change', () => {
            // enforce radio behavior: only one “checked”
            if (!input.checked) { input.checked = true; return; }
            onChange(key);
            });

            const text = document.createElement('span');
            text.textContent = label;

            box.appendChild(input);
            box.appendChild(checkmark);
            wrapper.appendChild(box);
            wrapper.appendChild(text);
            containerEl.appendChild(wrapper);
        });
    }


    // ---- Legends ----
    function renderCheckboxLegend(containerEl, chart) {
        containerEl.innerHTML = '';
        chart.data.datasets.forEach((ds, idx) => {
            const id = `${chart.canvas.id}-ds-${idx}`;

            const wrapper = document.createElement('label');
            wrapper.className = 'legend-item';
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '0.5rem';
            wrapper.style.marginRight = '0.75rem';

            const label = document.createElement('label');
            label.className = 'container';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = !ds.hidden;

            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';

            const color = ds.borderColor || COLOR.get(ds._colorKey || ds.label);
            console.log(color, id);
            label.style.setProperty('--legend-color', color);
            checkmark.style.setProperty('border-color', color, 'important');
            if (input.checked) checkmark.style.setProperty('background-color', color, 'important');

            input.addEventListener('change', () => {
                ds.hidden = !input.checked;
                checkmark.style.setProperty('background-color', input.checked ? color : 'transparent', 'important');
                chart.update();
            });

            const text = document.createElement('span');
            text.textContent = ds.label;

            label.appendChild(input);
            label.appendChild(checkmark);
            wrapper.appendChild(label);
            wrapper.appendChild(text);
            containerEl.appendChild(wrapper);
        });
    }

    // ---- Update helpers ----
    function ensurePassRateDatasets(chart) {
        if (!chart?.data) return false;
        if (Array.isArray(chart.data.datasets) && chart.data.datasets.length >= 3) return true;

        const cRate = COLOR.get('Verified Rate');
        const cPass = COLOR.get('Verified Count');
        const cFail = COLOR.get('Unverified Count');

        chart.data.datasets = [
        {
            label: 'Verified Rate', _colorKey: 'Verified Rate', yAxisID: 'y1',
            type: 'line', data: [], tension: 0.3, borderWidth: 2,
            pointRadius: 2, pointHoverRadius: 4, spanGaps: true, showLine: true,
            borderColor: cRate, backgroundColor: COLOR.alpha(cRate, 0.15),
            pointBackgroundColor: cRate, pointBorderColor: cRate, pointBorderWidth: 2,
            fill: false
        },
        {
            label: 'Verified Count', _colorKey: 'Verified Count', yAxisID: 'y2',
            type: 'line', data: [], borderWidth: 1, pointRadius: 0, spanGaps: true,
            borderColor: cPass, backgroundColor: COLOR.alpha(cPass, 0.15),
            fill: false
        },
        {
            label: 'Unverified Count', _colorKey: 'Unverified Count', yAxisID: 'y2',
            type: 'line', data: [], borderWidth: 1, pointRadius: 0, spanGaps: true,
            borderColor: cFail, backgroundColor: COLOR.alpha(cFail, 0.15),
            fill: false
        }
        ];
        return true;
    }

    function updatePassRateLine(chart, payload, passRateLegendEl) {
        if (!chart || !chart.data) return;
        ensurePassRateDatasets(chart);

        const labels    = (payload.labels || []).slice();
        const passRate  = (payload.pass_rate  || []).map(v => v == null ? null : +v);
        const passCount = (payload.pass_count || []).map(v => v == null ? null : +v);
        const failCount = (payload.fail_count || []).map(v => v == null ? null : +v);

        chart.data.labels = labels;

        const dsRate = chart.data.datasets[0];
        const dsPass = chart.data.datasets[1];
        const dsFail = chart.data.datasets[2];

        dsRate.data = passRate;
        dsPass.data = passCount;
        dsFail.data = failCount;

        const finiteRate = passRate.filter(Number.isFinite).length;
        const single = labels.length <= 1 || finiteRate <= 1;

        // rate line style
        dsRate.type = 'line';
        dsRate.showLine = !single;
        dsRate.pointRadius = single ? 8 : 2;
        dsRate.pointHoverRadius = single ? 10 : 4;
        dsRate.spanGaps = true;

        // counts style
        dsPass.spanGaps = true;
        dsFail.spanGaps = true;

        if (single) {
        dsPass.type = 'bar';
        dsFail.type = 'bar';
        const cPass = dsPass.borderColor || COLOR.get('Verified Count');
        const cFail = dsFail.borderColor || COLOR.get('Unverified Count');
        dsPass.backgroundColor = COLOR.alpha(cPass, 0.65);
        dsFail.backgroundColor = COLOR.alpha(cFail, 0.65);
        } else {
        dsPass.type = 'line';
        dsFail.type = 'line';
        dsPass.pointRadius = 0;
        dsFail.pointRadius = 0;
        }

        // Ensure at least one dataset visible
        if ([dsRate.hidden, dsPass.hidden, dsFail.hidden].every(Boolean)) dsRate.hidden = false;

        chart.options.scales.y2.beginAtZero = true;

        chart.update();
        renderCheckboxLegend(passRateLegendEl, chart);
    }

    // ---- Orchestrate ----
    async function primeFiltersFromServerDefaults(data) {
        if (!currentRange.start || !currentRange.end) {
        currentRange.start = data.start;
        currentRange.end   = data.end;
        filterUIs.forEach(ui => ui.setRange(data.start, data.end, {silent:true}));
        }
        if (data.bucket && data.bucket !== currentBucket) {
        currentBucket = data.bucket;
        filterUIs.forEach(ui => ui.setBucket(currentBucket, {silent:true}));
        }
    }

    window.refreshCharts = async function() {
        try {
            const data = await fetchData();
            if (!data) return;

            await primeFiltersFromServerDefaults(data);
            window.__lastAnalyticsData__ = data;

            const passRateLegendEl     = document.getElementById('passRateLegend');
            const failReasonsLegendEl  = document.getElementById('failReasonsLegend');

            updatePassRateLine(charts.passRate, data, passRateLegendEl);
            updateFailuresByStepGrouped(charts.failStep, data, document.getElementById('failuresByStepLegend'));
            updateFailureReasonsComposition(charts.reasonComp, data, document.getElementById('failureReasonsCompositionLegend'));
            updateFailureReasonsByStepCategories(charts.reasonByStepCats, data, document.getElementById('failureReasonsByStepCategoriesLegend'),{ mode: 'percent' });
            updateSimilarityTrend(charts.simTrend, data, document.getElementById('similarityLegend'));
            updatePlatformDonut(charts.platform, data, document.getElementById('platformLegend'), { dim: platformDim  });
            platformDonutHeader.innerText = platformDim === 'device' ? 'Device Failure Summary' : 'Browser Failure Summary'; 
            setActiveButton(platformDim === 'device' ? deviceBtn : browserBtn);
        } catch (e) {
            console.error(e);
        }
    };

    // ---- Initialize filter UIs (both navbars) ----
    document.querySelectorAll('.js-chart-filters').forEach(initChartFilters);

    // ---- Init charts ----
    charts.passRate    = makePassRateLine(document.getElementById('passRateLine').getContext('2d'));
    charts.failStep = makeFailuresByStepGrouped(document.getElementById('failuresByStep').getContext('2d'));
    charts.reasonComp = makeFailureReasonsComposition(document.getElementById('failureReasonsComposition').getContext('2d'));
    charts.reasonByStepCats = makeFailureReasonsByStepCategories(document.getElementById('failureReasonsByStepCategories').getContext('2d'),{ mode: 'percent' });
    charts.simTrend = makeSimilarityTrend(document.getElementById('similarityTrend').getContext('2d'));
    charts.platform = makePlatformDonut(document.getElementById('platformDonut').getContext('2d'));

    const deviceBtn  = document.getElementById('platformDimDevice');
    const browserBtn = document.getElementById('platformDimBrowser');
    const platformDonutHeader = document.getElementById('platformDonutHeader');

    function setActiveButton(activeBtn) {
        [deviceBtn, browserBtn].forEach(btn => btn?.classList.remove('active-label'));
        activeBtn?.classList.add('active-label');
    }

    deviceBtn?.addEventListener('click', () => {
        platformDim = 'device';
        updatePlatformDonut(charts.platform, window.__lastAnalyticsData__, document.getElementById('platformLegend'), { dim: platformDim });
        setActiveButton(deviceBtn);
        platformDonutHeader.innerText = 'Device Failure Summary';
    });

    browserBtn?.addEventListener('click', () => {
        platformDim = 'browser';
        updatePlatformDonut(charts.platform, window.__lastAnalyticsData__, document.getElementById('platformLegend'), { dim: platformDim });
        setActiveButton(browserBtn);
        platformDonutHeader.innerText = 'Browser Failure Summary';
    });


    // ---- First load ----
    refreshCharts();
});
