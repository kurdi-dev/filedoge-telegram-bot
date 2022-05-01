const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Configurations
app.use(bodyParser.json());
const url = "https://api.telegram.org/bot";
const apiToken = process.env.TELEGRAM_TOKEN;
const port = 80;

// Express ndpoints
app.post("/", (req, res) => {
  // console.log(req.body);
  const chatId = req.body.message.chat.id;
  const sentMessageJson = req.body.message; // Regex for hello

  //   if (sentMessage.match(/hello/gi)) {
  if (true) {
    axios
      .post(`${url}${apiToken}/sendMessage`, {
        chat_id: chatId,
        text: "hello back 👋",
      })
      .then((response) => {
        res.status(200).send(response);
      })
      .catch((error) => {
        res.send(error);
      });
  } else {
    // if no hello present, just respond with 200
    res.status(200).send({});
  }
});

// comment out app.listen() in production, local development use only
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// no need for `app.listen()` on Deta, it runs the app automatically.
module.exports = app; // make sure to export your `app` instance.
