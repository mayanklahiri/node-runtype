const builtins = require('./builtins'),
  construct = require('./construct'),
  enforce = require('./enforce'),
  library = require('./library'),
  schemaDef = require('./schemaDef'),
  loadFromDisk = require('./loadFromDisk'),
  loadIntoLibrary = require('./loadIntoLibrary')
  ;


/**
 * `runtype` is a small library of functions for runtype type checking.
 *
 * @namespace runtype
 */
module.exports = {
  builtins,
  construct,
  enforce,
  library,
  schemaDef,
  loadFromDisk,
  loadIntoLibrary,
};
