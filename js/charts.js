// ============================================
// SMART BEEHIVES - Charts (Vanilla Canvas)
// ============================================

const ChartColors = {
  honey:   '#f5a623',
  green:   '#22c55e',
  blue:    '#3b82f6',
  red:     '#ef4444',
  purple:  '#a855f7',
  teal:    '#14b8a6',
  grid:    'rgba(255,255,255,0.06)',
  text:    'rgba(160,160,176,0.8)'
};

// ---- Line Chart ----
function drawLineChart(canvasId, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Resize
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = (options.height || 220) * dpr;
  canvas.style.width  = rect.width + 'px';
  canvas.style.height = (options.height || 220) + 'px';
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = options.height || 220;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Compute min/max across all datasets
  const allVals = datasets.flatMap(d => d.data);
  const minVal  = options.min ?? (Math.min(...allVals) * 0.95);
  const maxVal  = options.max ?? (Math.max(...allVals) * 1.05);
  const range   = maxVal - minVal || 1;

  const toX = i => pad.left + (i / (labels.length - 1)) * chartW;
  const toY = v => pad.top  + chartH - ((v - minVal) / range) * chartH;

  // Grid lines
  const gridLines = 5;
  ctx.strokeStyle = ChartColors.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (i / gridLines) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    const val = maxVal - (i / gridLines) * range;
    ctx.fillStyle = ChartColors.text;
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(options.decimals ?? 1), pad.left - 6, y + 4);
  }

  // X labels
  ctx.fillStyle = ChartColors.text;
  ctx.font = '11px Segoe UI';
  ctx.textAlign = 'center';
  const step = Math.ceil(labels.length / 8);
  labels.forEach((label, i) => {
    if (i % step === 0 || i === labels.length - 1) {
      ctx.fillText(label, toX(i), H - 8);
    }
  });

  // Datasets
  datasets.forEach(ds => {
    const color = ds.color || ChartColors.honey;

    // Fill gradient
    if (ds.fill !== false) {
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '00');
      ctx.beginPath();
      ds.data.forEach((v, i) => {
        i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
      });
      ctx.lineTo(toX(ds.data.length - 1), pad.top + chartH);
      ctx.lineTo(toX(0), pad.top + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ds.data.forEach((v, i) => {
      i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();

    // Dots on last point
    const lastI = ds.data.length - 1;
    ctx.beginPath();
    ctx.arc(toX(lastI), toY(ds.data[lastI]), 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0d1117';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Legend
  if (datasets.length > 1) {
    let lx = pad.left;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color || ChartColors.honey;
      ctx.fillRect(lx, 6, 12, 3);
      ctx.fillStyle = ChartColors.text;
      ctx.font = '11px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label || '', lx + 16, 12);
      lx += ctx.measureText(ds.label || '').width + 36;
    });
  }
}

// ---- Bar Chart ----
function drawBarChart(canvasId, labels, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = (options.height || 200) * dpr;
  canvas.style.width  = rect.width + 'px';
  canvas.style.height = (options.height || 200) + 'px';
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = options.height || 200;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...data) * 1.1 || 1;
  const barW   = (chartW / data.length) * 0.6;
  const gap    = chartW / data.length;

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.strokeStyle = ChartColors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    ctx.fillStyle = ChartColors.text;
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText(((maxVal - (i / 4) * maxVal)).toFixed(options.decimals ?? 0), pad.left - 6, y + 4);
  }

  // Bars
  data.forEach((val, i) => {
    const x = pad.left + i * gap + (gap - barW) / 2;
    const barH = (val / maxVal) * chartH;
    const y = pad.top + chartH - barH;

    const color = Array.isArray(options.colors) ? options.colors[i] : (options.color || ChartColors.honey);
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '60');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = ChartColors.text;
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}

// ---- Donut Chart ----
function drawDonutChart(canvasId, segments, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = options.size || 160;

  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = outerR * 0.65;
  const total  = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    const sweep = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += sweep;
  });

  // Inner circle (hole)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = options.bgColor || '#0d1117';
  ctx.fill();

  // Center text
  if (options.centerText) {
    ctx.fillStyle = '#f0f0f0';
    ctx.font = `bold ${options.centerFontSize || 18}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.centerText, cx, cy - 6);
    if (options.centerSubText) {
      ctx.font = `11px Segoe UI`;
      ctx.fillStyle = ChartColors.text;
      ctx.fillText(options.centerSubText, cx, cy + 12);
    }
  }
}

// ---- Gauge Chart ----
function drawGauge(canvasId, value, max, color, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 100;

  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2, r = 38;
  const startA = Math.PI * 0.75;
  const endA   = Math.PI * 2.25;
  const pct    = Math.min(value / max, 1);

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, endA);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Value arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, startA + pct * (endA - startA));
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center value
  ctx.fillStyle = '#f0f0f0';
  ctx.font = 'bold 16px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, cx, cy - 4);

  ctx.fillStyle = ChartColors.text;
  ctx.font = '10px Segoe UI';
  ctx.fillText(label, cx, cy + 12);
}

// ---- Sparkline ----
function drawSparkline(canvasId, data, color = ChartColors.honey) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 80;
  const H = canvas.offsetHeight || 30;
  const dpr = window.devicePixelRatio || 1;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toX = i => (i / (data.length - 1)) * W;
  const toY = v => H - ((v - min) / range) * (H - 4) - 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  data.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
  ctx.stroke();
}

// ---- Resize handler ----
window.addEventListener('resize', debounce(() => {
  if (typeof renderDashboardCharts === 'function') renderDashboardCharts();
  if (typeof renderHiveCharts === 'function') renderHiveCharts();
}, 300));

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ---- Generate demo time-series data ----
function generateTimeSeries(points, base, variance, trend = 0) {
  return Array.from({ length: points }, (_, i) =>
    +(base + trend * i + (Math.random() - 0.5) * variance).toFixed(1)
  );
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

function getLast6Months() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString('en-US', { month: 'short' });
  });
}

function getLast24Hours() {
  return Array.from({ length: 24 }, (_, i) => {
    const h = (new Date().getHours() - 23 + i + 24) % 24;
    return h + ':00';
  });
}
