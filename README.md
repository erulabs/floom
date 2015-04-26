# Floom [![Circle CI](https://circleci.com/gh/erulabs/floom/tree/master.png)](https://circleci.com/gh/erulabs/floom/tree/master)
**The streaming infrastructure build system**

[![Coverage Status](https://coveralls.io/repos/erulabs/floom/badge.svg?branch=master)](https://coveralls.io/r/erulabs/floom?branch=master) [![Code Climate](https://codeclimate.com/github/erulabs/floom/badges/gpa.svg)](https://codeclimate.com/github/erulabs/floom) [![Dependency Status](https://gemnasium.com/erulabs/floom.svg)](https://gemnasium.com/erulabs/floom) [![Stories in Ready](https://badge.waffle.io/erulabs/floom.png?label=ready&title=Ready)](https://waffle.io/erulabs/floom)

Install CLI globally: `npm install -g floom`
Install to project: `npm install floom`

Write a `floomfile.js`:

```javascript
var floom = require('floom'),
  myServers = ['app-1', 'app-2'];

// Define a task
floom.task('provision_rs', function () {
  // .nodes similar to gulp's .src
  floom.nodes(myServers)
    // Open an SSH connection to each host
    .pipe(floom.connect())
    // Run a shell command!
    .pipe(floom.exec('ls -al')
      // See output per host...
      .on('nodeComplete', function (node, output) {
        console.log(node.data.name, 'says', output);
      }))
    // Install a package!
    .pipe(floom.package('nginx')
      // Run a function when all hosts are complete with this step
      .on('complete', function () {
        console.log('All nodes have nginx installed');
      }))
    // Disconnect nodes when all tasks are done :)
    .pipe(floom.disconnect());
});

// COMING SOON - none of this stuff exists yet:
// An example of deploying an application to our newly built nodes!
var aws = require('floom-aws');
floom.task('deploy_app', function () {
  // Select the name servers
  floom.nodes(myServers)
    // Use a plugin to stream server builds against cloud providers
    .pipe(aws.servers({
      ImageId: 'ami-1624987f', // Amazon Linux AMI x86_64 EBS
      InstanceType: 't1.micro',
    }))
    // floom.deploy will throw an error if it has no way of connecting
    // Obviously that can be because the connection is faulty, but also if the node hasnt been provisioned yet.
    .pipe(floom.deploy({
      path: '/var/www/app',
      git: 'git@github.com:erulabs/node_test',
      branch: 'master',
      user: 'app'
    }))
    // Run arbitrary javascript because MAGIC
    .pipe(floom.exec(function () {
      console.log('you wont see this output, but it will be sent to stdout on the remote host');
    }));
    // Deploy your current local commit, restart the app, etc. An all in one "deploy my node.js app:"
    .pipe(floom.hoist({
      path: '/var/www/app2',
      user: 'app2'
    }));
});

floom.task('bootstrap', 'provision_rs', 'deploy_app');
```

## Development:

  `npm install && npm run dev`

Floom is written in plain ES5 (assuming Node >0.8) for maximum compatibility.

Style guide: https://github.com/airbnb/javascript
