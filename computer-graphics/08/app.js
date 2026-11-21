'use strict';

const MODELS = {
  cube: {
    name: 'Куб 2×2×2',
    vertices: [
      { x: -1, y: -1, z: -1 }, { x:  1, y: -1, z: -1 },
      { x:  1, y:  1, z: -1 }, { x: -1, y:  1, z: -1 },
      { x: -1, y: -1, z:  1 }, { x:  1, y: -1, z:  1 },
      { x:  1, y:  1, z:  1 }, { x: -1, y:  1, z:  1 }
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],  
      [4, 5], [5, 6], [6, 7], [7, 4],  
      [0, 4], [1, 5], [2, 6], [3, 7]    
    ]
  },
  box: {
    name: 'Параллелепипед 3×1×2',
    vertices: [
      { x: -1.5, y: -0.5, z: -1 }, { x:  1.5, y: -0.5, z: -1 },
      { x:  1.5, y:  0.5, z: -1 }, { x: -1.5, y:  0.5, z: -1 },
      { x: -1.5, y: -0.5, z:  1 }, { x:  1.5, y: -0.5, z:  1 },
      { x:  1.5, y:  0.5, z:  1 }, { x: -1.5, y:  0.5, z:  1 }
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ]
  },
  pyramid: {
    name: 'Пирамида',
    vertices: [
      { x: -1, y: -0.5, z: -1 }, 
      { x:  1, y: -0.5, z: -1 },
      { x:  1, y: -0.5, z:  1 },
      { x: -1, y: -0.5, z:  1 },
      { x:  0, y:  1,   z:  0 }   
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],  
      [0, 4], [1, 4], [2, 4], [3, 4]   
    ]
  }
};

function identity4() {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

function translation3D(tx, ty, tz) {
  return [
    [1, 0, 0, tx],
    [0, 1, 0, ty],
    [0, 0, 1, tz],
    [0, 0, 0, 1]
  ];
}

function scaling3D(sx, sy, sz) {
  return [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1]
  ];
}

function rotationX(degrees) {
  const a = degrees * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1]
  ];
}

function rotationY(degrees) {
  const a = degrees * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [c, 0, s, 0],
    [0, 1, 0, 0],
    [-s, 0, c, 0],
    [0, 0, 0, 1]
  ];
}

function rotationZ(degrees) {
  const a = degrees * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

function multiply4(a, b) {
  const result = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function transform3D(m, p) {
  const v = [p.x, p.y, p.z, 1];
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      r[i] += m[i][j] * v[j];
    }
  }
  return { x: r[0], y: r[1], z: r[2], w: r[3] };
}

function projectOrtho(p, width, height, scale) {
  return {
    x: width / 2 + p.x * scale,
    y: height / 2 - p.y * scale
  };
}

function projectPerspective(p, width, height, focal) {
  if (p.z <= 0) return null;
  return {
    x: width / 2 + focal * p.x / p.z,
    y: height / 2 - focal * p.y / p.z
  };
}

const NEAR = 0.1;

function clipEdgeNear(a, b, near = NEAR) {
  const inA = a.z >= near;
  const inB = b.z >= near;

  if (!inA && !inB) return null;     
  if (inA && inB) return [a, b];      

  const t = (near - a.z) / (b.z - a.z);
  const cut = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: near
  };

  return inA ? [a, cut] : [cut, b];
}

const state = {
  model: 'cube',
  angleX: 0,
  angleY: 0,
  angleZ: 0,
  scale: 1,
  distance: 5,       
  projection: 'ortho',
  focal: 300,       
  orthoScale: 120,  
  selectedVertex: 0,
  playing: true
};

const DEFAULTS = { ...state };

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function buildModelMatrix() {
  const S = scaling3D(state.scale, state.scale, state.scale);
  const RX = rotationX(state.angleX);
  const RY = rotationY(state.angleY);
  const RZ = rotationZ(state.angleZ);
  const T = translation3D(0, 0, state.distance);

  let m = multiply4(RX, S);
  m = multiply4(RY, m);
  m = multiply4(RZ, m);
  return multiply4(T, m);
}

function projectPoint(p) {
  if (state.projection === 'ortho') {
    return projectOrtho(p, canvas.width, canvas.height, state.orthoScale);
  }
  return projectPerspective(p, canvas.width, canvas.height, state.focal);
}

