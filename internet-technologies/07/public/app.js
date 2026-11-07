const API_URL = '/api/books';

let books = [];
let editingId = null;
let isLoading = false;

const bookForm = document.querySelector('#book-form');
const titleInput = document.querySelector('#title-input');
const authorInput = document.querySelector('#author-input');
const submitBtn = document.querySelector('#submit-btn');
const cancelBtn = document.querySelector('#cancel-btn');
const refreshBtn = document.querySelector('#refresh-btn');
const messageEl = document.querySelector('#message');
const listEl = document.querySelector('#book-list');

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) msg = data.error;
    } catch (e) { /* пусто */ }
    throw new Error(msg);
  }

  if (response.status === 204) return null;
  return response.json();
}

function showMessage(text, isError = true) {
  messageEl.textContent = text;
  messageEl.className = isError ? 'message' : 'message success';
  setTimeout(() => { messageEl.textContent = ''; }, 4000);
}

function setLoading(state) {
  isLoading = state;
  submitBtn.disabled = state;
  refreshBtn.disabled = state;
  submitBtn.textContent = state ? 'Загрузка...' : (editingId ? 'Сохранить' : 'Добавить');
}

function render() {
  listEl.replaceChildren();

  if (books.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-msg';
    li.textContent = 'Список книг пуст.';
    listEl.appendChild(li);
    return;
  }

  for (const book of books) {
    const li = document.createElement('li');
    li.className = 'book-item';

    const info = document.createElement('div');
    info.className = 'book-info';
    
    const title = document.createElement('strong');
    title.textContent = book.title;
    
    const desc = document.createElement('span');
    desc.textContent = `${book.author}, ${book.year || 'год не указан'}`;
    
    info.appendChild(title);
    info.appendChild(desc);

    const actions = document.createElement('div');
    actions.className = 'book-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Изменить';
    editBtn.addEventListener('click', () => {
      editingId = book.id;
      titleInput.value = book.title;
      authorInput.value = book.author;
      submitBtn.textContent = 'Сохранить';
      cancelBtn.hidden = false;
      titleInput.focus();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Удалить книгу "${book.title}"?`)) return;
      try {
        setLoading(true);
        await request(`${API_URL}/${book.id}`, { method: 'DELETE' });
        await loadBooks(); 
        showMessage('Книга удалена', false);
      } catch (e) {
        showMessage(e.message);
      } finally {
        setLoading(false);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(info);
    li.appendChild(actions);
    listEl.appendChild(li);
  }
}

async function loadBooks() {
  try {
    setLoading(true);
    books = await request(API_URL);
    render();
  } catch (e) {
    showMessage(`Ошибка загрузки: ${e.message}`);
  } finally {
    setLoading(false);
  }
}

bookForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isLoading) return;

  const title = titleInput.value.trim();
  const author = authorInput.value.trim();

  if (!title || !author) {
    showMessage('Заполните название и автора.');
    return;
  }

  try {
    setLoading(true);
    
    if (editingId !== null) {
      
      await request(`${API_URL}/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author })
      });
      showMessage('Книга обновлена', false);
      cancelEdit();
    } else {
      
      await request(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, available: true })
      });
      showMessage('Книга добавлена', false);
      bookForm.reset();
    }
    
    await loadBooks();
  } catch (e) {
    showMessage(`Ошибка: ${e.message}`);
  } finally {
    setLoading(false);
  }
});

function cancelEdit() {
  editingId = null;
  bookForm.reset();
  submitBtn.textContent = 'Добавить';
  cancelBtn.hidden = true;
}

cancelBtn.addEventListener('click', cancelEdit);
refreshBtn.addEventListener('click', loadBooks);

loadBooks();