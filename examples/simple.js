'use strict';

var ops = require('./../index.js');

// var nodes = [
//   {
//     name: 'erulabs.com',
//     ssh: {
//       username: 'seandon'
//     }
//   }
// ];
//
// ops.log.level = 'debug';
//
// ops.nodes(nodes)
//   .pipe(ops.save())
//   .pipe(ops.exec('ls -al'))
//   .pipe(ops.end());

var nodes = [
  {
    name: 'erulabs.com',
    ssh: {
      username: 'seandon'
    }
  }
];
ops.nodes(nodes)
  .pipe(ops.simple(function (node, callback) {
    callback();
  }))
  .pipe(ops.disconnect());
