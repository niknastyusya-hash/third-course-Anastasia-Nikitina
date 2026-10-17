const API_URL = 'https://jsonplaceholder.typicode.com/posts';

const state = {
  posts: [],          
  isLoading: false,   
  isSaving: false,    
  error: null,        
  filter: '',         
  editingId: null     
};

const formTitle = document.querySelector('#form-title');
const postForm = document.querySelector('#post-form');
const titleInput = document.querySelector('#post-title');
const bodyInput = document.querySelector('#post-body');
const submitBtn = document.querySelector('#submit-btn');
const cancelBtn = document.querySelector('#cancel-btn');

const loadBtn = document.querySelector('#load-btn');
const filterInput = document.querySelector('#filter-input');
const statusEl = document.querySelector('#status');
const postsEl = document.querySelector('#posts');

function getFilteredPosts(posts, filter) {
  const query = filter.trim().toLowerCase();
  if (query === '') return posts;

  return posts.filter(post =>
    post.title.toLowerCase().includes(query) ||
    post.body.toLowerCase().includes(query)
  );
}

function resetForm() {
  postForm.reset();
  state.editingId = null;
  formTitle.textContent = 'Новая публикация';
  submitBtn.textContent = 'Сохранить';
  cancelBtn.hidden = true;
}

async function loadPosts() {
  const response = await fetch(`${API_URL}?_limit=10`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function createPost(data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function updatePost(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function deletePost(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';

  const header = document.createElement('div');
  header.className = 'post-header';

  const idBadge = document.createElement('span');
  idBadge.className = 'post-id';
  idBadge.textContent = `#${post.id}`;
  header.appendChild(idBadge);

  const title = document.createElement('h3');
  title.textContent = post.title;
  header.appendChild(title);

  card.appendChild(header);

  const body = document.createElement('p');
  body.textContent = post.body;
  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'post-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = 'Редактировать';
  editBtn.addEventListener('click', () => {
    state.editingId = post.id;
    titleInput.value = post.title;
    bodyInput.value = post.body;
    formTitle.textContent = `Редактирование #${post.id}`;
    submitBtn.textContent = 'Сохранить изменения';
    cancelBtn.hidden = false;
    titleInput.focus();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    if (state.isSaving) return;
    if (!confirm('Удалить эту публикацию?')) return;

    state.isSaving = true;
    state.error = null;
    render();

    try {
      await deletePost(post.id);
      
      state.posts = state.posts.filter(p => p.id !== post.id);
      
      state.posts.forEach((p, index) => {
        p.id = index + 1;
      });
      
    } catch (err) {
      state.error = `Ошибка удаления: ${err.message}`;
    } finally {
      state.isSaving = false;
      render();
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  card.appendChild(actions);

  return card;
}

function renderPosts(posts) {
  postsEl.innerHTML = '';
  for (const post of posts) {
    postsEl.appendChild(createPostCard(post));
  }
}

function render() {
  statusEl.classList.remove('is-error', 'is-loading');

  if (state.error) {
    statusEl.textContent = state.error;
    statusEl.classList.add('is-error');
  } else if (state.isLoading) {
    statusEl.textContent = 'Загрузка...';
    statusEl.classList.add('is-loading');
  } else if (state.isSaving) {
    statusEl.textContent = 'Сохранение...';
    statusEl.classList.add('is-loading');
  } else if (state.posts.length === 0) {
    statusEl.textContent = 'Нет публикаций.';
  } else {
    statusEl.textContent = `Показано: ${state.posts.length}`;
  }

  const isBusy = state.isLoading || state.isSaving;
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  filterInput.disabled = isBusy || state.posts.length === 0;

  const filtered = getFilteredPosts(state.posts, state.filter);
  renderPosts(filtered);
}

loadBtn.addEventListener('click', async () => {
  if (state.isLoading || state.isSaving) return;

  state.isLoading = true;
  state.error = null;
  render();

  try {
    state.posts = await loadPosts();
  } catch (err) {
    state.error = `Ошибка загрузки: ${err.message}`;
  } finally {
    state.isLoading = false;
    render();
  }
});

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.isSaving) return;

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title || !body) {
    state.error = 'Заголовок и текст не должны быть пустыми.';
    render();
    return;
  }

  state.isSaving = true;
  state.error = null;
  render();

  try {
    if (state.editingId !== null) {
      const updated = await updatePost(state.editingId, { title, body });
      const index = state.posts.findIndex(p => p.id === state.editingId);
      if (index !== -1) {
        state.posts[index] = { ...state.posts[index], ...updated };
      }
      resetForm();
    } else {
      const created = await createPost({ title, body, userId: 1 });
      
      const maxId = state.posts.reduce((max, p) => Math.max(max, p.id), 0);
      created.id = maxId + 1;
      
      state.posts.push(created);
      
      state.posts.forEach((p, index) => {
        p.id = index + 1;
      });
      
      resetForm();
    }
  } catch (err) {
    state.error = `Ошибка сохранения: ${err.message}`;
  } finally {
    state.isSaving = false;
    render();
  }
});

cancelBtn.addEventListener('click', () => {
  resetForm();
  state.error = null;
  render();
});

filterInput.addEventListener('input', (event) => {
  state.filter = event.target.value;
  render();
});

render();