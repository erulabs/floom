[![Stories in Ready](https://badge.waffle.io/erulabs/opsjs.png?label=ready&title=Ready)](https://waffle.io/erulabs/opsjs)
# Opsjs [![Circle CI](https://circleci.com/gh/erulabs/opsjs/tree/master.png)](https://circleci.com/gh/erulabs/opsjs/tree/master)
**The streaming infrastructure build system**

[![Coverage Status](https://coveralls.io/repos/erulabs/opsjs/badge.svg?branch=master)](https://coveralls.io/r/erulabs/opsjs?branch=master) [![Code Climate](https://codeclimate.com/github/erulabs/opsjs/badges/gpa.svg)](https://codeclimate.com/github/erulabs/opsjs) [![Dependency Status](https://gemnasium.com/erulabs/opsjs.svg)](https://gemnasium.com/erulabs/opsjs)

```javascript
var ops = require('opsjs'),
  aws = require('ops-aws'),
  myServers = ['app-1', 'app-2'];

// Define a task
ops.task('provision_rs', function () {
  // .node similar to gulp's .src
  ops.node(myServers)
    // Use a plugin to stream server builds against cloud providers
    .pipe(aws.servers({
      ImageId: 'ami-1624987f', // Amazon Linux AMI x86_64 EBS
      InstanceType: 't1.micro',
    }))
    // Ops provides a simple package mangement wrapper
    .pipe(ops.package('nginx'))
    // But you can also simply run shell commands...
    .pipe(ops.exec('ls -al'))
    // Even better, you can run native Javascript!
    .pipe(ops.exec(function () {
      console.log('I\'ll get run on both app-1 and app-2!');
    }));
});

// An example of deploying an application to our newly built nodes!
ops.task('deploy_app', function () {
  // Select the name servers
  ops.nodes(myServers)
    // ops.deploy will throw an error if it has no way of connecting
    // Obviously that can be because the connection is faulty, but also if the node hasnt been provisioned yet.
    .pipe(ops.deploy({
      path: '/var/www/app',
      git: 'git@github.com:erulabs/node_test',
      branch: 'master'
    }));
});

ops.task('bootstrap', 'provision_rs', 'deploy_app');
```
