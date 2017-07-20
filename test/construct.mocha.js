const _ = require('lodash'),
  assert = require('chai').assert,
  construct = require('..').construct,
  types = require('..').library
  ;


describe('construct(): check a value against a schema', () => {
  let sampleType;

  before(() => {
    types.SampleType = {
      type: 'object',
      fields: {
        testField: {
          type: 'string',
        },
      },
    };
    sampleType = {
      testField: 'hello',
    };
  });

  it('should construct primitive values', () => {
    assert.strictEqual(123, construct({
      type: 'integer',
    }, 123));
    assert.strictEqual(123.45, construct({
      type: 'number',
    }, 123.45));
    assert.strictEqual(123, construct({
      type: 'literal',
      value: 123,
    }, 123));
    assert.strictEqual('abcd', construct({
      type: 'string',
    }, 'abcd'));
  });


  it('should construct from explicit and library typedefs', () => {
    const stImplicit = construct('SampleType', sampleType);
    const stExplicit = construct(types.SampleType, sampleType);
    assert.deepEqual(stImplicit, stExplicit);
  });


  it('should throw on unrecognized fields', () => {
    const badSampleType = _.clone(sampleType);
    badSampleType.newField = 123;
    assert.throws(() => { construct('SampleType', badsampleType); });
  });


  it('should throw on unrecognized types', () => {
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
    }, /unknown type/i);
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
      /expected a string, got undefined/i);
  });


  it('should ignore missing, optional fields', () => {
    const optionalType = {
      type: 'object',
      fields: {
        opto: {
          optional: true,
          type: 'integer',
        },
      },
    };
    assert.doesNotThrow(() => { construct(optionalType, {}); });
  });


  it('should construct nested named fields', () => {
    const nestedTypeDef = {
      type: 'object',
      fields: {
        SampleType: {
          type: 'SampleType',
        },
      },
    };
    const nested = construct(nestedTypeDef, { SampleType: sampleType });
    assert.deepEqual(nested, { SampleType: sampleType });
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
      assert.deepEqual(rv, {
        abc: 123,
        def: {
          defInner: 'ghi',
        },
      });
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
    const uniformTyped = {
      type: 'array',
      elementType: 'SampleType',
      minElements: 3,
      maxElements: 4,
    };
    assert.doesNotThrow(() => {
      construct(uniformTyped, [sampleType, sampleType, sampleType]);
      construct(uniformTyped, [sampleType, sampleType, sampleType, sampleType]);
    });
    assert.throws(() => {
      construct(uniformTyped, [sampleType, sampleType, sampleType, sampleType, sampleType]);
    }, /<=/i);
    assert.throws(() => {
      construct(uniformTyped, [sampleType, sampleType]);
    }, />=/i);
    const badSampleType = _.clone(sampleType);
    delete badSampleType.testField;
    assert.throws(() => {
      construct(uniformTyped, [sampleType, sampleType, badSampleType]);
    }, /Index 2.testField: expected a string, got undefined./i);
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
    assert.throws(() => {
      construct(perIndexTyped, [sampleType, sampleType]);
    }, /Index 0/i);
    assert.throws(() => {
      construct(perIndexTyped, [sampleType]);
    }, /expected an array of length 2/i);
    assert.throws(() => {
      construct(perIndexTyped);
    }, /expected an array/i);
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
});

