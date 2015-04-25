'use strict';

var Orchestrator = require('orchestrator');
var util = require('util');
var fs = require('fs');
var _ = require('highland');
var common = require('./common.js');
var Node = require('./node.js');
var stream = require('stream');

// TODO: Should be in the cli tool, and should be optional depending on if
// any Node's require the JSON loader (or any file loader)
if (!fs.existsSync(common.OPS_DIR)) {
  fs.mkdirSync(common.OPS_DIR);
}

/**
 * Floom main class - inherits from Orchestrator
 *
 * @class
 */
function Floom () {
  Orchestrator.call(this);
  /** Attempt to use persistent connections when possible. Requires that the user use floom.end() */
  this.persistent = true;
  this.log = common.log;
}
util.inherits(Floom, Orchestrator);

/** Task is an alias for Orchestrator's add */
Floom.prototype.task = Floom.prototype.add;

/** Node objects are loaded here during runtime */
Floom.prototype._nodes = {};

/**
 * Target's nodes by name - starts a stream
 *
 * @param {string|string[]} nodes - A single node name or array of names
 * @returns {Stream}
 */
Floom.prototype.nodes = function (nodes) {
  var self = this;
  // If a string was provided, convert to an array
  if (typeof nodes === 'string') {
    nodes = [nodes];
  }
  // Error if some other datatype
  if (nodes === undefined || nodes.isArray === false || typeof nodes !== 'object') {
    self.log.error('floom.nodes: I dont understand that input');
    nodes = [];
  }
  return _(function (push) {
    nodes.forEach(function (node, i) {
      var name = node;
      if (typeof name === 'string') {
        if (self._nodes[name] === undefined) {
          self._nodes[name] = new Node({
            name: name
          }, self);
        }
      } else if (typeof node === 'object') {
        name = node.name;
        if (self._nodes[name] === undefined) {
          self._nodes[name] = new Node(node, self);
        }
      }
      self._nodes[name].load(function () {
        push(null, name);
        if (nodes.length === i+1) {
          push(null, _.nil);
        }
      });
    });
  });
};


/**
 * Easily transform a function into a stream operator
 * @param {function} cb - A function which is fired with (nodeName, callback)
 * @returns {Stream}
 */
Floom.prototype.simple = function (callback) {
  var self = this;
  var consumer = new stream.Transform();
  consumer._transform = function (chunk, enc, streamCompleteCallback) {
    callback(self._nodes[chunk.toString()], streamCompleteCallback);
  };
  return consumer;
};


/**
 * Executes either shell code (a string) or a javascript function on
 * remote hosts in the stream
 *
 * @param {string|function} execCode - A string of shell code or a JS function
 * @fires exec#complete
 * @returns {Stream}
 */
Floom.prototype.exec = function (cmdObj) {
  var self = this;
  var dispatches = 0;
  if (typeof cmdObj === 'string') {
    cmdObj = { command: cmdObj };
  }
  var stream = self.simple(function (node, callback) {
    node.exec(cmdObj.command)
      .on('complete', function (stdout, code, signal) {
        stream.emit('nodeComplete', node, stdout, code, signal);
        if (--dispatches === 0) {
          stream.emit('complete');
        }
        callback(null, node.data.name);
      });
  });
  return stream;
};
/** An alias of Floom.prototype.exec */
Floom.prototype.execute = Floom.prototype.exec;

/**
 * Installs a package on a remote system. As a prototype, we'll target 'apt' only.
 *
 * @todo
 * @param {string|function} execCode - A string of shell code or a JS function
 * @fires package#complete
 * @returns {Stream}
 */
Floom.prototype.package = function (packages) {
  var self = this;
  var dispatches = 0;
  if (typeof packages === 'string') {
    packages = packages.split(' ');
  }
  var stream = self.simple(function (node, callback) {
    self.log.debug('floom.package(): Installing', packages.join(', '));
    dispatches++;
    node.exec('sudo apt-get install -y ' + packages.join(' '))
      .on('complete', function (stdout, code, signal) {
        stream.emit('nodeComplete', node, stdout, code, signal);
        if (--dispatches === 0) {
          stream.emit('complete');
        }
        callback(null, node.data.name);
      });
  });
  return stream;
};


/**
 * Saves the state of nodes passed in via the nodes .save() function
 * Saving state shouldn't be required, ever, as all tools should be idempotent independently
 * However, saving state allows certain tools to work more quickly.
 * As an example, a cloud provider plugin should be able to search for nodes based on their name,
 * Populating stuff like IP info dynamically based on the providers API
 * However, it would add the IP add to the Nodes ".data" object, which could get saved by Floom's .save();
 * This means later, you could run a different task and it wouldn't be confused (ie: it would have the IP saved locally)
 * This is very complex, and hence saving is optional.
 *
 * @summary Triggers Node's "save" method
 * @returns {Stream}
 */
Floom.prototype.save = function () {
  var self = this;
  return self.simple(function (node, callback) {
    self.log.debug('floom.save(): Saving all node data');
    node.save(function (error) {
      if (error) {
        self.log.error('floom.save(' + node.data.name + '): Error:', error);
      }
      callback(null, node.data.name);
    });
  });
};

/**
 * Connects all nodes
 *
 * @returns {Stream}
 */
Floom.prototype.connect = function () {
  var self = this;
  return self.simple(function (node, callback) {
    self.log.debug('floom.connect(): Opening SSH connections');
    node.connect(function () {
      callback(null, node.data.name);
    });
  });
};
/** An alias of Floom.prototype.connect */
Floom.prototype.start = Floom.prototype.connect;

/**
 * Disconnects all nodes
 *
 * @returns {Stream}
 */
Floom.prototype.disconnect = function () {
  var self = this;
  return self.simple(function (node, callback) {
    self.log.debug('floom.disconnect(): Ending all SSH connections');
    node.disconnect(function () {
      callback(null, node.data.name);
    });
  });
};
/** An alias of Floom.prototype.disconnect */
Floom.prototype.end = Floom.prototype.disconnect;

module.exports = Floom;
