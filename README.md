# dev.lucmsilva.com
Developer portal for pifkeys group

# Self-hosting
To self-host this repo, you must have Node.js and NPM. Once you have installed, you may continue.

1. **Install dependencies**

   ```bash
   npm install
   ```
   
2. **Create a Telegram bot**

   For Telegram authentication to work properly, you will need a Telegram bot. You can do this by following [this](https://core.telegram.org/bots/features#creating-a-new-bot). You will need the bot token and bot username.

3. **Create a GitHub OAuth application**

   For this step, you will need a GitHub account. You will create a new OAuth app with [this guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app). Copy the client ID and secret, and save it in a safe place. For the callback URL, use `http://localhost:3000/auth/github/callback`. This will be changed later.

4. **Copy env example to env file**

   All configuration values are stored in an .env file. We provided you with a .env.example file which may be renamed to .env, and edited with your credentials. Keep this file safe, as it is like a password.

   `SESSION_SECRET` should be a long, random string which will keep sessions secure.
   
   `GITHUB_CLIENT_[ID/SECRET]` is your GitHub OAuth application credentials you created in the last step.

   `ALLOWED_USERS` is the allowed users who can access /dashboard. Users should be a seperated by a comma, and refer to GitHub usernames.

   `TELEGRAM_BOT_USERNAME` is where you should put your Telegram bot's username like so: `example_bot`.

   `TELEGRAM_BOT_TOKEN` is pretty self-explanatory, it's where your bot token goes.

   In the next step, you will set `GITHUB_CALLBACK_URL` and `TELEGRAM_CALLBACK_URL`.

5. **Create a tunnel to port 3000**

   Once all of those steps are done, you can now create a tunnel to the server with the following commands. You will want to copy your temporary domain, and keep it handy.

   ```bash
   npx localtunnel --port 3000
   ```

6. **Update config and OAuth for temporary domain**

   Now you have your URL, copy just the subdomain, like this: `test-example-hithere.loca.lt`

   In `.env`, replace `localhost:3000` in both `GITHUB_CALLBACK_URL` and `TELEGRAM_CALLBACK_URL` with the subdomain you just got.

   In the GitHub OAuth app settings, input `https://[subdomain here]/auth/github/callback` in the Authorization callback URL field.

   Finally, send a message to @BotFather on Telegram with the command `/setdomain`, clicking the right bot if you have several already, and sending the bot your subdomain.

7. **Start the server**

   Now, type the following to start your server in a new terminal:

   ```bash
   node server.js
   ```
   
8. **DONE!** - You can now go to your subdomain in your web browser, and you will see the page.