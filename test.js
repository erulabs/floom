'use strict';

var _ = require('highland');
var util = require('util');
var stream = require('stream');

function nodes () {
  // create a new Stream
  return _(function (push) {
    // do something async when we read from the Stream
    setTimeout(function () {
      push(null, 'hello');
    }, 1000);
    setTimeout(function () {
      push(null, 'hello2');
    }, 2000);
    setTimeout(function () {
      push(null, 'hello3');
    }, 3000);
    setTimeout(function () {
      push(null, 'hello4');
      push(null, _.nil);
    }, 4000);
  });
}


// var consumer = {
//   on: function (event, cb) {},
//   write: function (data) {
//     console.log('write:', data, arguments);
//   },
//   end: function () {
//
//   }
// };

function Consumer () {
  stream.Transform.call(this);
}
util.inherits(Consumer, stream.Transform);

Consumer.prototype._transform = function (chunk, enc, cb) {
  // our memory store stores things in buffers
  var buffer = (Buffer.isBuffer(chunk)) ?
    chunk :  // already is Buffer use it
    new Buffer(chunk, enc);  // string, convert

  // concat to the buffer already there
  console.log('saw buff:', buffer.toString());
  cb(null, buffer.toString());
};

var consumer = new Consumer();
var consumer2 = new Consumer();

consumer.on('finish', function () {
  console.log('finished writing');
});

nodes().pipe(consumer).pipe(consumer2);


