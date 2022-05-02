const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios"); // to be removed
const bodyParser = require("body-parser"); // to be removed

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const apiToken = process.env.TELEGRAM_TOKEN;

if (apiToken === undefined) {
  throw new Error("BOT_TOKEN must be provided!");
}
const port = 80;

const bot = new Telegraf(apiToken);

// Set the bot response here
bot.on("text", (ctx) => ctx.replyWithHTML("<b>Hello</b>"));

const secretPath = `/telegraf/${bot.secretPathComponent()}`;

// Set telegram webhook
// For Development:
// npm install -g localtunnel && lt --port <app port> | then set Webhook to `https://----.localtunnel.me${secretPath}`
// or use Ngrok server | then set Webhook to `https://----.ngrok.io${secretPath}`
// ngrok http <app port>
// For Production:
// set Webhook to you domain name + scretePath

bot.telegram.setWebhook(`https://d494-62-201-239-90.eu.ngrok.io${secretPath}`);
console.log("Telegram webhook is set.");

// Express server:
const app = express();

app.get("/", (req, res) => res.send("Hello World!"));

// Set the bot API endpoint
app.use(bot.webhookCallback(secretPath));

// If using deta, comment out app.listen() in production, local development use only
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// no need for `app.listen()` on Deta, it runs the app automatically.
module.exports = app; // make sure to export your `app` instance.
