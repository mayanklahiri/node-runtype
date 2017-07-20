const _ = require('lodash'),
  fs = require('fs'),
  library = require('./library'),
  path = require('path')
  ;


function loadFromDisk(diskPath) {
  const fileList = _.filter(fs.readdirSync(diskPath), (fname) => {
    return fname.match(/\.js$/i);
  });
  _.extend(library, _.fromPairs(_.map(fileList, (fname) => {
    const typeName = fname.replace(/\.js$/i, '');
    return [typeName, require(path.join(diskPath, fname))];
  })));
}

module.exports = loadFromDisk;
