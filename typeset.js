var MathJax = require('mathjax-node');
var svg2png = require('svg2png');
var _ = require('underscore');
var Q = require('q');
var fs = require('fs');

MathJax.start();

// Application logic for typesetting.
var extractRawMath = function(text, prefix) {
  var mathRegex = new RegExp("^\s*" + prefix + "\s*(.*)$","g");
  var results = [];
  var match;
  while (match = mathRegex.exec(text)) {
    results.push({ // mathObject
      matchedText: match[0],
      input: match[1],
      output: null,
      error: null,
    });
  }
  return results;
};

var renderMath = function(mathObject) {
  var typesetOptions = {
    math: mathObject.input,
    format: 'TeX',
    font: 'TeX',
    svg: true,
    width: 600,
  };

  var deferred = Q.defer();
  var typesetCallback = function(result) {
    if (!result || !result.svg || !!result.errors) {
      mathObject.error = new Error('Invalid response from MathJax.');
      mathObject.output = result;
      deferred.reject(mathObject);
      return;
    }
    var filename = encodeURIComponent(mathObject.input).replace(/\%/g, 'pc') + '.png';
    var filepath = 'static/' + filename;
    var svgFilename = encodeURIComponent(mathObject.input).replace(/\%/g, 'pc') + '.svg';
    var svgFilepath = 'static/' + svgFilename;
    if (!fs.existsSync(filepath)) {
      console.log('writing new PNG: %s', filename);
      var svgBuffer1 = new Buffer(result.svg, "utf-8");
      console.log(result);
      fs.writeFile(svgFilepath, svgBuffer1, function(error) { if(error) {console.log(error)}});

      var svgBuffer = new Buffer(result.svg, "utf-8");
      var pngData = svg2png.sync(svgBuffer, {
            width: typesetOptions.width
            }
        )
      fs.writeFile(filepath, pngData,
          function(error) {
              if (error) {
                  mathObject.error = error;
                  mathObject.output = null;
                  deferred.reject(mathObject);
              }
          });
    } else {
      console.log('using existing PNG: %s', filename);
    }
    mathObject.output = {filepathPng: filepath, filepathSvg: svgFilepath};
    deferred.resolve(mathObject);
  };
  MathJax.typeset(typesetOptions, typesetCallback);
  return deferred.promise;
}

var typeset = function(text, prefix) {
  var rawMathArray = extractRawMath(text, prefix);
  if (rawMathArray.length === 0) {
    return null;
  }
  return Q.all(_.map(rawMathArray, renderMath));
};

module.exports = {
  typeset: typeset,
};
