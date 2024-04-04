const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('better-sqlite3')('weak-jwt.db');
const jwt = require("jsonwebtoken");

db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)");
const stmt = db.prepare('INSERT INTO users (username, password) VALUES (@username, @password)');
stmt.run({ username: "administrator", password: "you will never get this! :)" });
stmt.run({ username: "admin", password: "you will never get this! :)" });
stmt.run({ username: "root", password: "you will never get this! :)" });
stmt.run({ username: "cookiemonster", password: "you will never get this! :)" });

app.use(express.static(path.join(__dirname, '/public')));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.render('index', { title: 'Taco Truck' });
});

app.post('/register', function (req, res) {
    if(req.body.username.length < 4 || req.body.password.length < 4){
        res.render('index', {message: "username or password cannot be less than 4 characters"})
    }

    regex = /^[a-zA-Z0-9]+$/
    if(!req.body.username.match(regex)){
        res.render('index', {message: "only letters and numbers allowed"})
    }
    try{
        userResults = db.prepare('SELECT * FROM users WHERE username = ?').get(req.body.username);
        if(userResults){
            res.render('index', {message: "error! user already exists"})
            return;
        }
    } catch(err){
        res.render('index', {message: err});
        return;
    }
    
    try {
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (@username, @password)');
        insertResults = stmt.run({ username: req.body.username, password: req.body.password });
        res.render('index', {message: "user registered!"});
        return;
    } catch (err) {
        res.render('index', {message: err});
        return;
    }
});


app.post('/login', function (req, res) {
    try {
        loginResults = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(req.body.username, req.body.password);
        if (loginResults) {
            res.cookie('session', createJwt(loginResults.username))
            res.redirect('/dashboard');
        } else {
            res.render('index', {message: "invalid login"});        }
    } catch (err) {
        res.render('index', {message: err});
    }

});

app.get('/dashboard', function (req, res) {
    const jwtData = handleJwt(req.cookies.session)
    if (jwtData) {
        username = jwtData['username']
        user_level = jwtData['user_level']
        if (username == "cookiemonster") {
            res.render('dashboard', {username, user_level, message: 'There was a flag... but I ate it <br/><img src="https://i.imgflip.com/46ud6z.gif" />'});
        }
        else if (user_level === "admin" || user_level === "administrator") {
            res.render('dashboard', {username, user_level, message: 'Welcome admin! Your flag is FLAG-WEAKSAUCESESSION-FLAG'});
        } else {
            res.render('dashboard', {username, user_level, message: 'Welcome to the userdash dashboard, ' + username + '!'});
        }
    } else {
        res.redirect('/');
    }
});

app.get('/free-flag', function (req, res) {
    res.status(200).send("you think it would be that easy??")
});

app.get('/logout', function (req, res) {
    if(req.cookies.session){
        res.clearCookie("session");
    }
    if(req.cookies['connect.sid']){
        res.clearCookie("connect.sid");
    }
    res.redirect('/');
});

app.listen(3335, function () {
    console.log('Node.js with Express application listening on port 3335!');
});

function handleJwt(jwtValue) {
    if(!jwtValue){
        return false
    }
    try {
        if(!jwtValue){
            return false
        }
        var data = JSON.parse(Buffer.from(jwtValue.split(".")[1], 'base64'))
        if(!data['username']){
            return false
        }
        if(!data['user_level']){
            return false
        }
        return data        
    } catch (err) {
        return false
    }
}

function createJwt(user){
    const token = jwt.sign({ user_level: "user", username: user },
    "SDFJKSDFJLKSDJKLWERNLKLKSDNLJSJFGLQLNKSMDLNK",
    {
     algorithm: 'HS256',
     allowInsecureKeySizes: true,
     expiresIn: 86400, // 24 hours
    });
    
    return token
}
