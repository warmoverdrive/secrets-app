//jshint esversion:6
const express = require("express");
const ejs = require("ejs");

const app = express();

app.use(express.static(`${__dirname}/public`));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.listen(3000, () => {
  console.log("server listening on port 3000");
});
