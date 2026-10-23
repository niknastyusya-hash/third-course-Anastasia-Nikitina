const GRID_W = 40;
const GRID_H = 30;
const SCALE = 16;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const INSIDE = 0;
const LEFT   = 1;
const RIGHT  = 2;
const BOTTOM = 4;
const TOP    = 8;

const xminInput = document.querySelector('#xmin');
const yminInput = document.querySelector('#ymin');
const xmaxInput = document.querySelector('#xmax');
const ymaxInput = document.querySelector('#ymax');
const x1Input = document.querySelector('#x1');
const y1Input = document.querySelector('#y1');
const x2Input = document.querySelector('#x2');
const y2Input = document.querySelector('#y2');

const polylineToggle = document.querySelector('#polyline-toggle');
const singleLineFields = document.querySelector('#single-line-fields');
const polylineFields = document.querySelector('#polyline-fields');
const polylineInput = document.querySelector('#polyline-input');

const codesInfo = document.querySelector('#codes-info');
const resultInfo = document.querySelector('#result-info');
const tableBody = document.querySelector('#steps-table tbody');

polylineToggle.addEventListener('change', (e) => {
  const isPoly = e.target.checked;
  singleLineFields.hidden = isPoly;
  polylineFields.hidden = !isPoly;
});

function drawGrid() {
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(x * SCALE + 0.5, 0); ctx.lineTo(x * SCALE + 0.5, GRID_H * SCALE); ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * SCALE + 0.5); ctx.lineTo(GRID_W * SCALE, y * SCALE + 0.5); ctx.stroke();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}

function drawWindow(rect, color = '#2e7d32') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.xmin * SCALE, rect.ymin * SCALE, (rect.xmax - rect.xmin) * SCALE, (rect.ymax - rect.ymin) * SCALE);
}

function drawLine(x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1 * SCALE, y1 * SCALE);
  ctx.lineTo(x2 * SCALE, y2 * SCALE);
  ctx.stroke();
}

function getCode(x, y, rect) {
  let code = INSIDE;
  if (x < rect.xmin) code |= LEFT;
  else if (x > rect.xmax) code |= RIGHT;
  if (y < rect.ymin) code |= TOP;
  else if (y > rect.ymax) code |= BOTTOM;
  return code;
}

function toBinary(code) {
  return code.toString(2).padStart(4, '0');
}

function clipLine(x1, y1, x2, y2, rect) {
  let code1 = getCode(x1, y1, rect);
  let code2 = getCode(x2, y2, rect);
  let step = 0;
  let accepted = false;
  const logSteps = [];

  logSteps.push({
    step: step++, A: `${x1.toFixed(1)}, ${y1.toFixed(1)}`, codeA: toBinary(code1),
    B: `${x2.toFixed(1)}, ${y2.toFixed(1)}`, codeB: toBinary(code2), action: 'Начало'
  });

  while (true) {
    if ((code1 | code2) === 0) {
      accepted = true;
      logSteps.push({ step: step++, A: '', codeA: '', B: '', codeB: '', action: 'ACCEPT (внутри)' });
      break;
    }
    if ((code1 & code2) !== 0) {
      logSteps.push({ step: step++, A: '', codeA: '', B: '', codeB: '', action: 'REJECT (снаружи)' });
      break;
    }

    const codeOut = code1 !== 0 ? code1 : code2;
    let x, y, actionText = '';

    if (codeOut & TOP) {
      const t = (rect.ymin - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1); y = rect.ymin; actionText = 'Пересечение TOP';
    } else if (codeOut & BOTTOM) {
      const t = (rect.ymax - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1); y = rect.ymax; actionText = 'Пересечение BOTTOM';
    } else if (codeOut & RIGHT) {
      const t = (rect.xmax - x1) / (x2 - x1);
      x = rect.xmax; y = y1 + t * (y2 - y1); actionText = 'Пересечение RIGHT';
    } else {
      const t = (rect.xmin - x1) / (x2 - x1);
      x = rect.xmin; y = y1 + t * (y2 - y1); actionText = 'Пересечение LEFT';
    }

    if (codeOut === code1) {
      x1 = x; y1 = y; code1 = getCode(x1, y1, rect);
    } else {
      x2 = x; y2 = y; code2 = getCode(x2, y2, rect);
    }

    logSteps.push({
      step: step++, A: `${x1.toFixed(1)}, ${y1.toFixed(1)}`, codeA: toBinary(code1),
      B: `${x2.toFixed(1)}, ${y2.toFixed(1)}`, codeB: toBinary(code2), action: actionText
    });
  }

  return { accepted, clipped: accepted ? { x1, y1, x2, y2 } : null, logSteps };
}

