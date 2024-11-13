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

app.get('/dashboard', (req, res) => {
  res.render('dash/index');
});

app.get('/dashboard/users', (req, res) => {
  res.render('dash/details/user');
});

app.get('/dashboard/invites', (req, res) => {
  res.render('dash/details/invites');
});

app.get('/dashboard/feedback', (req, res) => {
  res.render('dash/details/feedback');
});

app.get('/login', (req, res) => {
  res.render('login/index');
});

app.get('/login/github', (req, res) => {
  res.render('login/platforms/github');
});

app.get('/login/gitlab', (req, res) => {
  res.render('login/platforms/gitlab');
});

app.get('/login/telegram', (req, res) => {
  res.render('login/platforms/telegram');
});

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
});