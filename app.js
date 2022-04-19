require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const port = process.env.port || 3000;
const app = express();
//const encrypt = require("mongoose-encryption");
//const md5 = require('md5');
//const bcrypt = require('bcrypt');
//const salt = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy =  require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: process.env.NEWSECRET,
    resave: false,
    saveUninitialized: false 
}));

app.use(passport.initialize()); //to initialize pasport
app.use(passport.session());    //to use passport for sessions

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    id: String,
    email: String,
    password: String,
    googleId: String,
    secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']})
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

 //passport.serializeUser(User.serializeUser());   //these work only for local strategy won't work for google strategy
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  passport.use(new GoogleStrategy({                             // this part should go after serialize and deserialize
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  (accessToken, refreshToken, profile, cb)=>{
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, (err, user)=>{  
        return cb(err, user)
    });
  } 
  ));

app.get("/auth/google", (req, res)=>{
    passport.authenticate('google', {scope: ['profile']});
    console.log("hi");
});
app.get("/auth/google/secrets", 
passport.authenticate('google', {failureRedirect: (req, res)=>{
    res.redirect("/secrets")
}}))

app.get("/", (req, res)=>{
    res.render("home");
})
app.get("/login", (req, res)=>{
    res.render("login");
})
app.get("/register", (req, res)=>{
    res.render("register");
})
app.get("/logout", (req, res)=>{
    res.render("home")
})

// app.get("/secrets", (req, res)=>{  //this was for when secrets was available only to authenticated users
//     if (req.isAuthenticated()){
//         res.render("secrets");
//     } else {
//         res.redirect("/login");
//     }
// });

app.get("/secrets", (req, res)=>{
    User.find({"secret": {$ne: null}},   //ne stands for 'not equals to'
    (err, foundUsers)=>{
        if(err){
            console.log(err)
        } else {
            if (foundUsers){
                res.render("secrets", {usersWithSecrets: foundUsers})
            }
        }
    });  
});

app.get("/logout", (req, res)=>{
    res.logout();
    res.redirect("/");
});

app.get("/submit", (req, res)=>{
    if(req.isAuthenticated){
        res.render("submit")
    } else {
        res.redirect("/login")
    }
});

app.post("/submit", (req, res)=>{
    const Secret = req.body.secret;
    User.findById(req.user._id, (err, foundUser)=>{ //don't forget to add "_" before id
        if(err){
            console.log(err)
        } else {
            if(foundUser) {
                foundUser.secret = Secret;
                foundUser.save(()=>{
                    res.redirect("/secrets");
                });
            }
        }
    })
})

//this is md5 hashing
// app.post("/register", (req, res)=>{
//     const newUser = new User({
//         email: req.body.username,
//         password: md5(req.body.password)
//     });
//     newUser.save((err)=>{
//         if(err){
//             console.log("This is your error " + err)
//         } else {
//             res.render("secrets");
//         }
//     })
// });

// this is bcrypt hashing with salting
// app.post("/register", (req, res)=>{
//     bcrypt.hash(req.body.password, salt, (err, hash)=>{
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         });
//         newUser.save((err)=>{
//             if(err) {
//                 console.log(err);
//             } else {
//                 res.render("secrets");
//             }
//         });
//     });
// });

app.post("/register", (req, res)=>{
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            });
        }
    });
});


//for md5
// app.post("/login", (req, res)=>{
//     const username = req.body.username;
//     const password = md5(req.body.password);
//     User.findOne({email: username}, (err, foundUser)=>{
//         if(err){
//             console.log(err);
//         } else {
//             if (foundUser) {
//                 if(foundUser.password === password){
//                     res.render("secrets");
//                 }
//             }
//         }
//     });
// })

//for bcrypt
// app.post("/login", (req, res)=>{
//     const username = req.body.username;
//     const password = req.body.password;

//     User.findOne({email: req.body.username}, (err, foundUser)=>{
//         if (err) {
//             console.log(err);
//         } else {
//             if(foundUser) {
//                 bcrypt.compare(password, foundUser.password, (err, result)=>{
//                     if(result===true){
//                         res.render("secrets")
//                     }
//                 });
//             }
//         }
//     });
// });


app.post("/login", (req, res)=>{
    const user = new User({
        usernmae: req.body.username,
        password: req.body.password
    });

    req.login(user, (err)=>{
        if(err){
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`)
});
