# Opsjs [![Circle CI](https://circleci.com/gh/erulabs/opsjs/tree/master.png)](https://circleci.com/gh/erulabs/opsjs/tree/master)
**The streaming infrastructure build system**

[![Coverage Status](https://coveralls.io/repos/erulabs/opsjs/badge.svg?branch=master)](https://coveralls.io/r/erulabs/opsjs?branch=master) [![Code Climate](https://codeclimate.com/github/erulabs/opsjs/badges/gpa.svg)](https://codeclimate.com/github/erulabs/opsjs) [![Dependency Status](https://gemnasium.com/erulabs/opsjs.svg)](https://gemnasium.com/erulabs/opsjs) [![Stories in Ready](https://badge.waffle.io/erulabs/opsjs.png?label=ready&title=Ready)](https://waffle.io/erulabs/opsjs)

```javascript
var ops = require('opsjs'),
  aws = require('ops-aws'),
  myServers = ['app-1', 'app-2'];

// Define a task
ops.task('provision_rs', function () {
  // .nodes similar to gulp's .src
  ops.nodes(myServers)
    // Open an SSH connection to each host
    .pipe(ops.connect())
    // Run a shell command!
    .pipe(ops.exec('ls -al')
      // See output per host...
      .on('nodeComplete', function (node, output) {
        console.log(node.data.name, 'says', output);
      }))
    // Install a package!
    .pipe(ops.package('nginx')
      // Run a function when all hosts are complete with this step
      .on('complete', function () {
        console.log('All nodes have nginx installed');
      }))
    // Disconnect nodes when all tasks are done :)
    .pipe(ops.disconnect());
});

// COMING SOON - none of this stuff exists yet:
// An example of deploying an application to our newly built nodes!
ops.task('deploy_app', function () {
  // Select the name servers
  ops.nodes(myServers)
    // Use a plugin to stream server builds against cloud providers
    .pipe(aws.servers({
      ImageId: 'ami-1624987f', // Amazon Linux AMI x86_64 EBS
      InstanceType: 't1.micro',
    }))
    // ops.deploy will throw an error if it has no way of connecting
    // Obviously that can be because the connection is faulty, but also if the node hasnt been provisioned yet.
    .pipe(ops.deploy({
      path: '/var/www/app',
      git: 'git@github.com:erulabs/node_test',
      branch: 'master',
      user: 'app'
    }))
    // Run arbitrary javascript because MAGIC
    .pipe(ops.exec(function () {
      console.log('you wont see this output, but it will be sent to stdout on the remote host');
    }));
    // Deploy your current local commit, restart the app, etc. An all in one "deploy my node.js app:"
    .pipe(ops.hoist({
      path: '/var/www/app2',
      user: 'app2'
    }));
});

ops.task('bootstrap', 'provision_rs', 'deploy_app');
```

## Development:

  `npm install && npm run dev`

Ops is written in plain ES5 (assuming Node >0.8) for maximum compatibility.

Style guide: https://github.com/airbnb/javascript
