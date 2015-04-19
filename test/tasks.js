'use strict';

require('mocha');
var Opsjs = require('../lib/ops.js'),
  common = require('../lib/common.js'),
  Node = require('../lib/node.js'),
  ops = new Opsjs(),
  should = require('should'),
  fs = require('fs'),
  Stream = require('stream'),
  events = require('events');

if (process.env.NODE_ENV === 'test') {
  ops.log.level = 0;
}

describe('ops', function () {
  describe('init', function () {
    it('should create OPS_DIR', function () {
      fs.existsSync(common.OPS_DIR).should.equal(true);
    });
  });
  describe('.task()', function () {
    it('should define a task', function (done) {
      var fn = function () {};
      ops.task('test', fn);
      should.exist(ops.tasks.test);
      ops.tasks.test.fn.should.equal(fn);
      ops.reset();
      done();
    });
  });
  describe('.nodes()', function () {
    it('should return a highland Stream', function (done) {
      ops.nodes('app-0').__HighlandStream__.should.equal(true);
      done();
    });
    it('should define nodes', function (done) {
      // Preseed one of the files just to make sure loading works the same way if there is a file or not.
      fs.writeFileSync(common.OPS_DIR + '/app-2.json', JSON.stringify({
        name: 'app-2'
      }, null, 2));
      // Preseed another with currupted json
      fs.writeFileSync(common.OPS_DIR + '/app-3.json', '2sdknf34', null, 2);
      // Preseed another with the wrong name
      fs.writeFileSync(common.OPS_DIR + '/app-4.json', JSON.stringify({
        name: 'Something_that_doesnt_exist'
      }, null, 2));
      var nodes = ['app-1', 'app-2', 'app-3', 'app-4'];
      var i = 1;
      function beDone () {
        i += 1;
        if (i === nodes.length) {
          done();
        }
      }
      ops.nodes(nodes)
        .pipe(ops.simple(function (node, callback) {
          node.should.be.an.instanceof(Node);
          beDone();
          callback();
        }));
    });
  });
  describe('.save()', function () {
    it('should return a readable Stream', function () {
      ops.save().should.be.an.instanceof(Stream.Transform);
    });
    it('should save nodes to the .ops directory', function (done) {
      var nodes = ['app-3', {
        name: 'app-4',
        via: 'Something_that_doesnt_exist',
        loader: 'Something_that_doesnt_exist'
      }];
      var i = 1;
      function beDone () {
        i += 1;
        if (i === nodes.length) {
          done();
        }
      }
      ops.nodes(nodes)
        .pipe(ops.save())
        .pipe(ops.simple(function (node, callback) {
          fs.existsSync(common.OPS_DIR + node.data.name + '.json').should.equal(true);
          node.should.be.an.instanceof(Node);
          beDone();
          callback();
        }))
        .pipe(ops.disconnect());
    });
  });
  describe('.exec()', function () {
    it('should return a readable Stream', function () {
      ops.exec('ls -al').should.be.an.instanceof(Stream.Readable);
    });
    it('should run shell commands on foreign hosts', function (done) {
      var nodes = ['app-5', 'app-6'];
      var i = 1;
      function beDone () {
        i += 1;
        if (i === nodes.length) {
          done();
        }
      }
      ops.nodes(nodes)
        // TODO: Turn this test back on.
        // Need to mock a real SSH service to test this properly
        //.pipe(ops.exec('ls -al'))
        .pipe(ops.simple(function (node, callback) {
          node.should.be.an.instanceof(Node);
          beDone();
          callback();
        }))
        .pipe(ops.end());
    });
  });
});

describe('Node', function () {
  describe('new Node()', function () {
    it('should return an EventEmitter', function () {
      var inst = new Node('some_name', ops);
      inst.should.be.an.instanceof(events.EventEmitter);
    });
    it('should reject poorly named nodes', function () {
      var inst = new Node(true, ops);
      (typeof inst.error).should.equal('string');
    });
  });
  describe('.save()', function () {
    it('should fire the saved event', function (done) {
      var inst = new Node('some_name', ops);
      inst.on('saved', function () {
        done();
      });
      inst.save().should.be.an.instanceof(Node);
    });
  });
  describe('.load()', function () {
    it('should fire the loaded event', function (done) {
      var inst = new Node('some_name', ops);
      inst.on('loaded', function () {
        done();
      });
      inst.load().should.be.an.instanceof(Node);
    });
  });
  describe('.connect()', function () {
    it('should fire the loaded event', function (done) {
      var inst = new Node('erulabs.com', ops);
      inst.connect(function () {
        done();
        inst.disconnect(function () {}).should.be.an.instanceof(Node);
      }).should.be.an.instanceof(Node);
    });
    it('should reject bad vias', function (done) {
      var inst = new Node({
        name: 'erulabs.com',
        via: 'Something_that_doesnt_exist'
      }, ops);
      inst.connect(function (connected) {
        connected.should.equal(false);
        done();
      });
    });
  });
});

describe('common', function () {
  describe('OPS_DIR', function () {
    it('should be defined', function (done) {
      (typeof common.OPS_DIR).should.equal('string');
      done();
    });
  });
});

