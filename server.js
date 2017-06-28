// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
// var exphbs = require("express-handlebars");

 // Models
 var Note = require('./models/Note.js');
 var Article = require('./models/Article.js');

 // Scrappers
 var request = require('request');
 var cheerio = require('cheerio');

 mongoose.Promise = Promise;

// Initialize Express
var app = express();

 // Set Handlebars as the default templating engine.
// app.engine("handlebars", exphbs({ defaultLayout: "main" }));
// app.set("view engine", "handlebars");

// Set up Morgan and body-parser
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
	extended: false
}));

app.use(express.static('public'));

// Database setups
mongoose.connect('mongodb://localhost/newsScraper');
var db = mongoose.connection;

db.on('error', function(error){
	console.log('Mongoose Error: ', error);
});

db.once('open', function(){
	console.log('Mongoose connection successful.');
});

// Routes

// Get request to scrape
app.get('/scrape', function(req, res){
	request('https://www.sciencedaily.com/news/top/science', function(error, response, html){
		var $ = cheerio.load(html);
		$('h3.latest-head').each(function(i, element){

			var result = {};

			result.title = $(this).children('a').text();
			result.link = $(this).children('a').attr('href');

			var entry = new Article(result);

			// Save to db
			entry.save(function(err, doc){
				if(err){
					console.log(err);
				}
				else{
					console.log(doc);
				}
			});
		});
	});
	res.send('Scrape Complete');
});

// Get the articles scraped from db
app.get('/articles', function(req, res){
	Article.find({}, function(error, doc){
		if (error){
			console.log(error);
		}
		else{
			res.json(doc);
		}
	});
});

// Get article by its ObjectId
app.get('/articles/:id', function(req, res){
	Article.findOne({ '_id': req.params.id })
	.populate('note')
	.exec(function(error, doc){
		if(error){
			console.log(error);
		}
		else{
			res.json(doc);
		}
	});
});

// Create a new note
app.post('/articles/:id', function(req, res){
	var newNote = new Note(req.body);

	newNote.save(function(error, doc){
		if(error) {
			console.log(error);
		}
		else {
			Article.findOneAndUpdate({ '_id': req.params.id}, {'note': doc._id})
			.exec(function(err, doc){
				if (err) {
					console.log(err);
				}
				else {
					res.send(doc);
				}
			});
		}
	});
});

app.listen(3000, function(){
	console.log('App running on port 3000!');
});
