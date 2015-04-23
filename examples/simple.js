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

//ops.nodes(nodes)
//  .pipe(ops.save())
//  .pipe(ops.exec('ls -al', {
//    onNodeComplete: function (output) {
//      console.log(output);
//    }
//  }))
//  .pipe(ops.disconnect());

ops.nodes(nodes)
  .pipe(ops.save())
  .pipe(ops.package('nginx', {
    onNodeComplete: function (output) {
      console.log(output);
    }
  }))
  .pipe(ops.disconnect());
