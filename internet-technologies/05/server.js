const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const books = [
  { id: 1, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1940, available: true },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866, available: false },
  { id: 3, title: 'Война и мир', author: 'Толстой', year: 1869, available: true },
  { id: 4, title: 'Собачье сердце', author: 'Булгаков', year: 1925, available: true },
  { id: 5, title: 'Идиот', author: 'Достоевский', year: 1869, available: true },
  { id: 6, title: 'Анна Каренина', author: 'Толстой', year: 1877, available: false }
];

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Books API',
    version: 1,
    items: books.length
  });
});

app.get('/api/books', (req, res) => {
  const { author, available, q } = req.query;

  if (!author && available === undefined && !q) {
    return res.json(books);
  }

  let filtered = books;

  if (author) {
    filtered = filtered.filter(b => 
      b.author.toLowerCase().includes(author.toLowerCase())
    );
  }

  if (available !== undefined) {
    const isAvailable = available === 'true';
    filtered = filtered.filter(b => b.available === isAvailable);
  }

  if (q) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(q.toLowerCase())
    );
  }

  res.json(filtered);
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body;

  if (!title || !author) {
    return res.status(400).json({ 
      error: 'Поля title и author обязательны' 
    });
  }

  const maxId = books.reduce((max, b) => Math.max(max, b.id), 0);
  const newBook = {
    id: maxId + 1,
    title: String(title).trim(),
    author: String(author).trim(),
    year: year ? Number(year) : null,
    available: req.body.available === true
  };

  books.push(newBook);
  res.status(201).json(newBook);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});