const values = [];

//Ссылки на элементы DOM 
const form         = document.querySelector('#controls');
const numberInput  = document.querySelector('#number-input');
const removeBtn    = document.querySelector('#remove-btn');
const clearBtn     = document.querySelector('#clear-btn');

const errorEl      = document.querySelector('#error');
const listEl       = document.querySelector('#values-list');

const countEl      = document.querySelector('#stat-count');
const sumEl        = document.querySelector('#stat-sum');
const averageEl    = document.querySelector('#stat-average');
const minEl        = document.querySelector('#stat-min');
const maxEl        = document.querySelector('#stat-max');

// Добавляет число в массив
function addValue(value) {
  values.push(value);
}

// Удаляет последнее число
function removeLastValue() {
  values.pop();
}

// Очищает массив
function clearValues() {
  values.length = 0;
}

// Считает статистику по массиву и возвращает объект
function getStatistics(arr) {
  if (arr.length === 0) {
    return {
      count: 0,
      sum: null,
      min: null,
      max: null,
      average: null,
    };
  }

  let sum = 0;
  let min = arr[0];
  let max = arr[0];

  for (const value of arr) {
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return {
    count: arr.length,
    sum,
    min,
    max,
    average: sum / arr.length,
  };
}

// Функция отображения
function render() {
  // 1. Список чисел
  listEl.innerHTML = '';
  for (const value of values) {
    const li = document.createElement('li');
    li.textContent = formatNumber(value);
    listEl.appendChild(li);
  }

  // 2. Статистика
  const stats = getStatistics(values);

  countEl.textContent = stats.count;
  sumEl.textContent     = stats.sum     === null ? '—' : formatNumber(stats.sum);
  averageEl.textContent = stats.average === null ? '—' : formatNumber(stats.average);
  minEl.textContent     = stats.min     === null ? '—' : formatNumber(stats.min);
  maxEl.textContent     = stats.max     === null ? '—' : formatNumber(stats.max);
}

// Форматирует число: убирает лишние нули у дробных
function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

//Сообщения об ошибках
function showError(message) {
  errorEl.textContent = message;
}

function clearError() {
  errorEl.textContent = '';
}

//Обработчик событий
// Добавить число
form.addEventListener('submit', (event) => {
  event.preventDefault();     
  clearError();

  const raw = numberInput.value.trim();

  if (raw === '') {
    showError('Введите число.');
    return;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    showError('Это не число. Попробуйте ещё раз.');
    return;
  }

  addValue(value);
  numberInput.value = '';
  numberInput.focus();

  render();
});

// Удалить последнее
removeBtn.addEventListener('click', () => {
  clearError();
  if (values.length === 0) {
    showError('Список пуст — удалять нечего.');
    return;
  }
  removeLastValue();
  render();
});

// Очистить
clearBtn.addEventListener('click', () => {
  clearError();
  clearValues();
  render();
});

render();