const express = require("express");
const fs = require("fs");
const { Telegraf } = require("telegraf");
const axios = require("axios");

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
const port = process.env.PORT || 8443;
const sizeLimit = 500; // allowed file size to upload
const bot = new Telegraf(apiToken);

// Bot Config
bot.telegram.setMyCommands([
  {
    command: "start",
    description: "🟢 Check health",
  },
  {
    command: "about",
    description: "💡 About this bot",
  },
]);

//* Bot responses functions here:

async function fileDownloader(url, fileName) {
  let outputLocationPath = `${tempDir}/${fileName}`;
  const writer = fs.createWriteStream(outputLocationPath);

  let doneDownloading = false;
  await axios
    .get(url, { responseType: "stream" })
    .then((response) => {
      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error = null;
        writer.on("error", (err) => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on("close", () => {
          if (!error) {
            doneDownloading = true;
            resolve(true);
          }
          //no need to call the reject here, as it will have been called in the
          //'error' stream;
        });
      });
    })
    .catch(function (error) {
      // handle error
      console.log("Something went wrong while downloading the file");
    });

  return doneDownloading ? outputLocationPath : false;
}
async function uploadToFileDoge(filePath) {
  const file = fs.createReadStream(filePath);
  let downloadLink = false;
  await axios
    .post(
      "https://api.filedoge.com/upload",
      { file },
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
    .then((res) => {
      downloadLink = res.data?.error
        ? false
        : `https://filedoge.com/download/${res.data.token}`;
    })
    .catch((err) => {
      console.log(err);
    });
  file.close();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return downloadLink;
}

async function processFile(file, context) {
  let fileSizeInBytes = file.file_size / 1024 / 1024;
  if (fileSizeInBytes > sizeLimit) {
    context.reply(`⚠️ File size must be under ${sizeLimit}MB!`);
  } else {
    console.log("getting file info ...");
    context.reply("⌛ Processing the file, please wait...");
    let file_info = await context.telegram.getFileLink(file.file_id);
    let file_download_link = file_info.href;
    let file_download_name = file_info.pathname.split("/")[4];
    const downloadedFile = await fileDownloader(
      file_download_link,
      file_download_name
    );
    if (downloadedFile) {
      const downloadLink = await uploadToFileDoge(downloadedFile);
      if (downloadLink) {
        context.reply("⬇️ File download link:");
        context.reply(downloadLink);
      } else {
        context.reply(
          "⚠️ Something went wrong while uploading to FileDoge, please try again!"
        );
      }
    } else {
      context.reply(
        "⚠️ There was a problem while uploading your file, please try again!"
      );
    }
  }
}

bot.on("document", async (ctx) => {
  await processFile(ctx.message.document, ctx);
});
bot.on("photo", async (ctx) => {
  let file = ctx.message.photo[ctx.message.photo.length - 1];
  await processFile(file, ctx);
});
bot.on("video", async (ctx) => {
  let file = ctx.message.video;
  await processFile(file, ctx);
});
bot.on("voice", async (ctx) => {
  let file = ctx.message.voice;
  await processFile(file, ctx);
});
bot.on("audio", async (ctx) => {
  await processFile(ctx.message.audio, ctx);
});
bot.on("location", (ctx) => {
  ctx.reply("⚠️ Can't upload location as a file!");
});
bot.on("venue", (ctx) => {
  ctx.reply("⚠️ Can't upload location as a file!");
});
bot.on("contact", (ctx) => {
  ctx.reply("⚠️ Not supported, please upload it as a file!");
});

bot.command("/start", (ctx) => {
  ctx.reply(
    `🤖: Welome to FileDoge Bot 👋\n🔗 Attach any file and I will send the download link for your file so you can use it later or share it with your friends 🥳\n⚠️ Make use the file size is less than ${sizeLimit}MB`
  );
});
bot.command("/about", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, "📃 Information about:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🤖 This Bot", callback_data: "bot_info" },
          { text: "👨‍💻 Developer", callback_data: "bot_developer" },
        ],
      ],
    },
  });
});

bot.action("bot_info", (ctx) => {
  ctx.answerCbQuery("Showing bot info");
  ctx.replyWithMarkdown(
    "Name: FileDoge Uploader Bot 🤖 \n" +
      "Version: 1.0 \n" +
      "Bot Language: [Nodejs](https://nodejs.org/en/) \n" +
      "Framework: [Expressjs](https://expressjs.com/) \n" +
      "Server: [Heroku](https://www.heroku.com/)\n"
  );
});
bot.action("bot_developer", (ctx) => {
  ctx.answerCbQuery("done!");
  ctx.replyWithMarkdown(
    "This bot is Developed by [Walid](https://kurdi.dev), You can see the source code of this bot on GitHub. ⭐️ it if you like it 😄",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Website", url: "https://kurdi.dev" }],
          [{ text: "👨‍💻 GitHub Profile", url: "https://github.com/kurdi-dev" }],
          [
            {
              text: "📱 Twitter Profile",
              url: "https://twitter.com/kurdi_dev",
            },
          ],
          [
            {
              text: "📁 Source Code",
              url: "https://github.com/kurdi-dev/filedoge-telegram-bot",
            },
          ],
        ],
      },
    }
  );
});

bot.on("text", (ctx) => {
  ctx.reply("⚠️ Text is not supported, please attach any file to upload.");
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

bot.telegram.setWebhook(
  `${process.env.BOT_SERVER_URL}:${port}${secretPath}` ||
    `https://f849-62-201-239-90.eu.ngrok.io:${port}${secretPath}`
);
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
