// Настройки логической сетки и масштаба
const GRID_W = 40;   // логическая ширина (в клетках)
const GRID_H = 30;   // логическая высота (в клетках)
const SCALE = 16;    // сколько экранных пикселей приходится на 1 логический

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// Вывод одного логического пикселя
function putPixel(x, y, color = '#0d0d0d') {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

// Сетка
function drawGrid() {
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;

  // Вертикальные линии
  for (let x = 0; x <= GRID_W; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * SCALE + 0.5, 0);
    ctx.lineTo(x * SCALE + 0.5, GRID_H * SCALE);
    ctx.stroke();
  }

  // Горизонтальные линии
  for (let y = 0; y <= GRID_H; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * SCALE + 0.5);
    ctx.lineTo(GRID_W * SCALE, y * SCALE + 0.5);
    ctx.stroke();
  }
}

// Очистка canvas и перерисовка сетки
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}

// Алгоритм ЦДА
function lineDDA(x1, y1, x2, y2, tableRows = null) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  // Особый случай: начало и конец совпадают
  if (steps === 0) {
    putPixel(x1, y1, '#e53935');
    if (tableRows) {
      tableRows.push([0, x1.toFixed(2), y1.toFixed(2), x1, y1]);
    }
    return;
  }

  const xStep = dx / steps;
  const yStep = dy / steps;

  let x = x1;
  let y = y1;

  for (let i = 0; i <= steps; i += 1) {
    const px = Math.round(x);
    const py = Math.round(y);

    putPixel(px, py, '#4d6bfe');

    if (tableRows) {
      tableRows.push([i, x.toFixed(2), y.toFixed(2), px, py]);
    }

    x += xStep;
    y += yStep;
  }

  // Отметим концы другим цветом
  putPixel(x1, y1, '#e53935');  // начало — красный
  putPixel(x2, y2, '#2e7d32');  // конец — зелёный
}

// Работа с таблицей шагов
const tableBody = document.querySelector('#steps-table tbody');

function clearTable() {
  tableBody.innerHTML = '';
}

function renderTable(rows) {
  clearTable();
  for (const [i, xRaw, yRaw, px, py] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i}</td>
      <td>${xRaw}</td>
      <td>${yRaw}</td>
      <td>${px}</td>
      <td>${py}</td>
    `;
    tableBody.appendChild(tr);
  }
}

// Обработка формы: строим новый отрезок
const form = document.querySelector('#controls');
const x1Input = document.querySelector('#x1');
const y1Input = document.querySelector('#y1');
const x2Input = document.querySelector('#x2');
const y2Input = document.querySelector('#y2');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const x1 = parseInt(x1Input.value, 10);
  const y1 = parseInt(y1Input.value, 10);
  const x2 = parseInt(x2Input.value, 10);
  const y2 = parseInt(y2Input.value, 10);

  // Валидация на попадание в сетку
  if ([x1, y1, x2, y2].some((v) => Number.isNaN(v) || v < 0 || v > GRID_W || v > GRID_H)) {
    alert(`Координаты должны быть целыми числами от 0 до ${GRID_W} по x и до ${GRID_H} по y.`);
    return;
  }

  clearCanvas();

  // Собираем строки таблицы только для этого отрезка
  const rows = [];
  lineDDA(x1, y1, x2, y2, rows);

  renderTable(rows);
});

// Первый запуск: рисуем сетку и пустую таблицу
clearCanvas();