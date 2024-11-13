# dev.lucmsilva.com
Developer portal for pifkeys group

# Self-hosting
To self-host this repo, you must have NodeJS and NPM. Once you have installed, you may continue.

1. **Install dependancies**

   ```
   npm install
   ```
2. **Copy env example to env file**

   All configuration values are stored in an .env file. We provided you with a .env.example file which may be renamed to .env, and edited with your credentials. Keep this file safe, as it is like a password.

   `SESSION_SECRET` should be a long, random string which will keep sessions secure.
   
   `GITHUB_CLIENT_[ID/SECRET]` is your GitHub OAuth application credentials. You can create it with [this guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), and put your client ID and secret in the .env file. The default callback URL is `http://localhost:3000/auth/github/callback`

3. **Start Express server**

   Once all of those steps are done, you can now start the server with this command:

   ```
   node server.js
   ```
