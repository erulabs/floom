'use strict';

var events = require('events'),
  util = require('util'),
  fs = require('fs'),
  common = require('./common.js'),
  log = common.log,
  SSH = require('simple-ssh'),
  dns = require('dns');

/**
 * Node class - inherits from EventEmitter
 *
 * @class
 * @param {Object} obj - The nodes configuration options
 * @param {string} obj.name - The unique name of the node - required
 * @param {string} [obj.loader] - The unique name of the node - defaults to JSON
 * @param {string} [obj.via] - The access method - defaults to SSH
 * @param {string} [obj.target] - The target to access (an IP or DNS name) - defaults to obj.name
 */
function Node (obj) {
  if (typeof obj === 'string') {
    obj = { name: obj };
  }
  if (typeof obj.name !== 'string') {
    log.error('ops.nodes: I dont understand that input');
    return false;
  }
  this.data = obj;
  if (this.data.target === undefined) {
    this.data.target = obj.name;
  }
  if (this.data.ssh === undefined) {
    this.data.ssh = { username: 'root' };
  }
  // Keep track of open SSH/Node connection
  this.connected = false;
  events.EventEmitter.call(this);
}
util.inherits(Node, events.EventEmitter);

/**
 * Tries to open a connection to the node
 *
 * @fires Node#connected
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.connect = function (callback) {
  var self = this;
  // Sever connection if one already exists
  self.connected = false;
  // Attempt to resolve the address.
  // Bear in mind, we dont actually use the resolved address in any way
  // We do this to massively speed up
  dns.resolve(self.data.target, function (err) {
    if (err) {
      log.warn('Unable to resolve an IP for "' + self.data.target + '"');
      callback(false);
    } else {
      switch(self.data.via || 'SSH') {
        case 'SSH':
          self.data.ssh.host = self.data.target;
          //{ host: self.data.target,
          //  user: 'username',
          //  pass: 'password' }
          var ssh = new SSH(self.data.ssh);
          ssh.on('ready', function () {
            self.emit('connected');
            self.connected = true;
            callback(true);
          });
          ssh.on('error', function (err) {
            log.warn('Unable to SSH to "' + self.data.target + '"', 'Error:', err.message);
            callback(false);
          });
          ssh.exec('echo hello');
          ssh.start();
          break;
        default:
          log.error('node.connect(): via', self.data.via, 'is not supported');
          break;
      }
    }
  });
  return self;
};

/**
 * Disconnets all connections to the given node (mostly used by testing)
 *
 * @fires Node#connected
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.disconnect = function (callback) {
  var self = this;
  if (callback !== undefined) {
    callback();
  }
  return self;
};

/**
 * Save the nodes config info based on the loader
 * Fails silently on windows for no particular reason....
 *
 * @todo Swap to ASYNC fs operations without breaking windows support
 * @fires Node#saved
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.save = function (callback) {
  var self = this;
  switch(this.data.loader || 'JSON') {
    case 'JSON':
      var target = common.OPS_DIR + self.data.name + '.json',
        payload = JSON.stringify(self.data, null, 2);
      //console.log('writing data', payload, 'to file', target);
      fs.writeFileSync(target, payload);
      /** @event Node#saved */
      self.emit('saved');
      if (callback !== undefined) {
        callback();
      }
      break;
    default:
      log.error('node.save(): loader', self.data.loader, 'is not supported');
      break;
  }
  return self;
};

/**
 * Load the nodes config info based on the loader
 * Fails silently on windows for no particular reason....
 *
 * @todo Swap to ASYNC fs operations without breaking windows support
 * @fires Node#loaded
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.load = function (callback) {
  var self = this,
    name = self.data.name;
  switch(this.data.loader || 'JSON') {
    case 'JSON':
      var target = common.OPS_DIR + name + '.json',
        data = { name: name };
      // If there is data to load...
      if(fs.existsSync(target)) {
        data = fs.readFileSync(target).toString();
        try {
          data = JSON.parse(data);
        } catch (err) {
          log.error('Failed to parse JSON from file', target, 'error:', err.message);
        }
        if (name !== data.name) {
          return log.error('Somehow you loaded a node data file with contains a different .name than it\'s filename');
        }
        self.data = data;
      }
      /** @event Node#loaded */
      self.emit('loaded');
      if (callback !== undefined) {
        callback();
      }
      break;
    default:
      log.error('node.load(): loader', this.data.loader, 'is not supported');
      break;
  }
  return self;
};

module.exports = Node;
