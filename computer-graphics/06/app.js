const GRID_W = 40;
const GRID_H = 30;
const SCALE = 16;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const xminInput = document.querySelector('#xmin');
const yminInput = document.querySelector('#ymin');
const xmaxInput = document.querySelector('#xmax');
const ymaxInput = document.querySelector('#ymax');

const loadPolyBtn = document.querySelector('#load-poly-btn');
const clearBtn = document.querySelector('#clear-btn');
const closePolyBtn = document.querySelector('#close-poly-btn');
const stepSelector = document.querySelector('#step-selector');
const stepSelect = document.querySelector('#step-select');
const tableBody = document.querySelector('#steps-table tbody');

let vertices = [];
let isClosed = false;
let clipStages = []; 

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(x * SCALE + 0.5, 0); ctx.lineTo(x * SCALE + 0.5, GRID_H * SCALE); ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * SCALE + 0.5); ctx.lineTo(GRID_W * SCALE, y * SCALE + 0.5); ctx.stroke();
  }
}

function drawPolygon(points, color, lineWidth = 2, isDashed = false) {
  if (points.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (isDashed) ctx.setLineDash([5, 5]);
  else ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(points[0].x * SCALE, points[0].y * SCALE);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * SCALE, points[i].y * SCALE);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWindow(rect) {
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.xmin * SCALE, rect.ymin * SCALE, (rect.xmax - rect.xmin) * SCALE, (rect.ymax - rect.ymin) * SCALE);
}

function intersectVertical(a, b, xBoundary) {
  const t = (xBoundary - a.x) / (b.x - a.x);
  return { x: xBoundary, y: a.y + t * (b.y - a.y) };
}

function intersectHorizontal(a, b, yBoundary) {
  const t = (yBoundary - a.y) / (b.y - a.y);
  return { x: a.x + t * (b.x - a.x), y: yBoundary };
}

function clipAgainstBoundary(polygon, isInside, getIntersection) {
  const output = [];
  if (polygon.length === 0) return output;

  let s = polygon[polygon.length - 1];

  for (const p of polygon) {
    const sInside = isInside(s);
    const pInside = isInside(p);

    if (sInside && pInside) {
      output.push(p);
    } else if (sInside && !pInside) {
      output.push(getIntersection(s, p));
    } else if (!sInside && pInside) {
      output.push(getIntersection(s, p));
      output.push(p);
    }
    s = p;
  }
  return output;
}

function clipPolygon(polygon, rect) {
  let result = polygon;

  const stages = [
    { name: 'Исходный', poly: [...result] }
  ];

  result = clipAgainstBoundary(result, p => p.x >= rect.xmin, (a, b) => intersectVertical(a, b, rect.xmin));
  stages.push({ name: 'После LEFT', poly: [...result] });

  result = clipAgainstBoundary(result, p => p.x <= rect.xmax, (a, b) => intersectVertical(a, b, rect.xmax));
  stages.push({ name: 'После RIGHT', poly: [...result] });

  result = clipAgainstBoundary(result, p => p.y >= rect.ymin, (a, b) => intersectHorizontal(a, b, rect.ymin));
  stages.push({ name: 'После TOP', poly: [...result] });

  result = clipAgainstBoundary(result, p => p.y <= rect.ymax, (a, b) => intersectHorizontal(a, b, rect.ymax));
  stages.push({ name: 'После BOTTOM', poly: [...result] });

  return stages;
}

function renderTable(stages) {
  tableBody.innerHTML = '';
  for (const stage of stages) {
    const tr = document.createElement('tr');
    const coords = stage.poly.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(', ');
    tr.innerHTML = `
      <td>${stage.name}</td>
      <td>${stage.poly.length}</td>
      <td>${coords || '—'}</td>
    `;
    tableBody.appendChild(tr);
  }
}

function render() {
  drawGrid();

  const rect = {
    xmin: Number(xminInput.value),
    ymin: Number(yminInput.value),
    xmax: Number(xmaxInput.value),
    ymax: Number(ymaxInput.value)
  };

  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) return;
  drawWindow(rect);

  if (!isClosed) {
    drawPolygon(vertices, '#0d0d0d', 2);
    return;
  }

  const currentStageIdx = parseInt(stepSelect.value, 10);
  const currentStage = clipStages[currentStageIdx];

  if (currentStageIdx > 0) {
    drawPolygon(clipStages[0].poly, '#cccccc', 1, true);
  }

  if (currentStage && currentStage.poly.length > 0) {
    drawPolygon(currentStage.poly, '#4d6bfe', 2);
  }

  if (currentStage) {
    ctx.fillStyle = '#e53935';
    for (const p of currentStage.poly) {
      ctx.beginPath();
      ctx.arc(p.x * SCALE, p.y * SCALE, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

canvas.addEventListener('click', (e) => {
  if (isClosed) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / SCALE);
  const y = Math.floor((e.clientY - rect.top) / SCALE);
  
  if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
    vertices.push({ x, y });
    closePolyBtn.disabled = vertices.length < 3;
    render();
  }
});

closePolyBtn.addEventListener('click', () => {
  isClosed = true;
  closePolyBtn.disabled = true;
  
  const rect = {
    xmin: Number(xminInput.value), ymin: Number(yminInput.value),
    xmax: Number(xmaxInput.value), ymax: Number(ymaxInput.value)
  };

  clipStages = clipPolygon(vertices, rect);
  renderTable(clipStages);
  
  stepSelector.hidden = false;
  stepSelect.value = 0;
  render();
});

stepSelect.addEventListener('change', render);

loadPolyBtn.addEventListener('click', () => {
  vertices = [
    { x: 5, y: 15 }, { x: 15, y: 5 }, { x: 25, y: 25 }, { x: 35, y: 15 },
    { x: 25, y: 10 }, { x: 15, y: 20 }
  ];
  isClosed = true;
  closePolyBtn.disabled = true;

  const rect = { xmin: 10, ymin: 8, xmax: 30, ymax: 22 };
  xminInput.value = rect.xmin;
  yminInput.value = rect.ymin;
  xmaxInput.value = rect.xmax;
  ymaxInput.value = rect.ymax;

  clipStages = clipPolygon(vertices, rect);
  renderTable(clipStages);
  
  stepSelector.hidden = false;
  stepSelect.value = 0;
  render();
});

clearBtn.addEventListener('click', () => {
  vertices = [];
  isClosed = false;
  clipStages = [];
  closePolyBtn.disabled = true;
  stepSelector.hidden = true;
  tableBody.innerHTML = '';
  render();
});

render();