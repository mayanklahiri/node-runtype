// Built-in types that represent strongly typed leaf nodes in a nested value.
/* eslint-disable camelcase */
const _ = require('lodash'),
  assert = require('assert'),
  json = JSON.stringify,
  typename = require('./typename')
  ;


function getValueSize(value) {
  if (Buffer.isBuffer(value)) {
    return value.length;
  }
  if (_.isUndefined(value)) return 0;
  return Buffer.from(JSON.stringify(value), 'utf-8').length;
}


class Builtins {
  any(typeDef, value) {
    assert(_.isObject(typeDef), 'type definition must be an object.');
    assert(!_.isUndefined(typeDef), 'argument cannot be undefined.');
    if (typeDef.maxSize || typeDef.minSize) {
      const valueSize = getValueSize(value);
      assert(
        !typeDef.maxSize || valueSize <= typeDef.maxSize,
        `value size too large: measured ${valueSize}, limit ${typeDef.maxSize}.`);
      assert(
        !typeDef.minSize || valueSize >= typeDef.minSize,
        `value size too small: measured ${valueSize}, minimum ${typeDef.minSize}.`);
    }
    return value;
  }

  string(typeDef, value) {
    this.any(typeDef, value);
    const typeName = typename(value);
    assert(_.isString(value), `expected a string, got ${typeName}.`);
    if (typeDef.minLength && value.length < typeDef.minLength) {
      throw Error(
        `string too short: require at least ${typeDef.minLength}, ` +
          `got ${value.length}.`);
    }
    if (typeDef.maxLength && value.length > typeDef.maxLength) {
      throw Error(
        `string too long: require at most ${typeDef.maxLength}, ` +
          `got ${value.length}.`);
    }
    return value;
  }

  alphanumeric(typeDef, value) {
    this.string(typeDef, value);
    if (!value.match(/^[a-z0-9]*$/i)) {
      throw Error('outside the alphanumeric character set.');
    }
    return value;
  }

  base64_buffer(typeDef, value) {
    this.string(typeDef, value);
    assert(
      value.length % 4 === 0,
      'invalid Base64 encoded string (length not a multiple of 4)');
    assert(
      value.match(/^[a-z0-9+/]*={0,2}$/i),
      'invalid Base64 encoded string (invalid character set).');
    return value;
  }

  boolean(typeDef, value) {
    assert(_.isBoolean(value), `expected a boolean, got ${typename(value)}.`);
    return value;
  }

  buffer(typeDef, value) {
    assert(_.isBuffer(value), `expected a buffer, got ${typename(value)}.`);
    this.any(typeDef, value);
    return value;
  }

  // Should be used when it is more important to detect timestamps incorrectly
  // coded in epoch seconds instead of milliseconds, than it is to accomodate
  // timestamps in the past, relative to some reasonable time offset.
  epoch_timestamp_ms(typeDef, value) {
    this.integer(typeDef, value);
    // Any timestamp prior to MIN_EPOCH will be considered a seconds encoding.
    const MIN_EPOCH_MS = 631152000000; // Mon, 01 Jan 1990 00:00:00 GMT in
    assert(
      value >= MIN_EPOCH_MS,
      `timestamp ${value} appears to be seconds rather than milliseconds`);
    return value;
  }

  factor(typeDef, value) {
    this.string(typeDef, value);
    if (!_.find(typeDef.factors, (f) => { return f === value; })) {
      throw Error('not a valid factor.');
    }
    return value;
  }

  hex_buffer(typeDef, value) {
    this.string(typeDef, value);
    assert(value.match(/^[a-f0-9]*$/i), 'not in the hexadecimal character set.');
    return value;
  }

  integer(typeDef, value) {
    this.number(typeDef, value);
    assert(_.isInteger(value), `expected an integer, got ${typename(value)}.`);
    return value;
  }


  ip_address(typeDef, value) {
    this.string(typeDef, value);
    const isIPv6 = value.match(/^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i);
    const isIPv4 = value.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/);
    if (!isIPv4 && !isIPv6) {
      throw Error('not an IP address.');
    }
    return value;
  }

  literal(typeDef, value) {
    assert(
      typeDef.value === value,
      `expected literal ${json(typeDef.value)}, got ${json(value)}".`);
    return value;
  }

  number(typeDef, value) {
    assert(_.isNumber(value), `expected a number, got ${typename(value)}.`);
    if ('minValue' in typeDef) {
      assert(
        value >= typeDef.minValue,
        `expected a number >= ${typeDef.minValue}, got ${value}.`);
    }
    if ('maxValue' in typeDef) {
      assert(
        value <= typeDef.maxValue,
        `expected a number <= ${typeDef.maxValue}, got ${value}.`);
    }
    return value;
  }
}


module.exports = new Builtins();
