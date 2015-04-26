#!/usr/bin/env node
'use strict';

var Liftoff = require('liftoff');
var chalk = require('chalk');
var argv = require('minimist')(process.argv.slice(2));
var common = require('../lib/common.js');
var log = common.log;
var tildify = require('tildify');
var cliPackage = require('../package.json');
var semver = require('semver');

var cli = new Liftoff({
  name: 'floom'
});

var failed = false;
process.once('exit', function (code) {
  if (code === 0 && failed) {
    process.exit(1);
  }
});

var versionFlag = argv.v || argv.version;
var tasks = argv._;
var toRun = tasks.length ? tasks : ['default'];

cli.on('require', function(name) {
  log.info('Requiring external module', chalk.magenta(name));
});

cli.on('requireFail', function(name) {
  log.warn(chalk.red('Failed to load external module'), chalk.magenta(name));
});

cli.on('respawn', function(flags, child) {
  var nodeFlags = chalk.magenta(flags.join(', '));
  var pid = chalk.magenta(child.pid);
  log.warn('Node flags detected:', nodeFlags);
  log.warn('Respawned to PID:', pid);
});

cli.launch({
  cwd: argv.cwd,
  configPath: argv.gulpfile,
  require: argv.require,
  completion: argv.completion,
}, function handleArguments(env) {
  if (versionFlag && tasks.length === 0) {
    log.info('CLI version', cliPackage.version);
    if (env.modulePackage && typeof env.modulePackage.version !== 'undefined') {
      log.info('Local version', env.modulePackage.version);
    }
    process.exit(0);
  }

  if (!env.modulePath) {
    log.info(
      chalk.red('Local floom not found in'),
      chalk.magenta(tildify(env.cwd))
    );
    log.info(chalk.red('Try running: npm install floom'));
    process.exit(1);
  }

  if (!env.configPath) {
    log.info(chalk.red('No floomfile found'));
    process.exit(1);
  }

  // Check for semver difference between cli and local installation
  if (semver.gt(cliPackage.version, env.modulePackage.version)) {
    log.info(chalk.red('Warning: gulp version mismatch:'));
    log.info(chalk.red('Global gulp is', cliPackage.version));
    log.info(chalk.red('Local gulp is', env.modulePackage.version));
  }

  // Chdir before requiring floomfile to make sure
  // we let them chdir as needed
  if (process.cwd() !== env.cwd) {
    process.chdir(env.cwd);
    log.info(
      'Working directory changed to',
      chalk.magenta(tildify(env.cwd))
    );
  }

  // This is what actually loads up the gulpfile
  require(env.configPath);
  log.info('Using gulpfile', chalk.magenta(tildify(env.configPath)));

  var floomInst = require(env.modulePath);

  process.nextTick(function() {
    floomInst.start.apply(floomInst, toRun);
  });
});
