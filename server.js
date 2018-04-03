// Packages
var express = require('express');
var app = express();
var port = process.env.PORT || 8081;
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

const firebase = require('firebase');


// Setting other stuff
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.get('/', (req, res) => {
	res.render('index');
});


app.post('/register', (req, res) => {
	var userId = req.body.userID;
	var password = req.body.password;
	var email = userId + '@gatech.edu';
	firebase.auth().createUserWithEmailAndPassword(email, password).then(() => {
		firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
			return res.redirect('/');
		});
	}, (error) => {
		console.log(error.message);
		return res.redirect('/login');
	});
});

app.get('/login', (req, res) => {
	res.render('login');
});

app.post('/login', (req, res) => {
	var email = req.body.email;
	var password = req.body.password;
	firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
		return res.redirect('/profile');
	}, (error) => {
		return res.render('login', {user: checkUser(), errorMessage: error.message});
	});
});

app.get('/logout', (req, res) => {
	firebase.auth().signOut();
	res.redirect('/login');
});

// Couple of methods to check for current user
function checkUser() {
	return firebase.auth().currentUser;
}

function checkAuth(res) {
	if (!checkUser()) {
		return res.redirect('/login');
	}
}

app.listen(port);
console.log("Server running successfully on port 8081");