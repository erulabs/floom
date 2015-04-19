'use strict';

var ops = require('./../index.js');

var nodes = [
  {
    name: 'erulabs.com',
    ssh: {
      username: 'seandon'
    }
  }
];

ops.log.level = 'debug';
ops.persistent = true;

ops.nodes(nodes)
  .pipe(ops.save())
  .pipe(ops.exec('ls -al', function (output) {
    console.log(output);
  }))
  .pipe(ops.disconnect());

//var nodes = [
//  {
//    name: 'erulabs.com',
//    ssh: {
//      username: 'seandon'
//    }
//  }
//];
//ops.nodes(nodes)
//  .pipe(ops.simple(function (node, callback) {
//    callback();
//  }))
//  .pipe(ops.disconnect());
