require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, { profile, accessToken });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.set('view engine', 'ejs');

// serve public files (unused for now)
// app.use(express.static(path.join(__dirname, 'public')));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

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

app.get('/login/github', passport.authenticate('github', { scope: ['user', 'repo'] }));

app.get('/login/gitlab', (req, res) => {
  res.render('login/platforms/gitlab');
});

app.get('/login/telegram', (req, res) => {
  res.render('login/platforms/telegram');
});

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // if success
    res.redirect('/user');
  }
);

app.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const accessToken = req.user.accessToken;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });

    const { login, avatar_url, created_at, public_repos } = userResponse.data;

    const accountCreatedDate = new Date(created_at);
    const currentDate = new Date();
    const accAgeInMonths =
      (currentDate.getFullYear() - accountCreatedDate.getFullYear()) * 12 +
      (currentDate.getMonth() - accountCreatedDate.getMonth());

    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${accessToken}` },
      params: { per_page: 100 },
    });

    const repos = reposResponse.data;

    const repoCommits = await Promise.all(
      repos.map(async (repo) => {
        try {
          const commitsResponse = await axios.get(
            `https://api.github.com/repos/${login}/${repo.name}/commits`,
            {
              headers: { Authorization: `token ${accessToken}` },
              params: { per_page: 1 },
            }
          );

          const lastCommitDate = new Date(commitsResponse.data[0].commit.author.date);
          const daysSinceLastCommit = Math.floor(
            (currentDate - lastCommitDate) / (1000 * 60 * 60 * 24)
          );

          return {
            name: repo.name,
            lastCommit: daysSinceLastCommit,
          };
        } catch (error) {
          // Set null if cant fetch repos
          return {
            name: repo.name,
            lastCommit: null,
          };
        }
      })
    );

    const criteria = {
      accAge: {
        label: 'Account must be at least 1 month old',
        passed: accAgeInMonths >= 1,
      },
      repoCount: {
        label: 'Must have at least 3 repositories',
        passed: public_repos >= 3,
      },
      recCommits: {
        label: 'At least 3 repositories must have commits older than 1 day',
        passed: repoCommits.filter((repo) => repo.lastCommit !== null && repo.lastCommit > 1).length >= 3,
      },      
    };

    res.render('user/index', {
      user: {
        username: login,
        avatar: avatar_url,
        accAgeInMonths,
        public_repos,
      },
      repoCommits,
      criteria,
    });
  } catch (error) {
    console.error('Error fetching GH data:', error);
    res.redirect('login/index');
  }
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
});