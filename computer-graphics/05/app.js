const GRID_W = 40;
const GRID_H = 30;
const SCALE = 16;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const EMPTY = 0;
const BORDER = 1;
const FILL = 2;
const CURRENT_STEP = 3;

let grid = [];
let vertices = [];
let isClosed = false;

let floodSteps = [];
const closePolyBtn = document.querySelector('#close-poly-btn');
const clearBtn = document.querySelector('#clear-btn');
const scanlineBtn = document.querySelector('#scanline-btn');
const compareBtn = document.querySelector('#compare-btn');
const stepControls = document.querySelector('#step-controls');
const stepSlider = document.querySelector('#step-slider');
const stepLabel = document.querySelector('#step-label');
const vertexCount = document.querySelector('#vertex-count');
const scanlineInfo = document.querySelector('#scanline-info');
const tableBody = document.querySelector('#steps-table tbody');
const compareOutput = document.querySelector('#compare-output');

function initGrid() {
  grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(EMPTY));
}

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

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const state = grid[y][x];
      if (state === EMPTY) continue;
      
      let color = '#000';
      if (state === BORDER) color = '#0d0d0d';
      if (state === FILL) color = '#4d6bfe';
      if (state === CURRENT_STEP) color = '#e53935';

      ctx.fillStyle = color;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }

  ctx.fillStyle = '#2e7d32';
  for (const v of vertices) {
    ctx.beginPath();
    ctx.arc(v.x * SCALE + SCALE/2, v.y * SCALE + SCALE/2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLineBresenham(x1, y1, x2, y2) {
  let x = x1, y = y1;
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let error = dx - dy;

  while (true) {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) grid[y][x] = BORDER;
    if (x === x2 && y === y2) break;
    const e2 = 2 * error;
    if (e2 > -dy) { error -= dy; x += sx; }
    if (e2 < dx) { error += dx; y += sy; }
  }
}

function buildBorder() {
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    drawLineBresenham(a.x, a.y, b.x, b.y);
  }
}

function floodFill(startX, startY) {
  if (grid[startY][startX] !== EMPTY) return;

  floodSteps = [];
  const queue = [{ x: startX, y: startY }];
  const visited = new Set();
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    if (grid[y][x] !== EMPTY) continue;
    
    floodSteps.push({ x, y });
    
    const neighbors = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
    for (const n of neighbors) {
      if (n.x >= 0 && n.x < GRID_W && n.y >= 0 && n.y < GRID_H) {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key) && grid[n.y][n.x] === EMPTY) {
          visited.add(key);
          queue.push(n);
        }
      }
    }
  }

  stepControls.hidden = false;
  stepSlider.max = Math.max(0, floodSteps.length - 1);
  stepSlider.value = 0;
  updateFloodVisual(0);
}

function updateFloodVisual(step) {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (grid[y][x] === FILL || grid[y][x] === CURRENT_STEP) grid[y][x] = EMPTY;
    }
  }

  for (let i = 0; i < step; i++) {
    const p = floodSteps[i];
    grid[p.y][p.x] = FILL;
  }

  if (step < floodSteps.length) {
    const p = floodSteps[step];
    grid[p.y][p.x] = CURRENT_STEP;
  }

  stepLabel.textContent = `${step} / ${floodSteps.length > 0 ? floodSteps.length - 1 : 0}`;
  drawGrid();
}

