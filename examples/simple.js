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
  .pipe(ops.exec('ls -al'))
  .pipe(ops.end());
