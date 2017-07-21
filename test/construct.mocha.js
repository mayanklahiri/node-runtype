const _ = require('lodash'),
  assert = require('chai').assert,
  construct = require('..').construct,
  loadIntoLibrary = require('../lib/loadIntoLibrary'),
  library = require('..').library,
  json = JSON.stringify
  ;


describe('construct(): check a value against a schema', () => {
  let sampleType;

  before(() => {
    loadIntoLibrary({
      SampleType: {
        type: 'object',
        fields: {
          testField: {
            type: 'string',
          },
          optField: {
            type: 'integer',
            optional: true,
          },
          optObject: {
            type: 'object',
            optional: true,
          },
        },
      },
    });
    sampleType = {
      testField: 'abcd',
    };
  });

  it('should construct good primitive values', () => {
    const now = Date.now();
    const buf = Buffer.from([1, 2, 3, 4]);
    const goodPairs = [
      // input, schema, expected output
      [123, { type: 'integer' }, 123],
      [-5, { type: 'integer' }, -5],
      [123.45, { type: 'number' }, 123.45],
      [undefined, { type: 'number', optional: true }, undefined],
      ['abcd', { type: 'string' }, 'abcd'],
      ['127.0.0.1', { type: 'ip_address' }, '127.0.0.1'],
      [now, { type: 'epoch_timestamp_ms' }, now],
      [buf, { type: 'buffer' }, buf],
      [buf.toString('base64'), { type: 'base64_buffer' }, buf.toString('base64')],
      [buf.toString('hex'), { type: 'hex_buffer' }, buf.toString('hex')],
    ];

    _.forEach(goodPairs, ([input, schema, output], idx) => {
      try {
        const rv = construct(schema, input);
        assert.strictEqual(rv, output, `Test case ${idx}`);
      } catch (e) {
        throw new Error(
          `Test case ${idx}: ${json({ input, schema })} is invalid: ${e}`);
      }
    });
  });


  it('should throw on bad primitive values', () => {
    const now = Math.floor(Date.now() / 1000);
    const buf = Buffer.from([1, 2, 3]);
    const badPairs = [
      // input, schema, error message match regex
      [123.45, { type: 'integer' }, /expected an integer/],
      ['test', { type: 'integer' }, /expected a number/],
      [buf, { type: 'integer' }, /expected a number/],
      [buf.toString('hex'), { type: 'base64_buffer' }, /length/],
      [buf.toString('base64'), { type: 'hex_buffer' }, /character set/],
      [now, { type: 'epoch_timestamp_ms' }, /seconds rather than/],
      [undefined, { type: 'hex_buffer' }, /is undefined/],
    ];

    _.forEach(badPairs, ([input, schema, match], idx) => {
      try {
        assert.throws(() => construct(schema, input), match);
      } catch (e) {
        throw new Error(
          `Test case ${idx}: ${json({ input, schema })} is invalid: ${e}`);
      }
    });
  });


  it('should construct nested objects and arrays', () => {
    const expected = {
      nested: {
        inner: [1, 2],
      },
    };
    const schema = {
      type: 'object',
      fields: {
        nested: {
          type: 'object',
          fields: {
            inner: { type: 'array', elementType: 'integer' },
          },
        },
      },
    };
    const input = {
      nested: {
        inner: [1, 2],
        extra: true,
      },
    };

    // In non-strict mode, do not throw due to the 'extra' property.
    // In strict mode, throw on unrecognized field 'extra'.
    assert.deepEqual(construct(schema, input), expected);
    assert.throws(
      () => construct(schema, input, { strict: true }),
      /"nested": key "extra" is not in the schema/i);
  });

  it('should ignore missing optional values', () => {
    const schema = {
      type: 'object',
      fields: {
        error: {
          type: 'string',
          optional: true,
        },
        result: {
          type: 'any',
          optional: true,
        },
      },
    };

    assert.doesNotThrow(() => construct(schema, {
      error: 'yes',
    }));

    assert.doesNotThrow(() => construct(schema, {
      result: 'yes',
    }));
  });

  it('should construct from explicit and library typedefs', () => {
    assert.deepEqual(
      construct('SampleType', sampleType), // implict schema lookup in library
      construct(library.SampleType, sampleType));
  });


  it('should throw on unrecognized library type', () => {
    assert.throws(() => { construct('InvalidType', sampleType); });
    assert.throws(() => {
      construct({
        type: 'object',
        fields: {
          badref: {
            type: 'BadReference',
          },
        },
      }, { badref: 123 });
    }, /unknown schema type/i);
  });


  it('should throw on invalid type specifications', () => {
    assert.throws(() => { construct(123, {}); });
    assert.throws(() => { construct({ type: 123 }, {}); });
  }, /invalid type definition/i);


  it('should throw on missing fields', () => {
    const badSampleType = _.clone(sampleType);
    delete badSampleType.testField;
    assert.throws(
      () => { construct('SampleType', badSampleType); },
      /required value .* undefined/i);
  });


  it('should ignore missing, optional fields', () => {
    const schema = {
      type: 'object',
      fields: {
        auth: {
          type: 'boolean',
        },
        error: {
          type: 'SampleType',
          optional: true,
        },
        userData: {
          type: 'any',
          optional: true,
        },
      },
    };

    const input = {
      auth: true,
      error: undefined,
      userData: {
        someUserData: 123,
      },
    };

    const expected = {
      auth: true,
      userData: {
        someUserData: 123,
      },
    };

    assert.doesNotThrow(() => { construct(schema, input); });
    assert.deepEqual(construct(schema, input), expected);
  });


  it('should construct nested named fields', () => {
    const nestedTypeDef = {
      type: 'object',
      fields: {
        newFieldName: {
          type: 'SampleType',
        },
      },
    };
    const nested = construct(nestedTypeDef, { newFieldName: sampleType });
    assert.deepEqual(nested, { newFieldName: sampleType });
  });


  it('should validate ad-hoc nested schemas', () => {
    const fn = construct.bind({}, {
      type: 'object',
      fields: {
        abc: {
          type: 'literal',
          value: 123,
        },
        def: {
          type: 'object',
          fields: {
            defInner: {
              type: 'string',
            },
          },
        },
      },
    });

    assert.doesNotThrow(() => {
      const rv = fn({
        abc: 123,
        def: {
          defInner: 'ghi',
        },
      });
      assert.deepEqual({
        abc: 123,
        def: {
          defInner: 'ghi',
        },
      }, rv);
    });

    assert.throws(() => {
      fn({
        abc: 1234,
        def: {
          defInner: 'ghi',
        },
      });
    });

    assert.throws(() => {
      fn({
        abc: 123,
        def: {
          defInner: null,
        },
      });
    });
  });


  it('should construct uniformly typed arrays', () => {
    const uniformArrayType = {
      type: 'array',
      elementType: 'SampleType',
      minElements: 2,
      maxElements: 3,
    };

    assert.throws(() => {
      construct(uniformArrayType, [sampleType, sampleType, sampleType, sampleType]);
    }, /too large/i);

    assert.throws(() => {
      construct(uniformArrayType, [sampleType]);
    }, /too small/i);

    assert.doesNotThrow(() => {
      construct(uniformArrayType, [sampleType, sampleType]);
      construct(uniformArrayType, [sampleType, sampleType, sampleType]);
    });
  });


  it('should construct per-index typed arrays', () => {
    const perIndexTyped = {
      type: 'array',
      elements: [
        { type: 'literal', value: 'a_literal_string' },
        { type: 'SampleType' },
      ],
    };

    assert.doesNotThrow(() => {
      construct(perIndexTyped, ['a_literal_string', sampleType]);
    });

    assert.throws(
      () => construct(perIndexTyped, [sampleType, sampleType]), /expected literal/);

    assert.throws(
      () => construct(perIndexTyped, ['junk']), /array size/);


    assert.throws(
      () => construct(perIndexTyped, ['a_literal_string', sampleType, sampleType]),
      /array size/);
  });


  it('should pass-through untyped arrays', () => {
    const untyped = {
      type: 'array',
    };
    assert.doesNotThrow(() => {
      construct(untyped, ['a_literal_string', sampleType]);
      construct(untyped, [sampleType, sampleType]);
      construct(untyped, [sampleType]);
      construct(untyped, []);
    });
  });

  it('should return all validation errors', () => {
    assert.doesNotThrow(() => {
      try {
        construct('SampleType', {
          testField: 123,
          optField: 'wrong-type',
          optObject: 'another-wrong-type',
        }, { strict: true });
      } catch (e) {
        const allErrors = _.map(e.allErrors, (runtypeErr) => {
          return {
            path: runtypeErr.path,
            message: runtypeErr.message,
            code: runtypeErr.code,
          };
        });
        assert.deepEqual(
          _.map(allErrors, 'code'), ['bad_value', 'bad_value', 'bad_value']);
        assert.deepEqual(allErrors[0].path, ['testField']);
        assert.match(allErrors[0].message, /got number/i);
        assert.deepEqual(allErrors[1].path, ['optField']);
        assert.match(allErrors[1].message, /got string/i);
        assert.deepEqual(allErrors[2].path, ['optObject']);
        assert.match(allErrors[2].message, /got string/i);
      }
    });
  });

  it('should fill in default values when the option is set', () => {
    const schema = {
      type: 'object',
      fields: {
        inner: {
          type: 'object',
          fields: {
            res1: {
              type: 'integer',
              default: 42,
            },
            res2: {
              type: 'string',
              default: () => 'sentinel',
            },
            res3: {
              type: 'integer',
              optional: true,
            },
          },
        },
      },
    };

    let input = { inner: {} };
    const rv = construct(schema, input, { fillDefaults: true });
    assert.deepEqual(rv, {
      inner: {
        res1: 42,
        res2: 'sentinel',
      },
    });

    assert.throws(() => construct(schema, input));
    input = { inner: { res1: 40, res2: 'cross' } };
    assert.deepEqual(construct(schema, input), {
      inner: {
        res1: 40,
        res2: 'cross',
      },
    });
  });
});