function drawSegment3D(a, b, color, lineWidth = 1.5) {
  const clipped = clipEdgeNear(a, b, NEAR);
  if (!clipped) return;

  const [c1, c2] = clipped;
  const p1 = projectPoint(c1);
  const p2 = projectPoint(c2);
  if (!p1 || !p2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const model = MODELS[state.model];
  const M = buildModelMatrix();

  const points3D = model.vertices.map(v => transform3D(M, v));

  const L = 2, d = state.distance;
  drawSegment3D({ x: -L, y: 0, z: d }, { x: L, y: 0, z: d }, '#d9534f', 1);
  drawSegment3D({ x: 0, y: -L, z: d }, { x: 0, y: L, z: d }, '#5cb85c', 1);
  drawSegment3D({ x: 0, y: 0, z: Math.max(d - L, NEAR) }, { x: 0, y: 0, z: d + L }, '#428bca', 1);

  for (const [i, j] of model.edges) {
    drawSegment3D(points3D[i], points3D[j], '#1b1b2f', 2);
  }

  for (const p of points3D) {
    if (p.z < NEAR) continue;
    const s = projectPoint(p);
    if (!s) continue;
    ctx.fillStyle = '#e83e8c';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  updateInfo(M, points3D);
}

function fmt(n, digits = 2) {
  return Number(n.toFixed(digits));
}

function matrixToString(m) {
  return m.map(row => row.map(v => fmt(v, 3).toFixed(3).padStart(8)).join(' ')).join('\n');
}

function updateInfo(M, points3D) {
  const model = MODELS[state.model];
  const idx = Math.min(state.selectedVertex, model.vertices.length - 1);
  const local = model.vertices[idx];
  const world = points3D[idx];

  let screenText;
  if (world.z < NEAR) {
    screenText = 'невидима (за ближней плоскостью)';
  } else {
    const s = projectPoint(world);
    screenText = s
      ? `x = ${fmt(s.x, 1)}, y = ${fmt(s.y, 1)}`
      : 'невидима';
  }

  document.getElementById('info').textContent =
    `Локальные:  (${fmt(local.x)}, ${fmt(local.y)}, ${fmt(local.z)})\n` +
    `После матрицы: (${fmt(world.x)}, ${fmt(world.y)}, ${fmt(world.z)})\n` +
    `Экранные:  ${screenText}`;

  document.getElementById('matrix').textContent = matrixToString(M);
}

function rebuildVertexSelect() {
  const sel = document.getElementById('vertexSelect');
  const n = MODELS[state.model].vertices.length;
  sel.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Вершина ${i}`;
    sel.appendChild(opt);
  }
  sel.value = Math.min(state.selectedVertex, n - 1);
}

function bindSlider(id, key, outId, fmtFn) {
  const input = document.getElementById(id);
  const out = document.getElementById(outId);
  const show = () => { out.textContent = fmtFn(state[key]); };
  input.addEventListener('input', () => {
    state[key] = parseFloat(input.value);
    show();
  });
  input._sync = () => { input.value = state[key]; show(); };
  input._sync();
  return input;
}

const sliderX = bindSlider('angleX', 'angleX', 'angleXOut', v => `${fmt(v, 0)}°`);
const sliderY = bindSlider('angleY', 'angleY', 'angleYOut', v => `${fmt(v, 0)}°`);
const sliderZ = bindSlider('angleZ', 'angleZ', 'angleZOut', v => `${fmt(v, 0)}°`);
bindSlider('scale', 'scale', 'scaleOut', v => fmt(v, 2));
bindSlider('dist', 'distance', 'distOut', v => fmt(v, 1));
bindSlider('focal', 'focal', 'focalOut', v => fmt(v, 0));

function syncAngleSliders() {
  const norm = a => {
    let r = a % 360;
    if (r > 180) r -= 360;
    if (r < -180) r += 360;
    return r;
  };
  sliderX.value = norm(state.angleX);
  sliderY.value = norm(state.angleY);
  sliderZ.value = norm(state.angleZ);
  document.getElementById('angleXOut').textContent = `${fmt(state.angleX, 0)}°`;
  document.getElementById('angleYOut').textContent = `${fmt(state.angleY, 0)}°`;
  document.getElementById('angleZOut').textContent = `${fmt(state.angleZ, 0)}°`;
}

document.getElementById('modelSelect').addEventListener('change', e => {
  state.model = e.target.value;
  state.selectedVertex = 0;
  rebuildVertexSelect();
});

document.querySelectorAll('input[name="projection"]').forEach(radio => {
  radio.addEventListener('change', e => {
    state.projection = e.target.value;
    document.getElementById('focal').disabled = (state.projection === 'ortho');
  });
});

document.getElementById('vertexSelect').addEventListener('change', e => {
  state.selectedVertex = parseInt(e.target.value, 10);
});

const playBtn = document.getElementById('playBtn');
playBtn.addEventListener('click', () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? '⏸ Пауза' : '▶ Пуск';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  Object.assign(state, DEFAULTS);
  document.getElementById('modelSelect').value = state.model;
  document.getElementById('focal').disabled = true;
  document.querySelectorAll('input[name="projection"]').forEach(r => {
    r.checked = (r.value === state.projection);
  });
  document.querySelectorAll('.panel input[type="range"]').forEach(s => {
    if (s._sync) s._sync();
  });
  rebuildVertexSelect();
});

const ROTATION_SPEED = 30; 

let lastTime = null;

function frame(timestamp) {
  if (lastTime !== null) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    if (state.playing) {
      state.angleY += ROTATION_SPEED * dt;
      syncAngleSliders();
    }
  }
  lastTime = timestamp;
  drawScene();
  requestAnimationFrame(frame);
}

rebuildVertexSelect();
document.getElementById('focal').disabled = true;
requestAnimationFrame(frame);
