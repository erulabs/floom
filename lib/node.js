'use strict';

var events = require('events');
var util = require('util');
var fs = require('fs');
var common = require('./common.js');
var ssh = require('ssh2').Client;
var dns = require('dns');

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
function Node (obj, ops) {
  // A reference to the current instance of ops
  this.ops = ops;
  this.log = ops.log;
  this.error = false;
  // Default settings
  if (typeof obj !== 'object') {
    obj = { name: obj };
  }
  if (typeof obj.name !== 'string') {
    this.error = 'ops.nodes: I dont understand that input';
    obj.name = '';
  }
  this.data = obj;
  if (this.data.target === undefined) {
    this.data.target = obj.name;
  }
  if (this.data.via === undefined) {
    this.data.via = common.DEFAULT_VIA;
  }
  if (this.data.loader === undefined) {
    this.data.loader = common.DEFAULT_LOADER;
  }
  if (this.error) {
    this.log.error(this.error);
    return false;
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
  if (this.error) {
    callback(false);
    return self;
  }
  // Sever connection if one already exists
  self.connected = false;
  // Attempt to resolve the address.
  // Bear in mind, we dont actually use the resolved address in any way
  // We do this to massively speed up
  dns.resolve(self.data.target, function (err) {
    if (err) {
      self.log.warn('Unable to resolve an IP for "' + self.data.target + '"');
      callback(false);
    } else {
      switch(self.data.via || common.DEFAULT_VIA) {
        case 'SSH':
          // Default SSH connection info
          if (self.data.ssh === undefined) {
            self.data.ssh = {};
          }
          // Username...
          if (self.data.ssh.username === undefined) {
            self.data.ssh.username = common.USER;
          }
          // SSH Key
          if (self.data.ssh.identity === undefined) {
            self.data.ssh.identity = common.HOME + '/.ssh/id_rsa';
          }
          // Host
          if (self.data.ssh.host === undefined) {
            self.data.ssh.host = self.data.target;
          }
          // If an identifiy was defined, lets load it.
          if (self.data.ssh.identity !== undefined) {
            if (fs.existsSync(self.data.ssh.identity)) {
              self.log.debug('node.connect(): Loading default key');
              self.data.ssh.privateKey = fs.readFileSync(self.data.ssh.identity);
            }
          }
          // https://github.com/mscdex/ssh2
          self._sshconn = new ssh();
          self._sshconn.on('ready', function () {
            self.emit('connected');
            self.connected = true;
            callback(true);
          });
          self._sshconn.on('error', function (err) {
            self.log.warn('Unable to SSH to "' + self.data.ssh.username + '@' +
              self.data.target + '"', 'Error:', err.message);
            callback(false);
          });
          self._sshconn.connect(self.data.ssh);
          break;
        default:
          self.log.error('node.connect(): via', self.data.via, 'is not supported');
          callback(false);
          break;
      }
    }
  });
  return self;
};

/**
 * Disconnets all connections to the given node (mostly used by testing)
 *
 * @fires Node#disconnected
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.disconnect = function (callback) {
  var self = this;
  if (callback === undefined) {
    callback = function () {};
  }
  if (self.connected) {
    callback();
  } else {
    callback();
  }
  return self;
};

/**
 * Runs code on remote servers
 *
 * @fires Node#disconnected
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.exec = function (cmd, callback) {
  var self = this;
  if (self.error) {
    callback(false);
    return self;
  }
  if (!self.connected) {
    self.log.warn('node.exec(): Not connected to "' + self.data.target + '"');
    callback(false);
    return self;
  }
  if (typeof cmd !== 'string') {
    self.log.warn('node.exec(): I dont support that format for cmd yet');
  }
  switch(self.data.via || common.DEFAULT_VIA) {
    case 'SSH':
      self._sshconn.shell(function (err, stream) {
        if (err) {
          self.log.warn('node.exec(): Unable to open shell on "' +
            self.data.target + '"', 'Error:', err.message);
        }
        // String buffer for incoming data
        var buff = '';
        stream.on('close', function(code, signal) {
          if (!self.ops.persistent) {
            self.log.debug('node.exec(): Ending SSH connection');
            self._sshconn.end();
          }
          callback(code, signal);
        }).on('data', function(data) {
          buff = buff + data;
          if (buff.indexOf('\n') > -1) {
            process.stdout.write(buff);
            buff = '';
          }
        }).stderr.on('data', function(data) {
          process.stdout.write('STDERR: ' + data);
        });
        // Run the command on the foriegn host!
        self.log.debug('node.exec(): Writing: "' + cmd + '"');
        stream.write(cmd + '\n');
        stream.end('exit\n');
      });
      break;
    default:
      self.log.error('node.exec(): via', self.data.via, 'is not supported');
      callback(false);
      break;
  }
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
  if (self.error) {
    callback(false);
    return self;
  }
  switch(this.data.loader || common.DEFAULT_LOADER) {
    case 'JSON':
      var target = common.OPS_DIR + self.data.name + '.json';
      var payload = JSON.stringify(self.data, null, 2);
      //console.log('writing data', payload, 'to file', target);
      fs.writeFileSync(target, payload);
      /** @event Node#saved */
      self.emit('saved');
      if (callback !== undefined) {
        callback();
      }
      break;
    default:
      self.log.error('node.save(): loader', self.data.loader, 'is not supported');
      break;
  }
  return self;
};

/**
 * Load the nodes config info based on the loader
 * Fails silently on windows for no particular reason....
 *
 * @todo Swap to ASYNC fs operations without breaking windows support
 * @todo What happens when loading a currupt file? Or during a failed load? This should be standard.
 * @fires Node#loaded
 * @returns {Node} - returns self for chaining purposes
 */
Node.prototype.load = function (callback) {
  var self = this;
  var name = self.data.name;
  switch(this.data.loader || common.DEFAULT_LOADER) {
    case 'JSON':
      var target = common.OPS_DIR + name + '.json';
      var data = { name: name };
      // If there is data to load...
      if(fs.existsSync(target)) {
        data = fs.readFileSync(target).toString();
        try {
          data = JSON.parse(data);
        } catch (err) {
          self.log.warn('Failed to parse JSON from file', target, 'error:', err.message);
          // The next time this node is saved, it will overwrite whatever is in that file
          // TODO: Should move that file aside
          data = {};
        }
        if (name !== data.name) {
          self.log.warn('You loaded a node file with contains a different .name than it\'s filename ' +
            'and different than the name you gave to .nodes(). I\'ll correct the file\'s .name for you');
          data.name = name;
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
      self.log.error('node.load(): loader', this.data.loader, 'is not supported');
      break;
  }
  return self;
};

module.exports = Node;
