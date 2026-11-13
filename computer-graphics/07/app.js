const GRID_W = 40;
const GRID_H = 30;
const SCALE = 16;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const txInput = document.querySelector('#tx');
const tyInput = document.querySelector('#ty');
const sxInput = document.querySelector('#sx');
const syInput = document.querySelector('#sy');
const angleInput = document.querySelector('#angle');
const cxInput = document.querySelector('#cx');
const cyInput = document.querySelector('#cy');

const applyBtn = document.querySelector('#apply-btn');
const resetBtn = document.querySelector('#reset-btn');
const exampleBtn = document.querySelector('#example-btn');
const matrixOutput = document.querySelector('#matrix-output');
const tableBody = document.querySelector('#vertices-table tbody');

let originalPolygon = [];
let transformedPolygon = [];
let isTransformed = false;

function translation(tx, ty) {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1]
  ];
}

function scaling(sx, sy) {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ];
}

function rotation(degrees) {
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s,  c, 0],
    [0,  0, 1]
  ];
}

function multiplyMatrices(a, b) {
  const result = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function transformPoint(m, p) {
  return {
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2]
  };
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
}

function drawPolygon(points, color, isDashed = false, showVertices = false) {
  if (points.length === 0) return;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (isDashed) ctx.setLineDash([5, 5]);
  else ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(points[0].x * SCALE, points[0].y * SCALE);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * SCALE, points[i].y * SCALE);
  }
  if (points.length > 2) ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  if (showVertices) {
    ctx.fillStyle = '#0d0d0d';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * SCALE, p.y * SCALE, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCenter(cx, cy) {
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.arc(cx * SCALE, cy * SCALE, 5, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  drawGrid();

  if (originalPolygon.length > 0) {
    drawPolygon(originalPolygon, '#cccccc', true, !isTransformed);
  }

  if (isTransformed && transformedPolygon.length > 0) {
    drawPolygon(transformedPolygon, '#4d6bfe');
  }

  const cx = Number(cxInput.value);
  const cy = Number(cyInput.value);
  drawCenter(cx, cy);
}

function renderTable() {
  tableBody.innerHTML = '';
  
  if (originalPolygon.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center; color:#999;">Сетка пуста. Кликните для добавления вершин.</td>`;
    tableBody.appendChild(tr);
    return;
  }

  for (let i = 0; i < originalPolygon.length; i++) {
    const p0 = originalPolygon[i];
    const p1 = isTransformed ? transformedPolygon[i] : p0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>P${i}</td>
      <td>${p0.x.toFixed(2)}</td>
      <td>${p0.y.toFixed(2)}</td>
      <td>${p1.x.toFixed(2)}</td>
      <td>${p1.y.toFixed(2)}</td>
    `;
    tableBody.appendChild(tr);
  }
}

function applyTransformation() {
  if (originalPolygon.length < 3) {
    alert('Сначала постройте многоугольник (минимум 3 вершины).');
    return;
  }

  const tx = Number(txInput.value);
  const ty = Number(tyInput.value);
  const sx = Number(sxInput.value);
  const sy = Number(syInput.value);
  const angle = Number(angleInput.value);
  const cx = Number(cxInput.value);
  const cy = Number(cyInput.value);

  const T = translation(tx, ty);
  const S = scaling(sx, sy);
  const R = rotation(angle);

  const T_center = translation(cx, cy);
  const T_neg_center = translation(-cx, -cy);

  const inner = multiplyMatrices(
    T_center,
    multiplyMatrices(R, multiplyMatrices(S, T_neg_center))
  );

  const orderMode = document.querySelector('input[name="order"]:checked').value;
  let finalMatrix;

  if (orderMode === 'TR') {

    finalMatrix = multiplyMatrices(T, inner);
  } else {

    finalMatrix = multiplyMatrices(inner, T);
  }

  transformedPolygon = originalPolygon.map(p => transformPoint(finalMatrix, p));
  isTransformed = true;

  let str = '';
  for (let i = 0; i < 3; i++) {
    str += `[ ${finalMatrix[i][0].toFixed(3).padStart(8)} ${finalMatrix[i][1].toFixed(3).padStart(8)} ${finalMatrix[i][2].toFixed(3).padStart(8)} ]\n`;
  }
  matrixOutput.textContent = str;

  renderTable();
  render();
}

applyBtn.addEventListener('click', applyTransformation);

resetBtn.addEventListener('click', () => {
  originalPolygon = [];
  transformedPolygon = [];
  isTransformed = false;
  matrixOutput.textContent = 'Матрица не применена.';
  renderTable();
  render();
});

exampleBtn.addEventListener('click', () => {
  originalPolygon = [
    { x: 5, y: 5 },
    { x: 15, y: 5 },
    { x: 15, y: 15 },
    { x: 5, y: 15 }
  ];
  transformedPolygon = [...originalPolygon];
  isTransformed = false;
  matrixOutput.textContent = 'Матрица не применена.';
  renderTable();
  render();
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / SCALE);
  const y = Math.floor((e.clientY - rect.top) / SCALE);
  
  if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
    
    if (isTransformed) {
      isTransformed = false;
      transformedPolygon = [];
      matrixOutput.textContent = 'Матрица не применена.';
    }
    originalPolygon.push({ x, y });
    renderTable();
    render();
  }
});

renderTable();
render();