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
 * Opsjs main class - inherits from Orchestrator
 *
 * @class
 */
function Opsjs () {
  Orchestrator.call(this);
  /** Attempt to use persistent connections when possible (requires the the user) use ops.end() */
  this.persistent = false;
  this.log = common.log;
}
util.inherits(Opsjs, Orchestrator);

/** Task is an alias for Orchestrator's add */
Opsjs.prototype.task = Opsjs.prototype.add;

/** Node objects are loaded here during runtime */
Opsjs.prototype._nodes = {};

/**
 * Target's nodes by name - starts a stream
 *
 * @param {string|string[]} nodes - A single node name or array of names
 * @returns {Stream}
 */
Opsjs.prototype.nodes = function (nodes) {
  var self = this;
  // If a string was provided, convert to an array
  if (typeof nodes === 'string') {
    nodes = [nodes];
  }
  // Error if some other datatype
  if (nodes === undefined || nodes.isArray === false || typeof nodes !== 'object') {
    self.log.error('ops.nodes: I dont understand that input');
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

var Consumer = function (_exec) {
  stream.Transform.call(this);
  this._exec = _exec;
};
util.inherits(Consumer, stream.Transform);

Consumer.prototype._transform = function (chunk, enc, cb) {
  this._exec(chunk.toString(), cb);
};


/**
 * Easily transform a function into a stream operator
 * @param {function} cb - A function which is fired with (nodeName, callback)
 * @returns {Stream}
 */
Opsjs.prototype.simple = function (cb) {
  var self = this;
  var consumer = new Consumer (function (node, callback) {
    cb(self._nodes[node], callback);
  });
  return consumer;
};


/**
 * Executes either shell code (a string) or a javascript function on
 * remote hosts in the stream
 *
 * @param {string|function} execCode - A string of shell code or a JS function
 * @returns {Stream}
 */
Opsjs.prototype.exec = function (execCode) {
  var self = this;
  self.log.debug('ops.exec(): Attempting to execute on all nodes');
  return self.simple(function (node, callback) {
    if (node.connected) {
      node.exec(execCode, function () {
        callback(null, node.data.name);
      });
    } else {
      node.connect(function () {
        node.exec(execCode, function () {
          callback(null, node.data.name);
        });
      });
    }
  });
};
/** An alias of Opsjs.prototype.exec */
Opsjs.prototype.execute = Opsjs.prototype.exec;

/**
 * Saves the state of nodes passed in via the nodes .save() function
 * Saving state shouldn't be required, ever, as all tools should be idempotent independently
 * However, saving state allows certain tools to work more quickly.
 * As an example, a cloud provider plugin should be able to search for nodes based on their name,
 * Populating stuff like IP info dynamically based on the providers API
 * However, it would add the IP add to the Nodes ".data" object, which could get saved by Opsjs's .save();
 * This means later, you could run a different task and it wouldn't be confused (ie: it would have the IP saved locally)
 * This is very complex, and hence saving is optional.
 *
 * @summary Triggers Node's "save" method
 * @returns {Stream}
 */
Opsjs.prototype.save = function () {
  var self = this;
  this.log.debug('ops.save(): Saving all node data');
  return self.simple(function (node, callback) {
    node.save(function () {
      callback(null, node.data.name);
    });
  });
};

/**
 * Disconnects all nodes
 *
 * @returns {Stream}
 */
Opsjs.prototype.disconnect = function () {
  var self = this;
  this.log.debug('ops.disconnect(): Ending all SSH connections');
  return self.simple(function (node, callback) {
    node.disconnect(function () {
      callback(null, node.data.name);
    });
  });
};
/** An alias of Opsjs.prototype.disconnect */
Opsjs.prototype.end = Opsjs.prototype.disconnect;

module.exports = Opsjs;
