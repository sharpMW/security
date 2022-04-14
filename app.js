require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const port = process.env.port || 3000;
const app = express();
//const encrypt = require("mongoose-encryption");
//const md5 = require('md5');
const bcrypt = require('bcrypt');
const salt = 10;

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']})
const User = new mongoose.model("User", userSchema);

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
app.post("/register", (req, res)=>{
    bcrypt.hash(req.body.password, salt, (err, hash)=>{
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save((err)=>{
            if(err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
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
app.post("/login", (req, res)=>{
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: req.body.username}, (err, foundUser)=>{
        if (err) {
            console.log(err);
        } else {
            if(foundUser) {
                bcrypt.compare(password, foundUser.password, (err, result)=>{
                    if(result===true){
                        res.render("secrets")
                    }
                });
            }
        }
    });
});


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`)
});
