'use strict';

var Orchestrator = require('orchestrator'),
  util = require('util'),
  Stream = require('stream'),
  fs = require('fs'),
  common = require('./common.js'),
  log = common.log,
  Node = require('./node.js');

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
}
util.inherits(Opsjs, Orchestrator);

/** Task is an alias for Orchestrator's add */
Opsjs.prototype.task = Opsjs.prototype.add;

/** Node objects are loaded here during runtime */
Opsjs.prototype.nodes = {};

/**
 * Target's nodes by name - starts a stream
 *
 * @param {string|string[]} nodes - A single node name or array of names
 * @returns {Stream}
 */
Opsjs.prototype.nodes = function (nodes) {
  var self = this,
    stream = new Stream.Readable();
  // If a string was provided, convert to an array
  if (typeof nodes === 'string') {
    nodes = [nodes];
  }
  // Error if some other datatype
  if (nodes === undefined || nodes.isArray === false || typeof nodes !== 'object') {
    log.error('ops.nodes: I dont understand that input');
    return false;
  }
  nodes.forEach(function (node, i) {
    var name = node;
    if (typeof name === 'string') {
      if (self.nodes[name] === undefined) {
        self.nodes[name] = new Node({
          name: name
        });
      }
    } else if (typeof node === 'object') {
      name = node.name;
      if (self.nodes[name] === undefined) {
        self.nodes[name] = new Node(node);
      }
    }
    self.nodes[name].load(function () {
      stream.push(name);
      if (nodes.length === i+1) {
        stream.push(null);
      }
    });
  });
  return stream;
};

/**
 * Executes either shell code (a string) or a javascript function on
 * remote hosts in the stream
 *
 * @param {string|function} execCode - A string of shell code or a JS function
 * @returns {Stream}
 */
Opsjs.prototype.exec = function (execCode) {
  var self = this,
    stream = new Stream.Transform({ objectMode: true });
  // If a string was provided, we're executing a bash command
  if (typeof execCode === 'string') {
    stream._transform = function (obj, encoding, cb) {
      var name = obj.toString(),
        node = self.nodes[name];
      if (node === undefined) {
        log.error('ops.exec: No such node', name);
      }
      node.connect(function () {
        cb(null, obj);
      });
    };
  // If a function was provided, we're executing via the remote nodes js runtime
  // } else if (typeof execCode === 'function') {
  //   log.error('ops.exec: I dont support that yet');
  //   return false;
  } else {
    log.error('ops.exec: I dont understand that input');
    return false;
  }
  return stream;
};

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
  var stream = new Stream.Transform({ objectMode: true }),
    self = this;
  stream._transform = function (obj, encoding, cb) {
    var nodeName = obj.toString(),
      ourNode = self.nodes[nodeName];
    if (ourNode instanceof Node) {
      ourNode.save(function () {
        cb(null, obj);
      });
    }
  };
  return stream;
};

/**
 * Easily transform a function into a stream operator
 *
 * @returns {Stream}
 */
Opsjs.prototype.simple = function (exec) {
  var stream = new Stream.Transform({ objectMode: true });
  stream._transform = function (obj, encoding, cb) {
    exec(obj.toString(), function () {
      cb(null, obj);
    });
  };
  return stream;
};

module.exports = Opsjs;
