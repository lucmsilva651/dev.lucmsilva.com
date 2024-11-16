require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
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
  res.redirect('/');
}

function ensureAuthorized(req, res, next) {
  const allowedUsers = process.env.ALLOWED_USERS.split(',');
  if (req.isAuthenticated() && allowedUsers.includes(req.user.profile.username)) {
    return next();
  }
  res.redirect('/user'); // redirect to /user (if not logged in will redirect to /login after)
}

function ensureTelegramAuthenticated(req, res, next) {
  if (req.session.telegramVerified) {
    return next();
  }
  res.redirect('/auth/telegram');
}

function verifyTelegramAuth(data, botToken) {
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const checkString = Object.keys(data)
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  return hmac === data.hash;
}

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// protected routes
app.get('/dashboard', ensureAuthenticated, ensureAuthorized, (req, res) => {
  res.render('dash/index');
});
app.get('/dashboard/users', ensureAuthenticated, ensureAuthorized, (req, res) => {
  res.render('dash/details/user');
});
app.get('/dashboard/invites', ensureAuthenticated, ensureAuthorized, (req, res) => {
  res.render('dash/details/invites');
});
app.get('/dashboard/feedback', ensureAuthenticated, ensureAuthorized, (req, res) => {
  res.render('dash/details/feedback');
});
app.get('/login/github', passport.authenticate('github', { scope: ['user', 'repo'] }));

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    // if success
    res.redirect('/auth/telegram');
  }
);

app.get('/auth/telegram', ensureAuthenticated, (req, res) => {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const url = process.env.TELEGRAM_CALLBACK_URL;
  res.render('tgauth', { botUsername, url });
});

app.get('/auth/telegram/callback', ensureAuthenticated, (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const data = req.query;
  if (verifyTelegramAuth(data, botToken)) {
    req.session.telegramVerified = true;
    req.session.telegramUser = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      username: data.username,
    };
    res.redirect('/user');
  } else {
    res.status(401).send('Telegram verification failed.');
  }
});

app.get('/user', ensureAuthenticated, ensureTelegramAuthenticated, async (req, res) => {
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
          if (commitsResponse.data.length === 0) {
            return null;
          }
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
    const filteredRepoCommits = repoCommits.filter(repo => repo !== null); // filter to find null values for repos w/o commits
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
        passed: filteredRepoCommits.filter((repo) => repo.lastCommit !== null && repo.lastCommit >= 1).length >= 3,
      },
    };
    const telegramUser = req.session.telegramUser || null;
    res.render('user/index', {
      user: {
        username: login,
        avatar: avatar_url,
        accAgeInMonths,
        public_repos,
      },
      repoCommits,
      criteria,
      telegramUser,
    });
  } catch (error) {
    console.error('Error fetching GH data:', error);
    res.redirect('/');
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