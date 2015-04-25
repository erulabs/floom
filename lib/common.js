'use strict';

var path = require('path');
var log = require('winston');

// If we're in automated testing mode, dont print output. Robots can't read.
if (process.env.NODE_ENV === 'test') {
  log.silent = true;
}

module.exports = {
  log: log,
  // Which path should the local storage directory be created in.
  OPS_DIR: process.cwd() + path.sep + '.floom' + path.sep,
  // Default method of connecting to nodes
  DEFAULT_VIA: 'SSH',
  // Default method of saving nodes
  DEFAULT_LOADER: 'JSON',
  // An OS agnostic way of finding the users home directory
  HOME: process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
  // An OS agnostic way of finding the user name
  USER: process.env.USER || process.env.USERNAME || process.env.USERPROFILE.split(path.sep)[2]
};
