'use strict';

var gulp = require('gulp'),
  watch = require('gulp-watch'),
  seq = require('run-sequence'),
  jshint = require('gulp-jshint'),
  exec = require('gulp-exec');

var ALL_FILES = ['./lib/*.js', './test/*.js'];

gulp.task('test', function () {
  gulp.src('test/*.js', {read: false})
    .pipe(exec('node node_modules/mocha/bin/mocha', {
      continueOnError: true
    }))
    .pipe(exec.reporter({
      err: false
    }))
    .on('error', function (err) {
      console.log(err.toString());
      this.emit('end');
    });
});

gulp.task('lint', function () {
  gulp.src(ALL_FILES)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .on('error', function (err) {
      console.log(err.toString());
      this.emit('end');
    });
});

gulp.task('watch', ['default'], function () {
  watch(ALL_FILES, function () { seq(['default']); });
});

gulp.task('default', ['lint', 'test']);
