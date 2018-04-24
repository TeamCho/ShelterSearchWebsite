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
app.get('/', requireAuth, (req, res) => {
	return res.redirect('/profile');
});

//Register methods
app.get('/register', (req, res) => {
	getAuth((auth) => {
		res.render('login_register', {userAuth: auth});
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
	getAuth((auth) => {
		res.render('login_register', {userAuth: auth});
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
	getAuth((auth) => {
		res.render('reset', {userAuth: auth});
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
app.get('/profile', requireAuth, (req, res) => {
	getUserInfo((userInfo) => {
		getUserList((userList) => {
			res.render('profile', {userAuth: true, user: userInfo, userList: userList});
		})	
	});
});

app.post('/profile', requireAuth, (req, res) => {
	// editUser(req.body.name, req.body.email, req.body.type);
	var newName = req.body.name;
	res.redirect('/profile');
	editUser(newName);
	return;
});


// Shelter list methods
app.get('/list', requireAuth, (req, res) => {
	var param = req.query.searchvalue;
	getShelterList(param, (error, shelterList) => {
		res.render('list', {userAuth: true, error: error, shelters: shelterList})
	});
});

app.get('/list/:shelterNo', requireAuth, (req, res) => {
	getShelterInfo(req.params.shelterNo, (shelterInfo) => {
		if (shelterInfo == -1) {
			return res.redirect('/list');
		} else {
			getUserInfo((user) => {
				var canBook = user.shelter == '-';
				var canCancel = user.shelter == shelterInfo.name;
				var numBeds = user.numBeds * -1;
				res.render('shelter', {userAuth: true, numBeds: numBeds, shelter: shelterInfo, canBook: canBook, canCancel: canCancel});	
			});
		}
	});
	
});

app.post('/list/:shelterNo', requireAuth, (req, res) => {
	var numBeds = req.body.numBeds;
	var shelterNo = req.params.shelterNo;
	getShelterInfo(shelterNo, (shelterInfo) => {
		if (shelterInfo == -1) {
			return res.redirect('/list');
		} else {
			if (numBeds > 0 && shelterInfo.vacancies > numBeds) {
				bookBeds(shelterInfo, numBeds, () => {
					console.log("Hello World")
				})
			}
		}
	});
	return res.redirect("/list");
});

app.post('/cancel/:shelterNo', requireAuth, (req, res) => {
	var shelterNo = req.params.shelterNo;
	var user = firebase.auth().currentUser;
	getUserInfo((user) => {
		getShelterInfo(shelterNo, (shelterInfo) => {
			if (shelterInfo == -1) {
				return res.redirect('/list');
			} else {
				cancelBeds(shelterInfo, () => {
					console.log("Done");
				})
			}
		});
	});
	return res.redirect("/list");
});


// Logout methods
app.get('/logout', (req, res) => {
	firebase.auth().signOut();
	res.redirect('/login');
});

// Couple of methods to check for current user
function requireAuth(req, res, next) {
	var user = firebase.auth().currentUser;
	if (user) {
		return next();
	} else {
		return res.redirect('/login');
	}
}

var getAuth = function(callback) {
	checkUser((user) => {
		return callback(!!user);
	});
}

var checkUser = function(callback) {
	return callback(firebase.auth().currentUser);
}

var getUserInfo = function(callback) {
	var user = firebase.auth().currentUser;
	var ref = db.ref().child('User/' + user.uid);
	ref.once("value", function(snapshot) {
		var userInfo = snapshot.val();
		callback(userInfo);
	});
	return;
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

function editUser(name, email, type) {
	var user = firebase.auth().currentUser;
	if (!!name) {
		var ref = db.ref().child('User/' + user.uid);
		ref.child('name').set(name).catch(err => {
			console.log(err);
		});
		return;
	} else if (!!email) {
		user.updateEmail(email).then(() => {
			var ref = db.ref().child('User/' + user.uid);
			ref.child('email').set(email);
		}).catch(err => {
			console.log(err);
		});
	}
}

var getUserList = function(callback) {
	var ref = db.ref().child('User/');
	ref.once("value", function(snapshot) {
		callback(snapshot.val());
	}, function (errorObject) {
		console.log("The read failed: " + errorObject.code);
		callback(-1);
	});
	return;
}

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
	ref.once("value", function(snapshot) {
		var shelters = snapshot.val();
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
	ref.once("value", function(snapshot) {
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

var bookBeds = function(shelterInfo, numBeds, callback) {
	var ref = db.ref().child('Shelter/' + shelterInfo.key + '/');
	ref.child('vacancies').set(shelterInfo.vacancies - numBeds);
	checkUser((user) => {
		db.ref().child('User').child(user.uid).update({'booking': numBeds, 'shelter': shelterInfo.name, 'bedsTaken': numBeds});
	})
	return callback();
}

var cancelBeds = function(shelterInfo, callback) {
	var ref = db.ref().child('Shelter/' + shelterInfo.key + '/');
	getUserInfo((user) => {
		ref.child('vacancies').set(+shelterInfo.vacancies + +user.bedsTaken);
		db.ref().child('User').child(user.uid).update({'booking': 2147483647, 'shelter': '-', 'bedsTaken': 0});
		return callback();
	});
}

app.listen(port);
console.log("Server running successfully on port 8081");