function appendToTable(steps, segmentTitle = null) {
  if (segmentTitle) {
    const trDivider = document.createElement('tr');
    trDivider.className = 'segment-divider';
    trDivider.innerHTML = `<td colspan="6">${segmentTitle}</td>`;
    tableBody.appendChild(trDivider);
  }

  steps.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.step}</td>
      <td>${s.A}</td>
      <td>${s.codeA}</td>
      <td>${s.B}</td>
      <td>${s.codeB}</td>
      <td><strong>${s.action}</strong></td>
    `;
    tableBody.appendChild(tr);
  });
}

document.querySelector('#build-btn').addEventListener('click', () => {
  clearCanvas();

  const rect = {
    xmin: parseInt(xminInput.value, 10),
    ymin: parseInt(yminInput.value, 10),
    xmax: parseInt(xmaxInput.value, 10),
    ymax: parseInt(ymaxInput.value, 10)
  };

  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) {
    alert('Некорректные границы окна: xmin должен быть < xmax, ymin < ymax.');
    return;
  }

  drawWindow(rect);
  tableBody.innerHTML = '';
  codesInfo.innerHTML = '';
  resultInfo.textContent = '';

  const isPolyline = polylineToggle.checked;

  if (!isPolyline) {
    const x1 = parseFloat(x1Input.value);
    const y1 = parseFloat(y1Input.value);
    const x2 = parseFloat(x2Input.value);
    const y2 = parseFloat(y2Input.value);

    drawLine(x1, y1, x2, y2, '#cccccc', 2);

    const c1 = toBinary(getCode(x1, y1, rect));
    const c2 = toBinary(getCode(x2, y2, rect));
    codesInfo.innerHTML = `<div>A: ${c1}</div><div>B: ${c2}</div>`;

    const res = clipLine(x1, y1, x2, y2, rect);
    
    if (res.clipped) {
      drawLine(res.clipped.x1, res.clipped.y1, res.clipped.x2, res.clipped.y2, '#4d6bfe', 3);
      resultInfo.textContent = 'Результат: отсечён и нарисован.';
    } else {
      resultInfo.textContent = 'Результат: полностью отброшен (снаружи).';
    }
    
    appendToTable(res.logSteps);

  } else {
    const text = polylineInput.value.trim();
    const lines = text.split('\n');
    const points = [];

    for (const line of lines) {
      const parts = line.split(/[, ]+/); 
      if (parts.length >= 2) {
        const px = parseFloat(parts[0]);
        const py = parseFloat(parts[1]);
        if (!isNaN(px) && !isNaN(py)) {
          points.push({ x: px, y: py });
        }
      }
    }

    if (points.length < 2) {
      alert('Введите минимум 2 точки (каждая с новой строки в формате "x, y").');
      return;
    }

    let acceptedCount = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      drawLine(p1.x, p1.y, p2.x, p2.y, '#cccccc', 2);

      const c1 = toBinary(getCode(p1.x, p1.y, rect));
      const c2 = toBinary(getCode(p2.x, p2.y, rect));
      
      const segTitle = `Сегмент ${i + 1}: (${p1.x},${p1.y}) -> (${p2.x},${p2.y})`;
      
      const pEl = document.createElement('div');
      pEl.innerHTML = `<strong>${segTitle}:</strong> A: ${c1}, B: ${c2}`;
      codesInfo.appendChild(pEl);

      const res = clipLine(p1.x, p1.y, p2.x, p2.y, rect);

      if (res.clipped) {
        drawLine(res.clipped.x1, res.clipped.y1, res.clipped.x2, res.clipped.y2, '#4d6bfe', 3);
        acceptedCount++;
      }

      appendToTable(res.logSteps, segTitle);
    }

    resultInfo.textContent = `Итог ломаной: обработано ${points.length - 1} сегментов. Видимых отрезков: ${acceptedCount}.`;
  }
});

document.querySelector('#clear-btn').addEventListener('click', () => {
  clearCanvas();
  tableBody.innerHTML = '';
  codesInfo.innerHTML = '';
  resultInfo.textContent = '';
});

document.querySelector('#experiment-btn').addEventListener('click', () => {
  const rect = {
    xmin: parseInt(xminInput.value, 10),
    ymin: parseInt(yminInput.value, 10),
    xmax: parseInt(xmaxInput.value, 10),
    ymax: parseInt(ymaxInput.value, 10)
  };

  let acceptedWhole = 0;
  let clippedCount = 0;
  let rejected = 0;

  for (let i = 0; i < 100; i++) {
    const rx1 = Math.floor(Math.random() * GRID_W);
    const ry1 = Math.floor(Math.random() * GRID_H);
    const rx2 = Math.floor(Math.random() * GRID_W);
    const ry2 = Math.floor(Math.random() * GRID_H);

    const c1 = getCode(rx1, ry1, rect);
    const c2 = getCode(rx2, ry2, rect);

    if ((c1 | c2) === 0) {
      acceptedWhole++;
    } else if ((c1 & c2) !== 0) {
      rejected++;
    } else {
      const res = clipLine(rx1, ry1, rx2, ry2, rect);
      if (res.accepted) clippedCount++;
      else rejected++;
    }
  }

  document.querySelector('#experiment-output').innerHTML = `
    <strong>Результаты 100 случайных отрезков:</strong><br>
    ✅ Принято без изменений (внутри): <strong>${acceptedWhole}</strong><br>
    ✂️ Отсечено (частично видимы): <strong>${clippedCount}</strong><br>
    ❌ Отброшено (снаружи): <strong>${rejected}</strong>
  `;
});

clearCanvas();