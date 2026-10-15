const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 16;

const canvas = document.querySelector('#canvas');
const ctx    = canvas.getContext('2d');

let currentSteps = [];            
let lastBasePoint = { x: 0, y: 0 }; 

function putPixel(x, y, color = '#4d6bfe') {
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

function plot8(cx, cy, x, y, color = '#4d6bfe') {
  putPixel(cx + x, cy + y, color);
  putPixel(cx + y, cy + x, color);
  putPixel(cx - x, cy + y, color);
  putPixel(cx - y, cy + x, color);
  putPixel(cx + x, cy - y, color);
  putPixel(cx + y, cy - x, color);
  putPixel(cx - x, cy - y, color);
  putPixel(cx - y, cy - x, color);
}

function circleMidpoint(cx, cy, r) {
  let x = 0;
  let y = r;
  let d = 1 - r;
  let step = 0;

  while (x <= y) {
    plot8(cx, cy, x, y);

    const before = d;
    let choice = '';

    if (d < 0) {
      d += 2 * x + 3;
      choice = 'E';
    } else {
      d += 2 * (x - y) + 5;
      y -= 1;
      choice = 'SE';
    }

    currentSteps.push({
      step,
      x,
      y: choice === 'SE' ? y + 1 : y,   
      dBefore: before,
      choice,
      dAfter: d,
    });

    lastBasePoint = { x, y: choice === 'SE' ? y + 1 : y };

    x += 1;
    step += 1;
  }
}

function circleFormula(cx, cy, r, color = '#e53935') {
  for (let x = 0; x <= r; x += 1) {
    const y = Math.round(Math.sqrt(r * r - x * x));
    plot8(cx, cy, x, y, color);
  }
}

const stepsTableBody = document.querySelector('#steps-table tbody');

function renderSteps() {
  stepsTableBody.innerHTML = '';
  for (const row of currentSteps) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.step}</td>
      <td>${row.x}</td>
      <td>${row.y}</td>
      <td>${row.dBefore}</td>
      <td>${row.choice}</td>
      <td>${row.dAfter}</td>
    `;
    stepsTableBody.appendChild(tr);
  }
}

function highlightSymmetry(cx, cy) {
  const { x, y } = lastBasePoint;
  plot8(cx, cy, x, y, '#e53935');
}

const form = document.querySelector('#controls');
const cxInput = document.querySelector('#cx');
const cyInput = document.querySelector('#cy');
const rInput  = document.querySelector('#r');
const clearBtn = document.querySelector('#clear-btn');
const symmetryToggle = document.querySelector('#symmetry-toggle');
const formulaToggle  = document.querySelector('#formula-toggle');
const messageEl = document.querySelector('#message');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  messageEl.textContent = '';

  const cx = parseInt(cxInput.value, 10);
  const cy = parseInt(cyInput.value, 10);
  const r  = parseInt(rInput.value, 10);

  if ([cx, cy].some((v) => Number.isNaN(v) || v < 0 || v > GRID_W || v > GRID_H)) {
    messageEl.textContent = `Центр должен быть в пределах 0..${GRID_W} по x и 0..${GRID_H} по y.`;
    return;
  }

  if (Number.isNaN(r) || r <= 0) {
    messageEl.textContent = 'Радиус должен быть целым положительным числом.';
    return;
  }

  if (cx - r < 0 || cx + r > GRID_W || cy - r < 0 || cy + r > GRID_H) {
    messageEl.textContent = 'Окружность выходит за границы логической области.';
    return;
  }

  currentSteps = [];
  lastBasePoint = { x: 0, y: 0 };

  clearCanvas();

  circleMidpoint(cx, cy, r);

  if (formulaToggle.checked) {
    circleFormula(cx, cy, r);
  }

  if (symmetryToggle.checked) {
    highlightSymmetry(cx, cy);
  }

  renderSteps();
});

clearBtn.addEventListener('click', () => {
  currentSteps = [];
  lastBasePoint = { x: 0, y: 0 };
  messageEl.textContent = '';
  clearCanvas();
  renderSteps();
});

const experimentBtn = document.querySelector('#experiment-btn');
const experimentOutput = document.querySelector('#experiment-output');

function midpointNoPaint(cx, cy, r) {
  let x = 0;
  let y = r;
  let d = 1 - r;
  let safety = 0;

  while (x <= y) {
    if (d < 0) {
      d += 2 * x + 3;
    } else {
      d += 2 * (x - y) + 5;
      y -= 1;
    }
    x += 1;
    safety += 1;
    if (safety > 100000) break;
  }
}

function formulaNoPaint(cx, cy, r) {
  for (let x = 0; x <= r; x += 1) {
    Math.round(Math.sqrt(r * r - x * x));
  }
}

function runExperiment() {
  const COUNT = 1000;
  const circles = [];

  for (let i = 0; i < COUNT; i += 1) {
    const r = 1 + Math.floor(Math.random() * 12);
    circles.push([20, 15, r]);
  }

  const results = { midpoint: [], formula: [] };

  for (let run = 0; run < 3; run += 1) {
    let start = performance.now();
    for (const [cx, cy, r] of circles) midpointNoPaint(cx, cy, r);
    results.midpoint.push(performance.now() - start);

    start = performance.now();
    for (const [cx, cy, r] of circles) formulaNoPaint(cx, cy, r);
    results.formula.push(performance.now() - start);
  }

  const fmt = (arr) => arr.map((v) => v.toFixed(2) + ' мс').join(', ');

  experimentOutput.textContent =
    `Окружностей: ${COUNT}\n\n` +
    `Средняя точка (3 запуска): ${fmt(results.midpoint)}\n` +
    `Через формулу  (3 запуска): ${fmt(results.formula)}\n\n` +
    `Среднее средняя точка: ${(results.midpoint.reduce((a, b) => a + b, 0) / 3).toFixed(2)} мс\n` +
    `Среднее формула:       ${(results.formula.reduce((a, b) => a + b, 0) / 3).toFixed(2)} мс\n\n` +
    `Вывод делайте по нескольким запускам, а не по одному.`;
}

experimentBtn.addEventListener('click', runExperiment);

clearCanvas();
renderSteps();