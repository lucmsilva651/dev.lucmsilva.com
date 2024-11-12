const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

// serve public files (unused for now)
// app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/login/github', (req, res) => {
  res.render('login/github');
});

app.get('/login/gitlab', (req, res) => {
  res.render('login/gitlab');
});

app.get('/login/telegram', (req, res) => {
  res.render('login/telegram');
});

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
});