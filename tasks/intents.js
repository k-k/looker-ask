'use strict';

var looker = require('../looker-ask.js')(),
    fs     = require('fs'),
    mkdirp = require('mkdirp');

module.exports = function (grunt) {
  grunt.registerTask('intents', 'Generates an Intents schema file for the Looker Alexa Skill', function () {
    var task = this;

    var options = this.options({
      'dist_folder': 'dist',
      'package_folder': './'
    });

    var done = this.async();

    mkdirp('./' + options.dist_folder, function (err) {
      fs.writeFile('./' + options.dist_folder + '/intents.json', looker.schema(), function (err) {
        if (err) {
          throw err;
        }

        grunt.log.writeln('Intents schema file generated at ' + options.dist_folder + '/intents.json');
        done(true);
      });
    });
  });
};