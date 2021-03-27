import express from "express";

const app    = express();
const config = require("../config.json");

app.get( "/", (req, res) => {
    res.send("Hello world!");
});

// start the Express server
app.listen(port, () => {
    console.log(`started at port ${config.website.port}`);
});
