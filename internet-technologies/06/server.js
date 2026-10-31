const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = new DatabaseSync('data.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER,
    available INTEGER NOT NULL DEFAULT 1
  )
`).run();

const count = db.prepare('SELECT COUNT(*) as count FROM books').get().count;

if (count === 0) {
  const insert = db.prepare('INSERT INTO books (title, author, year, available) VALUES (?, ?, ?, ?)');
  
  insert.run('Мастер и Маргарита', 'Булгаков', 1940, 1);
  insert.run('Преступление и наказание', 'Достоевский', 1866, 0);
  insert.run('Война и мир', 'Толстой', 1869, 1);
  insert.run('Собачье сердце', 'Булгаков', 1925, 1);
  
}

app.get('/api/books', (req, res) => {
  const { available, author, q } = req.query;
  let sql = 'SELECT id, title, author, year, available FROM books WHERE 1=1';
  const params = [];

  if (available !== undefined) {
    sql += ' AND available = ?';
    params.push(available === 'true' ? 1 : 0);
  }

  if (author) {
    sql += ' AND author LIKE ?';
    params.push(`%${author}%`);
  }

  if (q) {
    sql += ' AND title LIKE ?';
    params.push(`%${q}%`);
  }

  sql += ' ORDER BY id';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  const books = rows.map(b => ({ ...b, available: Boolean(b.available) }));
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const stmt = db.prepare('SELECT id, title, author, year, available FROM books WHERE id = ?');
  const book = stmt.get(id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json({ ...book, available: Boolean(book.available) });
});

app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const author = String(req.body.author ?? '').trim();
  const year = req.body.year !== undefined ? Number(req.body.year) : null;
  const available = req.body.available !== undefined ? (req.body.available ? 1 : 0) : 1;

  if (!title || !author) {
    return res.status(400).json({ error: 'Поля title и author обязательны' });
  }

  const stmt = db.prepare(
    'INSERT INTO books (title, author, year, available) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(title, author, year, available);

  const selectStmt = db.prepare('SELECT * FROM books WHERE id = ?');
  const newBook = selectStmt.get(result.lastInsertRowid);
  
  res.status(201).json({ ...newBook, available: Boolean(newBook.available) });
});

app.patch('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const selectStmt = db.prepare('SELECT * FROM books WHERE id = ?');
  const current = selectStmt.get(id);

  if (!current) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const author = req.body.author === undefined ? current.author : String(req.body.author).trim();
  const year = req.body.year === undefined ? current.year : Number(req.body.year);
  const available = req.body.available === undefined ? current.available : (req.body.available ? 1 : 0);

  if (!title || !author) {
    return res.status(400).json({ error: 'Поля title и author не могут быть пустыми' });
  }

  const updateStmt = db.prepare(
    'UPDATE books SET title = ?, author = ?, year = ?, available = ? WHERE id = ?'
  );
  updateStmt.run(title, author, year, available, id);

  const updated = selectStmt.get(id);
  res.json({ ...updated, available: Boolean(updated.available) });
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const stmt = db.prepare('DELETE FROM books WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.status(204).end();
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});