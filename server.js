var Express = require('express');
var BodyParser = require('body-parser');
var Typeset = require('./typeset.js');
var _ = require('underscore');
var util = require('util');

var SERVER = process.env.SERVER || '127.0.0.1';
var PORT = process.env.PORT || '8080';

// Install the routes.
var router = Express.Router();
router.get('/', function(req, res) {
  res.end();
});

var slackImages = function(mo) {
  if (mo.output === null) {
    return {
        fallback: mo.input
    }
  }
  return {
    image_url: util.format('http://%s/%s', SERVER, mo.output)
  }
};

router.post('/typeset', function(req, res) {
  var cd = new Date();
  var requestString = req.body.text;
  var bpr = 'math\\!';
  console.log(cd + ":" + requestString);
  console.log( " going to send " + bpr );
  var typesetPromise = Typeset.typeset(requestString, bpr);
  if (typesetPromise === null) {
    res.end(); // Empty 200 response -- no text was found to typeset.
    return;
  }
  var promiseSuccess = function(mathObjects) {
    let data = {
        response_type: 'in_channel', // public to the channel
        fallback: requestString,
        attachments: _.map(mathObjects, slackImages)
    };
    res.json(data);
    console.log('Responding with: ');
    console.log(data);
    res.end();
  };
  var promiseError = function(error) {
    console.log('Error in typesetting:');
    console.log(error);
    res.end(); // Empty 200 response.
  };
  typesetPromise.then(promiseSuccess, promiseError);
});


// Start the server.
var app = Express();
app.use(BodyParser.urlencoded({extended: true}));
app.use(BodyParser.json());
app.use('/static', Express.static('static'));
app.use('/', router);

app.listen(PORT);
console.log()
console.log("Mathslax is listening at %s", SERVER);
console.log("Make a test request with something like:");
console.log("curl -v -X POST '%s/typeset' --data " +
            "'{\"text\": \"math! f(x) = x^2/sin(x) * E_0\"}' " +
            "-H \"Content-Type: application/json\"", SERVER);
console.log('___________\n');
