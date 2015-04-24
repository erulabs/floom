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
ops.persistent = false;

ops.nodes(nodes)
  .pipe(ops.start())
  .pipe(ops.exec('ls -al')
    .on('nodeComplete', function (node, output) {
      console.log(node.data.name, 'says', output);
    }))
  .pipe(ops.end());

//console.log(ops.package('text').on);

//ops.nodes(nodes)
//  .pipe(ops.save())
//  .pipe(ops.package('nginx')
//    .on('nodeComplete', function (node, output) {
//      console.log(node.data.name, 'says', output);
//    }))
//  .pipe(ops.disconnect());
//
