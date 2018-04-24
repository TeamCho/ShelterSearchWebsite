// Packages
const express = require('express');
const app = express();
const port = process.env.PORT || 8081;
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Setting up Firebase
const firebase = require('firebase');

require('dotenv').config();

var config = {
	apiKey: process.env.FIREBASE_API_KEY,
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
	checkAuth(res, () => {
		return res.redirect('/profile');
	});
});

//Register methods
app.get('/register', (req, res) => {
	checkUser((userInfo) => {
		res.render('login_register', {user: userInfo});
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
		return res.render('login_register', {errorMessage: error.message});
	});
});

// Login methods
app.get('/login', (req, res) => {
	checkUser((userInfo) => {
		res.render('login_register', {user: userInfo});
	});
});

app.post('/login', (req, res) => {
	var email = req.body.email;
	var password = req.body.password;
	firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
		return res.redirect('/profile');
	}, (error) => {
		return res.render('login_register', {errorMessage: error.message});
	});
});

// Password reset way
app.get('/reset', (req, res) => {
	checkUser((userInfo) => {
		res.render('reset', {user: userInfo});
	});
});

app.post('/reset', (req, res) => {
	var auth = firebase.auth();
	var email = req.body.email;
	auth.sendPasswordResetEmail(email).then(function() {
		return res.redirect('/login');
	}).catch(function(error) {
		checkUser((userInfo) => {
			return res.render('reset', {user: userInfo, errorMessage: error.message});
		});
	});

});

// Profile methods
app.get('/profile', (req, res) => {
	checkAuth(res, () => {
		getUserInfo((userInfo) => {
			getUserList((userList) => {
				res.render('profile', {user: userInfo, userList: userList});
			})	
		});
	});
});

app.post('/profile', (req, res, next) => {
	checkAuth(res, () => {
		var newName = req.body.name;
		var user = firebase.auth().currentUser;
		var ref = db.ref().child('User/' + user.uid + '/name');
		ref.set(newName);
		return res.redirect('/profile');
	});
});

// Shelter list methods
app.get('/list', (req, res) => {
	checkAuth(res, () => {
		var param = req.query.searchvalue;
		getShelterList(param, (error, shelterList) => {
			getUserInfo((userInfo) => {
				res.render('list', {user: userInfo, error: error, shelters: shelterList})
			});
		});
	});
	
});

app.get('/list/:shelterNo', (req, res) => {
	checkAuth(res, () => {
		getShelterInfo(req.params.shelterNo, (shelterInfo) => {
			if (shelterInfo == -1) {
				console.log("Hello world");
				return res.redirect('/list');
			} else {
				getUserInfo((userInfo) => {
					res.render('shelter', {user: userInfo, shelter: shelterInfo})
				});
			}
		});
	});
	
});

app.post('/list/:shelterNo', (req, res) => {
	var numToBook = req.body.numBeds;
	var shelter = req.params.shelterNo;
	getShelterInfo(req.params.shelterNo, (shelterInfo) => {
		if (shelterInfo == -1) {
			console.log("Hello world");
			return res.redirect('/list');
		} else {
			if (numToBook > 0 && shelterInfo.vacancies > numToBook) {
				console.log("Hello world");
			}
		}
	});
	
	console.log(numToBook);
	return res.redirect("/list");
});

// Logout methods
app.get('/logout', (req, res) => {
	firebase.auth().signOut();
	res.redirect('/login');
});

// Couple of methods to check for current user
var checkUser = function(callback) {
	var user = firebase.auth().currentUser;
	return callback(user);
}

var getUserInfo = function(callback) {
	checkUser((user) => {
		var ref = db.ref().child('User/' + user.uid);
		ref.on("value", function(snapshot) {
			var userInfo = snapshot.val();
			callback(userInfo);
		});
	});
	return;
}

var checkAuth = function(res, callback) {
	checkUser((user) => {
		if (!user) {
			return res.redirect('/login');
		}
		callback();
		return;
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
				userType: type,
				shelter: '-'
		});
	});
	return;	
}

var getUserList = function(callback) {
	var ref = db.ref().child('User/');
	ref.on("value", function(snapshot) {
		callback(snapshot.val());
	}, function (errorObject) {
		console.log("The read failed: " + errorObject.code);
		callback(-1);
	});
	return;
}

// Some shelter methods
var checkValidParams = function(parameter, callback) {
	var validParams = ["Male", "Female", "Women", "Families w/ newborns", "Families", "Children", "Young adults", "Anyone"];
	if (parameter != null && validParams.indexOf(parameter) == -1) {
		callback("That parameter is invalid");
	} else {
		callback();
	}
	return;
}

var getShelterList = function(parameter, callback) {
	var ref = db.ref().child('Shelter/');
	ref.on("value", function(snapshot) {
		var shelters = snapshot.val();
		console.log(shelters)
		var afterShelters = [];
		checkValidParams(parameter, (message) => {
			if (message != null) {
				callback(message, shelters);
			} else {
				if (parameter == "Male") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions.indexOf("Women") < 0) {
							afterShelters.push(shelters[i]);
						}
					}
				} else if (parameter == "Female") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions.indexOf("Men") < 0) {
							afterShelters.push(shelters[i]);
						}
					}
				} else if (parameter == "Families w/ newborns") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions == "Families w/ newborns") {
							afterShelters.push(shelters[i]);
						}
					}
				} else if (parameter == "Families") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions.indexOf("Families") >= 0) {
							afterShelters.push(shelters[i]);
						}
					}
				} else if (parameter == "Children") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions.indexOf("Children") >= 0) {
							afterShelters.push(shelters[i]);
						}
					}
				} else if (parameter == "Young adults") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions.indexOf("Young adults") >= 0) {
							afterShelters.push(shelters[i]);
						}
					}
				} else if (parameter == "Anyone") {
					for (var i = 0; i < shelters.length; i++) {
						if (shelters[i].restrictions.indexOf("Anyone") >= 0) {
							afterShelters.push(shelters[i]);
						}
					}
				} else {
					afterShelters = shelters;
				}
				callback(message, afterShelters)
			}
		});
	}, function (errorObject) {
		callback("The read failed: " + errorObject.code, []);
	});
	return;
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
	return;
}

var book = function(shelterNo, numBeds, callback) {
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