const _ = require('lodash'),
  assert = require('assert'),
  construct = require('./construct')
  ;

/**
 * Wraps an asychronous function with runtime type argument and return value
 * type checking.
 *
 * @param {function} targetFunction The asynchronous function to wrap;
 * its last argument must be a callback function.
 * @return {function} An asynchronous function that will synchronously throw
 * on argument errors, or pass a type-checking exception to the callback
 * for asynchronous return type errors.
 */
function enforce(targetFunction) {
  assert(_.isFunction(targetFunction), 'argument to wrap must be a function');
  assert(
    _.isObject(targetFunction.$schema),
    `Function "${targetFunction.name}" has no $schema property.`);
  assert(
    _.isArray(targetFunction.$schema.arguments),
    `Function "${targetFunction.name}" has an invalid $schema.arguments property.`);
  assert(
    _.isArray(targetFunction.$schema.callbackResult),
    `Function "${targetFunction.name}" has an invalid ` +
      '$schema.callbackResult property.');
  const fnName = _.toString(targetFunction.name);

  // Return wrapped function, executes in a new context..
  const wrappedFunc = (...args) => {
    if (!args.length) {
      throw new Error(
        `Function "${fnName}" invoked without arguments, callback required.`);
    }

    //
    // Splice callback out of arguments array.
    //
    let originalCb = _.last(args);
    assert(
      _.isFunction(originalCb),
      `Function "${fnName}" requires a callback function as its last argument.`);
    args.splice(args.length - 1, 1);
    originalCb = _.once(originalCb);

    //
    // Type-check arguments against "arguments" schema, invoke callback with
    // schema validation errors. This will throw its own errors.
    //
    const schemaArgs = {
      type: 'array',
      elements: targetFunction.$schema.arguments,
    };
    try {
      construct(schemaArgs, args);
    } catch (e) {
      return originalCb(new Error(
        `Function "${fnName}" called with invalid arguments: ${e.message}`));
    }

    //
    // Replace callback argument with an intercepting callback function.
    //
    args.push((...resultArray) => {
      const err = resultArray.length ? resultArray[0] : undefined;
      const results = resultArray.slice(1);

      if (err) {
        // Pass errors through unfiltered.
        return originalCb(err);
      }

      // Type-check results, these must be passed to the callback, since they
      // cannot be thrown.
      const schemaCbResult = {
        type: 'array',
        elements: targetFunction.$schema.callbackResult,
      };
      try {
        construct(schemaCbResult, results);
      } catch (e) {
        return originalCb(new Error(
          `Function "${fnName}" invoked its callback with invalid arguments: ` +
          `${e.message}`));
      }

      // Success, invoke original callback with results.
      return originalCb(...resultArray);
    });

    //
    // Invoke target function, pass exceptions to callback.
    //
    let rv;
    try {
      rv = targetFunction.call(this, ...args);
    } catch (e) {
      return originalCb(e);
    }
    return rv;
  };

  wrappedFunc.$schema = targetFunction.$schema;
  return wrappedFunc;
}


module.exports = enforce;
