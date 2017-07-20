const _ = require('lodash'),
  assert = require('assert'),
  builtins = require('./builtins'),
  fmt = require('util').format,
  json = JSON.stringify,
  types = require('./library'),
  typename = require('./typename'),
  ErrorMessage = require('./ErrorMessage')
  ;

/**
 * Checks a value against a type schema, and returns a parsed object
 * with the following properties:
 *
 * - Only fields listed in the schema are included.
 * - Missing values in the argument are filled in from the schema
 *   if possible, and if the flag is set.
 * - The constructed object satisfies the provided schema.
 *
 * An error message identifying the exact locus of the error is thrown otherwise.
 *
 * @memberof runtype
 * @static
 * @param {object} schema Type definition (schema).
 * @param {*} value Any JSON-serializable value.
 * @param {?string} errorPrefix A string prefix to attach to validation errors.
 * @param {?boolean} fillDefaults If true, default values are assigned from the schema.
 * @throws {RuntypeError} A validation error with the locus of the error.
 * @return {*} A successfully parsed, validated, and filled-in object.
 */
function construct(schema, value, errorPrefix, fillDefaults) {
  //
  // Shorthand: specifying a string instead of an object type definition leads
  // to a lookup in the library.
  //
  if (_.isString(schema)) {
    if (!types[schema]) {
      throw new Error(`Invalid type name: ${schema}`);
    }
    schema = types[schema];
  }

  //
  // Validate type definition.
  //
  if (!_.isObject(schema)) {
    throw ErrorMessage(errorPrefix, fmt(
      'Invalid type definition: expected object, got %s.',
      typename(schema)));
  }
  if (!_.isString(schema.type)) {
    throw ErrorMessage(errorPrefix, fmt(
      'Invalid type definition: expected a string "type" field, got %s.',
      typename(schema.type)));
  }

  //
  // Check for references to type library.
  //
  if (types[schema.type]) {
    const refSchema = types[schema.type];
    const tdCopy = _.cloneDeep(schema);
    delete tdCopy.type;
    schema = _.merge({}, refSchema, tdCopy);
  }

  //
  // Omit optional, unspecified values.
  //
  if (_.isUndefined(value) && schema.optional) {
    return;
  }

  //
  // Construct native types using builtins.
  //
  if (builtins[schema.type]) {
    return builtins[schema.type](schema, value, errorPrefix);
  }

  //
  // Objects must have their fields recursed on.
  //
  if (schema.type === 'object') {
    if (!_.isObject(value)) {
      throw ErrorMessage(errorPrefix, fmt(
        'expected an object, got %s.', typename(value)));
    }
    if (!schema.fields) {
      return value;
    }
    return _.mapValues(schema.fields, (fieldSchema, fieldName) => {
      // If the field is a named type, override reference schema.
      const newPrefix = `${errorPrefix || ''}.${fieldName}`;
      return construct(fieldSchema, value[fieldName], newPrefix);
    });
  }

  //
  // Arrays can be uniformly typed or per-index typed.
  //
  if (schema.type === 'array') {
    if (!_.isArray(value)) {
      throw ErrorMessage(errorPrefix, fmt(
        'expected an array, got %s.', typename(value)));
    }

    // Test array length bounds.
    if (schema.minElements && value.length < schema.minElements) {
      throw ErrorMessage(errorPrefix, fmt(
        'expected an array of length >= %d, got length %d.',
        schema.minElements, value.length));
    }
    if (schema.maxElements && value.length > schema.maxElements) {
      throw ErrorMessage(errorPrefix, fmt(
        'expected an array of length <= %d, got length %d.',
        schema.maxElements, value.length));
    }

    // Handle typed arrays
    if (schema.elementType) {
      // All elements are of the same type.
      return _.map(value, (elem, idx) => {
        const newPrefix = (errorPrefix || '') + fmt('Index %d', idx);
        return construct(schema.elementType, elem, newPrefix);
      });
    }
    if (schema.elements) {
      // Per-index typed elements
      if (schema.elements.length !== value.length) {
        throw ErrorMessage(errorPrefix, fmt(
          'expected an array of length %d, got length %d.',
          schema.elements.length, value.length));
      }
      return _.map(schema.elements, (elemType, idx) => {
        let newPrefix = (errorPrefix || '');
        newPrefix += elemType.name ?
          fmt('Index %d (%s)', idx, elemType.name) : fmt('Index %d', idx);
        return construct(elemType, value[idx], newPrefix);
      });
    }


    // Untyped array.
    return value;
  }

  throw ErrorMessage(errorPrefix, fmt(
    'Invalid type definition: unknown type "%s".', schema.type));
}


module.exports = construct;
