const API_URL = '/api/books';

let state = {
  search: '',
  available: '',
  sortField: 'id',
  sortOrder: 'asc',
  page: 1,
  limit: 5
};

const searchInput = document.querySelector('#search-input');
const filterAvailable = document.querySelector('#filter-available');
const sortSelect = document.querySelector('#sort-select');
const limitSelect = document.querySelector('#limit-select');
const messageEl = document.querySelector('#message');
const listEl = document.querySelector('#book-list');
const paginationEl = document.querySelector('#pagination');
const prevBtn = document.querySelector('#prev-btn');
const nextBtn = document.querySelector('#next-btn');
const pageInfo = document.querySelector('#page-info');
const createForm = document.querySelector('#create-form');

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const data = await response.json(); if (data.error) msg = data.error; } catch (e) {}
    throw new Error(msg);
  }
  if (response.status === 204) return null;
  return response.json();
}

function showMessage(text) {
  messageEl.textContent = text;
}

async function loadBooks() {
  try {
    showMessage('Загрузка...');
    
    const params = new URLSearchParams();
    if (state.search) params.append('q', state.search);
    if (state.available !== '') params.append('available', state.available);
    params.append('sort', state.sortField);
    params.append('order', state.sortOrder);
    params.append('page', state.page);
    params.append('limit', state.limit);

    const data = await request(`${API_URL}?${params.toString()}`);
    
    showMessage('');
    renderList(data.items);
    renderPagination(data.meta);

  } catch (e) {
    showMessage(`Ошибка: ${e.message}`);
    listEl.innerHTML = '';
    paginationEl.hidden = true;
  }
}

function renderList(items) {
  listEl.replaceChildren();
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'book-item';
    li.style.justifyContent = 'center';
    li.textContent = 'Ничего не найдено.';
    listEl.appendChild(li);
    return;
  }

  for (const book of items) {
    const li = document.createElement('li');
    li.className = 'book-item';

    const info = document.createElement('div');
    info.className = 'book-info';
    
    const header = document.createElement('div');
    header.className = 'book-header';
    header.innerHTML = `
      <span class="book-id">#${book.id}</span>
      <strong>${book.title}</strong>
      <span class="badge ${book.available ? 'available' : 'unavailable'}">
        ${book.available ? 'В наличии' : 'Нет в наличии'}
      </span>
    `;

    const desc = document.createElement('span');
    desc.textContent = `${book.author}, ${book.year || 'год не указан'}`;

    info.appendChild(header);
    info.appendChild(desc);

    const actions = document.createElement('div');
    actions.className = 'book-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Изменить';
    editBtn.addEventListener('click', () => {
      renderEditForm(li, book);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Удалить книгу "${book.title}"?`)) return;
      try {
        await request(`${API_URL}/${book.id}`, { method: 'DELETE' });
        if (listEl.children.length === 1 && state.page > 1) {
          state.page--;
        }
        loadBooks();
      } catch (e) { showMessage(e.message); }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(info);
    li.appendChild(actions);
    listEl.appendChild(li);
  }
}

function renderEditForm(li, book) {
  li.replaceChildren(); 
  
  const form = document.createElement('form');
  form.className = 'edit-form';
  
  const titleIn = document.createElement('input');
  titleIn.value = book.title;
  titleIn.placeholder = 'Название';
  titleIn.required = true;

  const authorIn = document.createElement('input');
  authorIn.value = book.author;
  authorIn.placeholder = 'Автор';
  authorIn.required = true;

  const yearIn = document.createElement('input');
  yearIn.type = 'number';
  yearIn.value = book.year || '';
  yearIn.placeholder = 'Год';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Сохранить';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = 'Отмена';
  cancelBtn.addEventListener('click', () => loadBooks());

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);

  form.appendChild(titleIn);
  form.appendChild(authorIn);
  form.appendChild(yearIn);
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await request(`${API_URL}/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleIn.value.trim(),
          author: authorIn.value.trim(),
          year: yearIn.value ? Number(yearIn.value) : null
        })
      });
      loadBooks();
    } catch (err) {
      showMessage(`Ошибка обновления: ${err.message}`);
    }
  });

  li.appendChild(form);
}

function renderPagination(meta) {
  if (meta.pages <= 1) {
    paginationEl.hidden = true;
    return;
  }
  paginationEl.hidden = false;
  pageInfo.textContent = `Стр. ${meta.page} из ${meta.pages}`;
  prevBtn.disabled = meta.page <= 1;
  nextBtn.disabled = meta.page >= meta.pages;
}

searchInput.addEventListener('input', (e) => {
  state.search = e.target.value;
  state.page = 1;
  loadBooks();
});

filterAvailable.addEventListener('change', (e) => {
  state.available = e.target.value;
  state.page = 1;
  loadBooks();
});

sortSelect.addEventListener('change', (e) => {
  const [field, order] = e.target.value.split('-');
  state.sortField = field;
  state.sortOrder = order;
  state.page = 1;
  loadBooks();
});

limitSelect.addEventListener('change', (e) => {
  state.limit = Number(e.target.value);
  state.page = 1;
  loadBooks();
});

prevBtn.addEventListener('click', () => { state.page--; loadBooks(); });
nextBtn.addEventListener('click', () => { state.page++; loadBooks(); });

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.querySelector('#new-title').value.trim();
  const author = document.querySelector('#new-author').value.trim();
  const yearVal = document.querySelector('#new-year').value;

  if (!title || !author) {
    showMessage('Заполните название и автора.');
    return;
  }

  try {
    await request(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title, 
        author, 
        year: yearVal ? Number(yearVal) : null,
        available: true 
      })
    });
    createForm.reset();
    loadBooks();
  } catch (err) {
    showMessage(`Ошибка создания: ${err.message}`);
  }
});

loadBooks();