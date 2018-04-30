/**
 * This script does the following functions
 * 
 * 1. Listens to keyboard and mouse event in /dev/input
 * 2. If any event happens, update a timestamp.
 * 3. Periodically check if any event has occurred.
 *    - If yes, do nothing
 *    - If no, do a left mouse click using xdotool.
 * 
 * Relevant Scripts:
 * https://github.com/tomasmigone/rpi-scripts/blob/c65b8e3c65162e2f8b1e8c58d8635609045e0743/touchscreen/touch.py
 * https://github.com/mitasovr/hidproxy/blob/8cdcaab5c5d1c397e4703254982997563bc10f84/mouse.js
 * 
 */
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const eventDebug = require('debug')('event');
const configDebug = require('debug')('config');
const error = require('debug')('error');

const keyboardBuffer = new Buffer.alloc(24);
const mouseBuffer = new Buffer.alloc(3);
let keyboardFd, mouseFd;
let lastKeyTime = 0;

const onKeyboardOpen = function (err, fd) {
  if(err) {
    return error('Unable to open keyboard', err);
  }
  eventDebug('onKeyboardOpen with fd', fd);
  keyboardFd = fd;
  startKeyboardRead(keyboardFd);
};

const onMouseOpen = function (err, fd) {
  if(err) {
    return error('Unable to open keyboard', err);
  }
  eventDebug('onMouseOpen with fd', fd);
  mouseFd = fd;
  startMouseRead(mouseFd);
};

const startKeyboardRead = function (fd) {  
  fs.read(fd, keyboardBuffer, 0, 24, null, onKeyboardRead);
};

const startMouseRead = function (fd) {  
  fs.read(fd, mouseBuffer, 0, 3, null, onMouseRead);
};

const parseKeyboardEvent = function() {
  eventDebug('keyboard event');

  // Keyboard event struct is defined as the following.
  // https://www.kernel.org/doc/html/v4.12/input/input.html#event-interface
  //
  // struct input_event {
  //   struct timeval time;
  //   unsigned short type;
  //   unsigned short code;
  //   unsigned int value;
  // };
  //
  // Sample code on how to decode the buffer
  //
  // let offset = 0;
  // let tv_sec = (keyboardBuffer.readUInt32LE(offset) << 8) + keyboardBuffer.readUInt32LE(offset+4);
  // offset+=8;
  // let tv_usec = (keyboardBuffer.readUInt32LE(offset) << 8) + keyboardBuffer.readUInt32LE(offset+4)
  // offset+=8;
  // let type = keyboardBuffer.readUInt16LE(offset)
  // offset+=2;
  // let code = keyboardBuffer.readUInt16LE(offset)
  // offset+=2;
  // let value = keyboardBuffer.readUInt32LE(offset)
  // offset+=4;

  lastKeyTime = Date.now();
};

const parseMouseEvent = function() {
  eventDebug('mouse event');
  // PS2 mouse packet is 3 bytes
  // See https://wiki.osdev.org/Mouse_Input
  //
  // Sample code on how to decode the buffer
  //
  // var event = {
  //   leftBtn:    (mouseBuffer[0] & 1  ) > 0, // Bit 0
  //   rightBtn:   (mouseBuffer[0] & 2  ) > 0, // Bit 1
  //   middleBtn:  (mouseBuffer[0] & 4  ) > 0, // Bit 2
  //   xSign:      (mouseBuffer[0] & 16 ) > 0, // Bit 4
  //   ySign:      (mouseBuffer[0] & 32 ) > 0, // Bit 5
  //   xOverflow:  (mouseBuffer[0] & 64 ) > 0, // Bit 6
  //   yOverflow:  (mouseBuffer[0] & 128) > 0, // Bit 7
  //   xDelta:      mouseBuffer.readInt8(1),   // Byte 2 as signed int
  //   yDelta:      mouseBuffer.readInt8(2)    // Byte 3 as signed int
  // };

  lastKeyTime = Date.now();
};

const onKeyboardRead = function (err) {
  if(err) {
    return error('Unable to read keyboard event', err);
  }
  parseKeyboardEvent();
  startKeyboardRead(keyboardFd);
};

const onMouseRead = function (err) {
  if(err) {
    return error('Unable to read mouse event', err);
  }
  parseMouseEvent();
  startMouseRead(mouseFd);
};


async function run() {
  let keyboardPath;
  try {
    // Get the keyboard path from /dev/input/by-path. That would
    // get use the symlink.
    let ret = await exec('ls /dev/input/by-path/ | grep kbd');
    configDebug('keyboard path:', ret.stdout);
    configDebug('keyboard err:', ret.stderr);

    // From the keyboard symlink, get the real event path.
    ret = await exec(`realpath /dev/input/by-path/${ret.stdout}`);
    configDebug('keyboardEventPath:', ret.stdout);
    configDebug('keyboardEventPathErr:', ret.stderr);

    keyboardPath = ret.stdout.trim();
    
  } catch(e) {
    return error('Unable to get keyboard path', e);
  }

  fs.open(`${keyboardPath}`, 'r', onKeyboardOpen);
  fs.open('/dev/input/mice', 'r', onMouseOpen);
}

run();

// Poll once a second to determine if some event has happened.
// If not, simulate a mouse click.
setInterval(function() {
  let delta = Date.now() - lastKeyTime;
  eventDebug('checking');
  
  if(delta > 60000) {
    eventDebug('xdotool click somewhere');
    exec('xdotool click 1');
    lastKeyTime = Date.now();
  }  
}, 1000);
