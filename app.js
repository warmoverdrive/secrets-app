//jshint esversion:6

//==============================================================//
// Set-up
//==============================================================//

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const mongoose = require("mongoose");
const ejs = require("ejs");

const app = express();

app.use(express.static(`${__dirname}/public`));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
// setup express session
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);
// set up passport with express session
app.use(passport.initialize());
app.use(passport.session());

//==============================================================//
// Mongoose/MongoDB setup
//==============================================================//

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});
mongoose.set("useCreateIndex", true); // supress deprec warning

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
// set up passport for local mongoose
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// configure passport for Mongoose
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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
    // parse credentials
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    // compare credentials using passport
    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });
  });

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
          });
        }
      }
    );
  });

app.route("/secrets").get((req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.route("/logout").get((req, res) => {
  req.logout();
  res.redirect("/");
});

//==============================================================//
// Server startup
//==============================================================//

app.listen(3000, () => {
  console.log("server listening on port 3000");
});
