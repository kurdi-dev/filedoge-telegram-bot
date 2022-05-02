const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios"); // TODO: to be removed
const bodyParser = require("body-parser"); //TODO: to be removed

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// directory to store temproray files
const tempDir = process.env.NODE_ENV === "production" ? "/tmp" : "./tmp";
// Telegram bot token
const apiToken = process.env.TELEGRAM_TOKEN;

if (apiToken === undefined) {
  throw new Error("TELEGRAM_TOKEN must be provided!");
}
// Express/Bot server port
const port = 80;
const bot = new Telegraf(apiToken);

//* Bot responses functions here:

async function fileUpload(file, context) {
  let fileSizeInBytes = file.file_size / 1024 / 1024;
  if (fileSizeInBytes > 250) {
    context.reply("File size must be under 250MB");
  } else {
    console.log(file.file_name);
    console.log(file.file_id);
    console.log(file.file_unique_id);
    console.log(file.file_size);
    context.reply("Hello from fileUpload function");
  }
}

bot.on("document", async (ctx) => {
  await fileUpload(ctx.message.document, ctx);
});
bot.on("photo", async (ctx) => {
  let file = ctx.message.photo[ctx.message.photo.length - 1];
  file.file_name = "uploaded photo";
  await fileUpload(file, ctx);
});
bot.on("video", async (ctx) => {
  let file = ctx.message.video;
  file.file_name = "uploaded photo";
  await fileUpload(file, ctx);
});
bot.on("voice", async (ctx) => {
  let file = ctx.message.voice;
  file.file_name = "uploaded voice";
  await fileUpload(file, ctx);
});
bot.on("audio", async (ctx) => {
  await fileUpload(ctx.message.audio, ctx);
});
bot.on("location", (ctx) => {
  ctx.reply("Cant upload location as a file!");
});
bot.on("venue", (ctx) => {
  ctx.reply("Cant upload location as a file!");
});
bot.on("contact", (ctx) => {
  ctx.reply("Not supported, please upload it as file!");
});

bot.command("/about", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, "About this bot", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🤖 Bot information", callback_data: "bot_info" },
          { text: "👨‍💻 Developer", callback_data: "bot_developer" },
        ],
      ],
    },
  });
});

bot.action("bot_info", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("You clicked on bot info");
});
bot.action("bot_developer", (ctx) => {
  ctx.answerCbQuery("done!");
  ctx.reply(
    "This bot is Developed by Walid, You can see the source code of this bot on GitHub. Ifyou like it Star it!",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Website", url: "https://kurdi.dev" }],
          [{ text: "👨‍💻 GitHub Profile", url: "https://github.com/kurdi-dev" }],
          [
            {
              text: "📲 Twitter Profile",
              url: "https://twitter.com/kurdi_dev",
            },
          ],
          [
            {
              text: "📁 Source Code",
              url: "https://github.com/Khuzha/oneqrbot",
            },
          ],
        ],
      },
    }
  );
});

bot.on("text", (ctx) => {
  ctx.reply("Text is not supported, please attach any file to upload.");
});

//* Rest of the server configurations:
const secretPath = `/telegraf/${bot.secretPathComponent()}`;

// Set telegram webhook
// For Development:
// npm install -g localtunnel && lt --port <app port> | then set Webhook to `https://----.localtunnel.me${secretPath}`
// or use Ngrok server | then set Webhook to `https://----.ngrok.io${secretPath}`
// ngrok http <app port>
// For Production:
// set Webhook to you domain name + scretePath | Must have TLS

bot.telegram.setWebhook(`https://d494-62-201-239-90.eu.ngrok.io${secretPath}`);
console.log("Telegram webhook url updated.");

// Express server:
const app = express();
app.get("/", (req, res) => res.send("Hello World!"));
// Set the bot API endpoint
app.use(bot.webhookCallback(secretPath));

//! If using deta, comment out app.listen() in production, local development use only
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
//* no need for `app.listen()` on Deta, it runs the app automatically.
module.exports = app; // make sure to export your `app` instance.
