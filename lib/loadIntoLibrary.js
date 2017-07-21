const _ = require('lodash'),
  assert = require('assert'),
  library = require('./library')
  ;


/**
 * Load an map of type names to type definitions into the global type library.
 *
 * @memberof runtype
 * @static
 * @param {object} schemas Map of type names to schemas.
 */
function loadIntoLibrary(schemas) {
  assert(_.isObject(schemas));
  _.extend(library, schemas);
}


module.exports = loadIntoLibrary;
