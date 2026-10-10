const API_URL = 'https://jsonplaceholder.typicode.com/users';

const state = {
  users: [],
  isLoading: false,
  error: null,
  filter: ''
};

const loadButton   = document.querySelector('#loadButton');
const reloadButton = document.querySelector('#reloadButton');
const filterInput  = document.querySelector('#filterInput');

const statusElement     = document.querySelector('#status');
const statisticsElement = document.querySelector('#statistics');
const usersElement      = document.querySelector('#users');

//Загрузка данных
async function loadUsers() {
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const users = await response.json();
    state.users = users;
  } catch (error) {
    state.error = `Не удалось загрузить данные: ${error.message}`;
    state.users = [];
  } finally {
    state.isLoading = false;
    render();
  }
}

//Фильтрация
function getFilteredUsers(users, filter) {
  const query = filter.trim().toLowerCase();
  if (query === '') return users;

  return users.filter((user) => {
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });
}

//Карточка пользователя
function createUserCard(user) {
  const article = document.createElement('article');
  article.className = 'user-card';

  const title = document.createElement('h3');
  title.textContent = user.name;
  article.appendChild(title);

  const rows = [
    ['username', user.username],
    ['email',    user.email],
    ['город',    user.address.city],
    ['компания', user.company.name],
  ];

  const dl = document.createElement('dl');
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = value;

    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  article.appendChild(dl);
  return article;
}

//Статистика
function getStatistics(users, filteredUsers) {
  const cities = new Set(users.map((u) => u.address.city));

  return {
    total: users.length,
    visible: filteredUsers.length,
    uniqueCities: cities.size
  };
}

//Отображение
function render() {
  usersElement.innerHTML = '';
  statisticsElement.textContent = '';

  statusElement.classList.remove('is-loading', 'is-error');

  //Загрузка
  if (state.isLoading) {
    statusElement.textContent = 'Загрузка...';
    statusElement.classList.add('is-loading');
    return;
  }

  //Ошибка
  if (state.error) {
    statusElement.textContent = state.error;
    statusElement.classList.add('is-error');
    return;
  }

  //Данные ещё не загружены
  if (state.users.length === 0) {
    statusElement.textContent = 'Данные ещё не загружены.';
    return;
  }

  //Данные есть
  statusElement.textContent = '';

  const filteredUsers = getFilteredUsers(state.users, state.filter);

  //Карточки
  for (const user of filteredUsers) {
    usersElement.appendChild(createUserCard(user));
  }

  //Статистика
  const stats = getStatistics(state.users, filteredUsers);
  statisticsElement.textContent =
    `Всего: ${stats.total} · Показано: ${stats.visible} · ` +
    `Уникальных городов: ${stats.uniqueCities}`;
}

//События
loadButton.addEventListener('click', () => {
  loadUsers();
});

reloadButton.addEventListener('click', () => {
  loadUsers();
});

filterInput.addEventListener('input', (event) => {
  state.filter = event.target.value;
  render();
});

render();