// Packages
const express = require('express');
const app = express();
const port = process.env.PORT || 8081;
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

app.use(cookieParser());
app.use(bodyParser());

// Setting up Firebase
const firebase = require('firebase');

var config = {
	apiKey: "AIzaSyBY4bfsuMZhdkrf1BxD3IYRvwhxSKHz9aU",
	authDomain: "cs2340project-76d43.firebaseapp.com",
	databaseURL: "https://cs2340project-76d43.firebaseio.com",
	projectId: "cs2340project-76d43",
	storageBucket: "cs2340project-76d43.appspot.com",
	messagingSenderId: "949739768618"
};
firebase.initializeApp(config);
var db = firebase.database();

// Setting up view engine and stuff
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.get('/', (req, res) => {
	checkUser((userInfo) => {
		res.render('index', {user: userInfo});
	});
});

//Register methods
app.get('/register', (req, res) => {
	checkUser((userInfo) => {
		res.render('register', {user: userInfo});
	});
});

app.post('/register', (req, res) => {
	var name = req.body.name;
	var password = req.body.password;
	var email = req.body.email;
	var type = req.body.type;
	firebase.auth().createUserWithEmailAndPassword(email, password).then(() => {
		addUser(name, email, type);
		firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
			return res.redirect('/');
		});
	}, (error) => {
		return res.render('register', {errorMessage: error.message});
	});
});

// Login methods
app.get('/login', (req, res) => {
	checkUser((userInfo) => {
		res.render('login', {user: userInfo});
	});
});

app.post('/login', (req, res) => {
	var email = req.body.email;
	var password = req.body.password;
	firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
		return res.redirect('/profile');
	}, (error) => {
		checkUser((userInfo) => {
			return res.render('login', {user: userInfo, errorMessage: error.message});
		});
	});
});

// Profile methods
app.get('/profile', (req, res) => {
	checkAuth(res);
	checkUser((userInfo) => {
		res.render('profile', {user: userInfo});
	});
});

// Shelter list methods
app.get('/list', (req, res) => {
	checkAuth(res);
	getShelterList((shelterList) => {
		checkUser((userInfo) => {
			res.render('list', {user: userInfo, shelters: shelterList})
		});
	});
});

app.get('/list/:shelterNo', (req, res) => {
	checkAuth(res);
	getShelterInfo(req.params.shelterNo, (shelterInfo) => {
		if (shelterInfo == -1) {
			console.log("Hello world");
			return res.redirect('/list');
		} else {
			checkUser((userInfo) => {
				res.render('shelter', {user: userInfo, shelter: shelterInfo})
			});
		}
	});
});

// Logout methods
app.get('/logout', (req, res) => {
	firebase.auth().signOut();
	res.redirect('/login');
});

// Couple of methods to check for current user
var checkUser = function(callback) {
	var user = firebase.auth().currentUser;
	callback(user);
}

var getUserInfo = function(callback) {
	checkUser((user) => {
		var ref = db.ref().child('User/' + user.uid);
		ref.on("value", function(snapshot) {
			var userInfo = snapshot.val();
			callback(userInfo);
		});
	});
}

function checkAuth(res) {
	checkUser((user) => {
		if (!user) {
			return res.redirect('/login');
		}
	});
}

function addUser(name, email, type) {
	checkUser((user) => {
			db.ref('User/' + user.uid).set({
			name: name,
			email: email,
			booking: 2147483647,
			bedsTaken: 0,
			uid: user.uid,
			userType: type
		});
	});
	
}

// Some shelter methods
var getShelterList = function(callback) {
	var ref = db.ref().child('Shelter/');
	ref.on("value", function(snapshot) {
		callback(snapshot.val());
	}, function (errorObject) {
		console.log("The read failed: " + errorObject.code);
		callback([]);
	});
}

var getShelterInfo = function(shelterNo, callback) {
	var ref = db.ref().child('Shelter/' + shelterNo + '/');
	ref.on("value", function(snapshot) {
		if (!snapshot.val()) {
			console.log("Invalid shelter");
			callback(-1);
		} else {
			callback(snapshot.val());
		}
	}, function (errorObject) {
		console.log("The read failed: " + errorObject.code);
		callback(-1);
	});
}

app.listen(port);
console.log("Server running successfully on port 8081");