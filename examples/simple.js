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

ops.nodes(nodes)
  .pipe(ops.connect())
  .pipe(ops.exec('ls -al')
    .on('nodeComplete', function (node, output) {
      console.log(node.data.name, 'says', output);
    }))
  .pipe(ops.package('nginx')
    .on('complete', function () {
      console.log('All nodes have nginx installed');
    }))
  .pipe(ops.disconnect());

//console.log(ops.package('text').on);

//ops.nodes(nodes)
//  .pipe(ops.save())
//  .pipe(ops.package('nginx')
//    .on('nodeComplete', function (node, output) {
//      console.log(node.data.name, 'says', output);
//    }))
//  .pipe(ops.disconnect());
//
