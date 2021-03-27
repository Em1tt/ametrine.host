import express from "express";
import path from "path";
import config from "./config.json";

const app: express.Application = express();

app.use(express.static(path.join(__dirname, "views")));
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(config.website.port, () => {
  console.log(`website started @${config.website.port}`);
});