function scanlineFill(isVisual = true) {
  if (isVisual) tableBody.innerHTML = '';
  const rows = [];
  let fillCount = 0;

  for (let y = 0; y < GRID_H; y++) {
    const xs = [];

    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];

      if (a.y === b.y) continue;

      const yMin = Math.min(a.y, b.y);
      const yMax = Math.max(a.y, b.y);

      if (y < yMin || y >= yMax) continue;

      const x = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
      xs.push(x);
    }

    if (xs.length > 0) {
      xs.sort((a, b) => a - b);
      const intervals = [];
      
      for (let i = 0; i < xs.length; i += 2) {
        if (i + 1 >= xs.length) break;
        const xStart = Math.ceil(xs[i]);
        const xEnd = Math.floor(xs[i + 1]);

        if (xStart <= xEnd) {
          intervals.push(`${xStart}..${xEnd}`);
          for (let x = xStart; x <= xEnd; x++) {
            if (grid[y][x] === EMPTY) {
              if (isVisual) grid[y][x] = FILL;
              fillCount++;
            }
          }
        }
      }

      if (isVisual) {
        const xsStr = xs.map(v => v.toFixed(1)).join(', ');
        rows.push({ y, xsStr, intStr: intervals.length ? intervals.join(', ') : '—' });
      }
    }
  }

  if (isVisual) {
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.y}</td><td>${r.xsStr}</td><td>${r.intStr}</td>`;
      tableBody.appendChild(tr);
    }
    scanlineInfo.textContent = `Заполнено строк: ${rows.length}`;
    drawGrid();
  }

  return fillCount;
}

compareBtn.addEventListener('click', () => {
  if (vertices.length < 3) return;

  const tempGrid = grid.map(row => [...row]);
  
  let startX = -1, startY = -1;
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      if (grid[y][x] === EMPTY) {
        startX = x; startY = y; break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) {
    compareOutput.textContent = "Нет свободного места для старта.";
    return;
  }

  const t0 = performance.now();
  for (let i = 0; i < 50; i++) {
    floodFill(startX, startY);
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (grid[y][x] === FILL || grid[y][x] === CURRENT_STEP) grid[y][x] = EMPTY;
  }
  const t1 = performance.now();

  let floodPixels = floodSteps.length;
  stepControls.hidden = true;

  initGrid();
  buildBorder();

  const t2 = performance.now();
  let scanPixels = 0;
  for (let i = 0; i < 50; i++) {
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (grid[y][x] === FILL) grid[y][x] = EMPTY;
    scanPixels = scanlineFill(false);
  }
  const t3 = performance.now();

  scanlineFill(true);

  compareOutput.textContent = 
    `Метод         | Пикселей | Время (50 запусков)\n` +
    `---------------------------------------------\n` +
    `Flood Fill    | ${floodPixels.toString().padEnd(8)} | ${(t1 - t0).toFixed(2)} мс\n` +
    `Scanline      | ${scanPixels.toString().padEnd(8)} | ${(t3 - t2).toFixed(2)} мс\n\n` +
    `* Flood Fill обошел ${floodPixels} узлов (включая пустые снаружи).\n` +
    `* Scanline закрасил строго внутренние пиксели (${scanPixels} шт).`;
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / SCALE);
  const y = Math.floor((e.clientY - rect.top) / SCALE);
  
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;

  if (isClosed) {
    floodFill(x, y);
  } else {
    const last = vertices[vertices.length - 1];
    if (!last || last.x !== x || last.y !== y) {
      vertices.push({ x, y });
      vertexCount.textContent = vertices.length;
      closePolyBtn.disabled = vertices.length < 3;
      drawGrid();
    }
  }
});

closePolyBtn.addEventListener('click', () => {
  isClosed = true;
  buildBorder();
  scanlineBtn.disabled = false;
  compareBtn.disabled = false;
  closePolyBtn.disabled = true;
  drawGrid();
});

scanlineBtn.addEventListener('click', () => {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (grid[y][x] === FILL || grid[y][x] === CURRENT_STEP) grid[y][x] = EMPTY;
    }
  }
  stepControls.hidden = true;
  scanlineFill(true);
});

stepSlider.addEventListener('input', (e) => updateFloodVisual(parseInt(e.target.value)));

clearBtn.addEventListener('click', () => {
  vertices = [];
  isClosed = false;
  floodSteps = [];
  initGrid();
  vertexCount.textContent = '0';
  closePolyBtn.disabled = true;
  scanlineBtn.disabled = true;
  compareBtn.disabled = true;
  stepControls.hidden = true;
  tableBody.innerHTML = '';
  scanlineInfo.textContent = 'Постройте контур и нажмите "Scanline Fill".';
  compareOutput.textContent = 'Сначала постройте контур.';
  drawGrid();
});

initGrid();
drawGrid();