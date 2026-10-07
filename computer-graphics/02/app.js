const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 16;

const canvas = document.querySelector('#canvas');
const ctx    = canvas.getContext('2d');

let currentPixels = [];
let currentSteps  = [];

function putPixel(x, y, color = '#4d6bfe') {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
  currentPixels.push({ x, y });
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function drawGrid() {
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;

  for (let x = 0; x <= GRID_W; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * SCALE + 0.5, 0);
    ctx.lineTo(x * SCALE + 0.5, GRID_H * SCALE);
    ctx.stroke();
  }

  for (let y = 0; y <= GRID_H; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * SCALE + 0.5);
    ctx.lineTo(GRID_W * SCALE, y * SCALE + 0.5);
    ctx.stroke();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}

// Алгоритм ЦДА
function lineDDA(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps === 0) {
    putPixel(x1, y1, '#e53935');
    return;
  }

  const xStep = dx / steps;
  const yStep = dy / steps;

  let x = x1;
  let y = y1;

  for (let i = 0; i <= steps; i += 1) {
    putPixel(Math.round(x), Math.round(y));
    x += xStep;
    y += yStep;
  }

  drawCell(x1, y1, '#e53935');
  drawCell(x2, y2, '#2e7d32');
}

// Алгоритм Брезенхема
function lineBresenham(x1, y1, x2, y2) {
  let x = x1;
  let y = y1;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;

  let error = dx - dy;
  let step = 0;

  while (true) {
    putPixel(x, y);

    currentSteps.push({
      step,
      x,
      y,
      error,
      error2: 2 * error,
      dx: 0,
      dy: 0,
    });

    if (x === x2 && y === y2) {
      break;
    }

    const error2 = 2 * error;
    let movedX = false;
    let movedY = false;

    if (error2 > -dy) {
      error -= dy;
      x += sx;
      movedX = true;
    }

    if (error2 < dx) {
      error += dx;
      y += sy;
      movedY = true;
    }

    currentSteps[currentSteps.length - 1].dx = movedX ? 1 : 0;
    currentSteps[currentSteps.length - 1].dy = movedY ? 1 : 0;

    step += 1;
  }

  drawCell(x1, y1, '#e53935');
  drawCell(x2, y2, '#2e7d32');
}

// Вывод списка пикселей 
const pixelsListEl = document.querySelector('#pixels-list');

function renderPixels() {
  pixelsListEl.innerHTML = '';
  for (const { x, y } of currentPixels) {
    const li = document.createElement('li');
    li.textContent = `(${x}, ${y})`;
    pixelsListEl.appendChild(li);
  }
}

// Таблица Брезенхема 
const stepsTableBody = document.querySelector('#steps-table tbody');

function renderSteps() {
  stepsTableBody.innerHTML = '';
  for (const row of currentSteps) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.step}</td>
      <td>${row.x}</td>
      <td>${row.y}</td>
      <td>${row.error}</td>
      <td>${row.error2}</td>
      <td>${row.dx ? '✓' : ''}</td>
      <td>${row.dy ? '✓' : ''}</td>
    `;
    stepsTableBody.appendChild(tr);
  }
}

// Форма 
const form = document.querySelector('#controls');
const x1Input = document.querySelector('#x1');
const y1Input = document.querySelector('#y1');
const x2Input = document.querySelector('#x2');
const y2Input = document.querySelector('#y2');
const algorithmSelect = document.querySelector('#algorithm');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const x1 = parseInt(x1Input.value, 10);
  const y1 = parseInt(y1Input.value, 10);
  const x2 = parseInt(x2Input.value, 10);
  const y2 = parseInt(y2Input.value, 10);
  const algo = algorithmSelect.value;

  const invalid = [x1, y1, x2, y2].some((v) =>
    Number.isNaN(v) || v < 0 || v > GRID_W || v > GRID_H
  );

  if (invalid) {
    alert(`Координаты — целые числа от 0 до ${GRID_W} по x и до ${GRID_H} по y.`);
    return;
  }

  currentPixels = [];
  currentSteps  = [];

  clearCanvas();

  if (algo === 'dda') {
    lineDDA(x1, y1, x2, y2);
    currentSteps = [];
  } else {
    lineBresenham(x1, y1, x2, y2);
  }

  renderPixels();
  renderSteps();
});

// Эксперимент 
const experimentBtn = document.querySelector('#experiment-btn');
const experimentOutput = document.querySelector('#experiment-output');

function bresenhamNoPaint(x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let error = dx - dy;
  let safety = 0;

  while (true) {
    if (x === x2 && y === y2) break;
    const error2 = 2 * error;
    if (error2 > -dy) { error -= dy; x += sx; }
    if (error2 < dx)  { error += dx; y += sy; }
    safety += 1;
    if (safety > 10000) break;
  }
}

function ddaNoPaint(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return;

  const xStep = dx / steps;
  const yStep = dy / steps;

  let x = x1;
  let y = y1;

  for (let i = 0; i <= steps; i += 1) {
    x += xStep;
    y += yStep;
  }
}

function runExperiment() {
  const COUNT = 1000;
  const segments = [];

  for (let i = 0; i < COUNT; i += 1) {
    segments.push([
      Math.floor(Math.random() * GRID_W),
      Math.floor(Math.random() * GRID_H),
      Math.floor(Math.random() * GRID_W),
      Math.floor(Math.random() * GRID_H),
    ]);
  }

  const results = { dda: [], bresenham: [] };

  for (let run = 0; run < 3; run += 1) {
    let start = performance.now();
    for (const [a, b, c, d] of segments) ddaNoPaint(a, b, c, d);
    results.dda.push(performance.now() - start);

    start = performance.now();
    for (const [a, b, c, d] of segments) bresenhamNoPaint(a, b, c, d);
    results.bresenham.push(performance.now() - start);
  }

  const fmt = (arr) => arr.map((v) => v.toFixed(2) + ' мс').join(', ');

  experimentOutput.textContent =
    `Отрезков: ${COUNT}\n\n` +
    `ЦДА       (3 запуска): ${fmt(results.dda)}\n` +
    `Брезенхем (3 запуска): ${fmt(results.bresenham)}\n\n` +
    `Среднее ЦДА:       ${(results.dda.reduce((a, b) => a + b, 0) / 3).toFixed(2)} мс\n` +
    `Среднее Брезенхем: ${(results.bresenham.reduce((a, b) => a + b, 0) / 3).toFixed(2)} мс\n\n` +
    `Вывод делайте по нескольким запускам, а не по одному.`;
}

experimentBtn.addEventListener('click', runExperiment);

clearCanvas();