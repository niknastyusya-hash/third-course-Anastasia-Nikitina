let value = 0;

// Ссылки на элементы DOM, которые нужно обновлять
const valueEl = document.querySelector('#value');
const statusEl = document.querySelector('#status');

// Кнопки
const increaseBtn = document.querySelector('#increase');
const decreaseBtn = document.querySelector('#decrease');
const resetBtn = document.querySelector('#reset');

// Функция, которая обновляет интерфейс по текущему значению переменной value
function render() {
  // Отображаем текущее значение
  valueEl.textContent = value;

  // Формируем сообщение о знаке числа
  if (value > 0) {
    statusEl.textContent = 'Число положительное';
  } else if (value < 0) {
    statusEl.textContent = 'Число отрицательное';
  } else {
    statusEl.textContent = 'Число равно нулю';
  }
}

// Обработчики событий
increaseBtn.addEventListener('click', () => {
  value += 1;
  render();
});

decreaseBtn.addEventListener('click', () => {
  value -= 1;
  render();
});

resetBtn.addEventListener('click', () => {
  value = 0;
  render();
});
// Первый рендер при загрузке страницы, чтобы интерфейс соответствовал начальному значению
render();
