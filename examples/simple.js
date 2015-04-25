'use strict';

var floom = require('./../index.js');

var nodes = [
  {
    name: 'erulabs.com',
    ssh: {
      username: 'seandon'
    }
  }
];

floom.log.level = 'debug';

floom.nodes(nodes)
  .pipe(floom.connect())
  .pipe(floom.exec('ls -al')
    .on('nodeComplete', function (node, output) {
      console.log(node.data.name, 'says', output);
    }))
  .pipe(floom.package('nginx')
    .on('complete', function () {
      console.log('All nodes have nginx installed');
    }))
  .pipe(floom.disconnect());

//console.log(floom.package('text').on);

//floom.nodes(nodes)
//  .pipe(floom.save())
//  .pipe(floom.package('nginx')
//    .on('nodeComplete', function (node, output) {
//      console.log(node.data.name, 'says', output);
//    }))
//  .pipe(floom.disconnect());
//
