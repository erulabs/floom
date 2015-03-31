'use strict';

var path = require('path'),
  log = require('winston');

if (process.env.NODE_ENV === 'test') {
  log = {
    error: function () { return false; },
    info: function () { return false; },
    warn: function () { return false; }
  };
}

module.exports = {
  log: log,
  OPS_DIR: process.cwd() + path.sep + '.ops' + path.sep
};
