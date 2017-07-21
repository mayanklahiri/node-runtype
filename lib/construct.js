const _ = require('lodash'),
  builtins = require('./builtins'),
  library = require('./library'),
  typename = require('./typename'),
  RuntypeError = require('./RuntypeError')
  ;


function _constructRecursive(schema, value, options, treePath, state) {
  const valType = typename(value);
  const treePathStr = treePath.join('.');
  const pathStr = treePathStr ? `"${treePathStr}"` : '';
  const pathClone = _.clone(treePath);

  // A string passed as the schema triggers a lookup in the global library.
  if (_.isString(schema)) {
    if (!library[schema]) {
      throw new RuntypeError({
        code: 'bad_schema',
        message: `Schema for type "${schema}" not found in library.`,
        path: pathClone,
      });
    }
    schema = library[schema];
  }

  // Basic schema validation.
  if (!_.isObject(schema)) {
    throw new RuntypeError({
      code: 'bad_schema',
      message: `${pathStr}: schema definition is not an object.`,
      path: pathClone,
    });
  }
  if (!(_.isString(schema.type) && schema.type)) {
    throw new RuntypeError({
      code: 'bad_schema',
      message: `${pathStr}: Schema definition does not specify a "type" attribute.`,
      path: pathClone,
    });
  }

  // Lookup library type references.
  if (schema.type in library) {
    schema = _.cloneDeep(library[schema.type]);
  }

  // Explicitly undefined values get special treatment.
  if (_.isUndefined(value)) {
    if (!schema.optional) {
      // Not optional, this is a validation error.
      state.errors.push(new RuntypeError({
        code: 'missing_value',
        message: `${pathStr}: required value is undefined.`,
        path: pathClone,
      }));
    }
    return;
  }

  // Validate and return builtin types.
  if (builtins[schema.type]) {
    let rv;
    try {
      rv = builtins[schema.type](schema, value, pathClone);
    } catch (e) {
      // Leaf value error.
      state.errors.push(new RuntypeError({
        code: 'bad_value',
        message: `${pathStr}: ${e.message}`,
        path: pathClone,
      }));
      return;
    }
    return rv;
  }

  // Objects must have their fields recursed on.
  if (schema.type === 'object') {
    if (valType !== 'object') {
      state.errors.push(new RuntypeError({
        code: 'bad_value',
        message: `${pathStr}: should be an object, got ${valType}.`,
        path: pathClone,
      }));
      return;
    }

    // Allow untyped objects to passthrough.
    if (!schema.fields) {
      // Untyped object.
      return value;
    }

    // Enable checking objects for extraneous fields if option is set.
    if (options.strict) {
      const allowableFields = _.keys(schema.fields);
      const presentFields = _.keys(value);
      const extraFields = _.difference(presentFields, allowableFields);
      if (extraFields.length) {
        _.forEach(extraFields, (fieldName) => {
          state.errors.push(new RuntypeError({
            code: 'unknown_field',
            message: `${pathStr}: key "${fieldName}" is not in the schema and strict mode is enabled.`,
            path: pathClone,
          }));
        });
      }
    }

    // Recurse on each field in the schema and return an object.
    const newObj = _.mapValues(schema.fields, (fieldSchema, fieldName) => {
      const newPath = _.clone(treePath);
      newPath.push(fieldName);
      return _constructRecursive(fieldSchema, value[fieldName], options, newPath, state);
    });

    // Filter out keys that have explicitly undefined values before returning.
    return _.fromPairs(_.filter(_.map(newObj, (val, key) => {
      if (!_.isUndefined(val)) {
        return [key, val];
      }
    })));
  }

  // Arrays can be uniformly typed or separately typed per index.
  if (schema.type === 'array') {
    if (valType !== 'array') {
      state.errors.push(new RuntypeError({
        code: 'bad_value',
        message: `${pathStr}: should be an array, got ${valType}.`,
        path: pathClone,
      }));
      return;
    }

    // Test array length bounds.
    if (schema.minElements && value.length < schema.minElements) {
      state.errors.push(new RuntypeError({
        code: 'bad_value',
        message: (
          `${pathStr}: array too small: require at least ` +
          `${schema.minElements} elements.`),
        path: pathClone,
      }));
      return;
    }
    if (schema.maxElements && value.length > schema.maxElements) {
      state.errors.push(new RuntypeError({
        code: 'bad_value',
        message: (
          `${pathStr}: array too large: require at most ` +
          `${schema.maxElements} elements.`),
        path: pathClone,
      }));
      return;
    }

    // Uniformly typed arrays.
    if (schema.elementType) {
      return _.map(value, (elem, idx) => {
        const newPath = _.cloneDeep(treePath);
        newPath.push(_.toString(idx));
        const elemSchema = _.isString(schema.elementType) ? {
          type: schema.elementType,
        } : schema.elementType;
        return _constructRecursive(elemSchema, elem, options, newPath, state);
      });
    }

    // Separate type per index.
    if (schema.elements) {
      // In strict mode, extra elements in the value will add an error.
      if (schema.elements.length !== value.length) {
        if (options.strict) {
          state.errors.push(new RuntypeError({
            code: 'bad_value',
            message: `${pathStr}: array has more elements than allowed.`,
            path: pathClone,
          }));
        } else {
          state.warnings.push(new RuntypeError({
            code: 'bad_value',
            message: `${pathStr}: array has more elements than allowed.`,
            path: pathClone,
          }));
        }
      }
      return _.map(schema.elements, (elemSchema, idx) => {
        const newPath = _.cloneDeep(treePath);
        newPath.push(`[index ${idx}]`);
        return _constructRecursive(elemSchema, value[idx], options, newPath, state);
      });
    }

    // Allow untyped arrays.
    return value;
  }

  throw new RuntypeError({
    code: 'schema_error',
    message: `${pathStr}: unknown schema type "${schema.type}".`,
    path: pathClone,
  });
}

/**
 * Checks a value against a type schema, and returns a parsed object
 * with the following properties:
 *
 * - Only fields listed in the schema are included.
 * - Missing values in the argument are filled in from the schema
 *   if possible, and if the flag is set.
 * - The constructed object satisfies the provided schema.
 *
 * `options` can contain any of the following properties:
 *
 *   * **fillDefaults**: fill in missing values from schema defaults (default: **false**)
 *   * **strict**: throw errors on extra attributes not in schema (default: **false**)
 *
 * An error message identifying the exact locus of the error is thrown otherwise.
 *
 * @param {string|object} schema Type definition (schema) or type name in library.
 * @param {*} value Any JSON-serializable value.
 * @param {?object} options Options for construct.
 * @throws {RuntypeError} An extended error object containing all validation errors.
 * @return {*} A successfully parsed, validated, and filled-in object.
 */
function construct(schema, value, options) {
  const state = {
    errors: [],
    warnings: [],
  };
  const opt = _.merge({
    strict: false,
    fillDefaults: false,
  }, options);

  const rv = _constructRecursive(schema, value, opt, [], state);
  if (state.errors.length) {
    const firstError = _.first(state.errors);
    firstError.allErrors = state.errors;
    firstError.allWarnings = state.warnings;
    throw firstError;
  }

  return rv;
}

module.exports = construct;
