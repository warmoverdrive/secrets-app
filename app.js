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
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
  facebookId: String,
  googleId: String,
  email: String,
  password: String,
  secret: String,
});
// set up passport for local mongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// configure passport for Mongoose
passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

//==============================================================//
// Set up OAuth2.0 Strategies
//==============================================================//

// set up google oauth2
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      //userProfileURL: "https://www.googleapps.com/oauth2/v3/userinfo",
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate(
        { googleId: profile.id, username: profile.emails[0].value },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
      //passReqToCallback: true,
      profileFields: ["id", "email"],
    },
    (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      User.findOrCreate(
        {
          facebookId: profile.id,
          username: profile.emails[0].value,
        },
        (err, user) => {
          return cb(err, user);
        }
      );
    }
  )
);

//==============================================================//
// Basic Routing
//==============================================================//

app.get("/", (req, res) => {
  res.render("home");
});

app.route("/secrets").get((req, res) => {
  User.find({ secret: { $ne: null } }, (err, results) => {
    if (err) {
      console.log(err);
    } else {
      if (results) {
        // displays all secrets in database
        res.render("secrets", { usersWithSecrets: results });
      }
    }
  });
});

app
  .route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post((req, res) => {
    const submittedSecret = req.body.secret;
    console.log(req.user);
    User.findById(req.user._id, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(() => {
            res.redirect("/secrets");
          });
        }
      }
    });
  });

app.route("/logout").get((req, res) => {
  req.logout();
  res.redirect("/");
});

//==============================================================//
// Manual Login/Register Routes
//==============================================================//

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

//==============================================================//
// Google OAuth 2.0
//==============================================================//

app.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

//==============================================================//
// Facebook OAuth
//==============================================================//

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

//==============================================================//
// Server startup
//==============================================================//

app.listen(3000, () => {
  console.log("server listening on port 3000");
});
