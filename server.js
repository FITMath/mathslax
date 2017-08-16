var Express = require('express');
var BodyParser = require('body-parser');
var Jade = require('jade');
var Typeset = require('./typeset.js');
var _ = require('underscore');
var util = require('util');

var SERVER = process.env.SERVER || '127.0.0.1';
var PORT = process.env.PORT || '8080';

// Install the routes.
var router = Express.Router();
router.get('/', function(req, res) {
  res.send('');
  res.end();
});

var slackImages = function(mo) {
  if (mo.output === null) {
    return {
        fallback: mo.input
    }
  }
  return {
    image_url: mo.output
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
    res.send('no text found to typeset. Make sure to prefix your message with ' + bpr);
    res.end(); // Empty 200 response -- no text was found to typeset.
    return;
  }
  var promiseSuccess = function(mathObjects) {
    var locals = {'mathObjects': mathObjects,
                  'serverAddress': util.format('http://%s:%s/', SERVER, PORT)};
    let data = {
    response_type: 'in_channel', // public to the channel
    fallback: requestString,
    attachments: _.map(mathObjects, slackImages)
    };
    console.log(data);
    res.json({'text' : htmlResult});
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
console.log("Mathslax is listening at http://%s:%s/", SERVER, PORT);
console.log("Make a test request with something like:");
console.log("curl -v -X POST '%s:%d/typeset' --data " +
            "'{\"text\": \"math! f(x) = x^2/sin(x) * E_0\"}' " +
            "-H \"Content-Type: application/json\"", SERVER, PORT);
console.log('___________\n');
