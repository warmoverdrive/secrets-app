//jshint esversion:6

//==============================================================//
// Set-up
//==============================================================//

const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");

const app = express();

app.use(express.static(`${__dirname}/public`));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

//==============================================================//
// Mongoose/MongoDB setup
//==============================================================//

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const User = new mongoose.model("User", userSchema);

//==============================================================//
// Basic Routing
//==============================================================//

app.get("/", (req, res) => {
  res.render("home");
});

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username }, (err, user) => {
      if (err) {
        log.error(err);
      } else {
        if (user) {
          if (user.password === password) {
            res.render("secrets");
          } else {
            console.log("incorrect password");
            res.redirect("/login");
          }
        } else {
          console.log("unknown email");
          res.redirect("/login");
        }
      }
    });
  });

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const newUser = new User({
      email: req.body.username,
      password: req.body.password,
    });

    newUser.save((err) => {
      if (err) {
        console.log(err);
      } else {
        res.render("secrets");
      }
    });
  });

//==============================================================//
// Server startup
//==============================================================//

app.listen(3000, () => {
  console.log("server listening on port 3000");
});
