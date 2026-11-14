const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/api/books', (req, res) => {
  try {
    const { q, available, sort, order, page = 1, limit = 5 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Параметр page должен быть положительным числом' });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'Параметр limit должен быть от 1 до 50' });
    }
    if (available !== undefined && available !== 'true' && available !== 'false') {
      return res.status(400).json({ error: 'Параметр available должен быть true или false' });
    }

    const allowedSortFields = ['id', 'title', 'author', 'year'];
    let sortField = 'id';
    let sortOrder = 'ASC';

    if (sort) {
      if (!allowedSortFields.includes(sort)) {
        return res.status(400).json({ error: 'Недопустимое поле сортировки' });
      }
      sortField = sort;
    }

    if (order) {
      const upperOrder = order.toUpperCase();
      if (upperOrder !== 'ASC' && upperOrder !== 'DESC') {
        return res.status(400).json({ error: 'Недопустимое направление сортировки' });
      }
      sortOrder = upperOrder;
    }

    let whereSql = ' WHERE 1=1';
    const params = [];

    if (q) {
      whereSql += ' AND (title LIKE ? OR author LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (available !== undefined) {
      whereSql += ' AND available = ?';
      params.push(available === 'true' ? 1 : 0);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM books ${whereSql}`);
    const total = countStmt.get(...params).total;
    const offset = (pageNum - 1) * limitNum;
    const sql = `SELECT * FROM books ${whereSql} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    const stmt = db.prepare(sql);
    const items = stmt.all(...params, limitNum, offset).map(b => ({
      ...b,
      available: Boolean(b.available)
    }));

    res.json({
      items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
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
  const result = db.prepare('INSERT INTO books (title, author, year, available) VALUES (?, ?, ?, ?)')
    .run(title, author, year, available);
  const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...newBook, available: Boolean(newBook.available) });
});

app.patch('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Book not found' });

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const author = req.body.author === undefined ? current.author : String(req.body.author).trim();
  const year = req.body.year === undefined ? current.year : Number(req.body.year);
  const available = req.body.available === undefined ? current.available : (req.body.available ? 1 : 0);

  if (!title || !author) return res.status(400).json({ error: 'Поля title и author не могут быть пустыми' });

  db.prepare('UPDATE books SET title = ?, author = ?, year = ?, available = ? WHERE id = ?')
    .run(title, author, year, available, id);

  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.json({ ...updated, available: Boolean(updated.available) });
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});