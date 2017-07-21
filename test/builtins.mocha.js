const assert = require('chai').assert,
  builtins = require('..').builtins
;


describe('Builtin, primitive types', () => {
  it('should validate "alphanumeric"', () => {
    const fn = builtins.alphanumeric.bind(builtins, {
      type: 'alphanumeric',
    });
    assert.doesNotThrow(() => { fn('abcdef0123'); });
    assert.doesNotThrow(() => { fn(''); });

    assert.throws(() => { fn('. .1/12'); }, /outside the alphanumeric/i);
    assert.throws(() => { fn('_abc'); }, /outside the alphanumeric/i);
    assert.throws(() => { fn('0123?'); }, /outside the alphanumeric/i);
  });


  it('should validate "any"', () => {
    const fn = builtins.any.bind(builtins, {
      type: 'any',
      minSize: 5,
      maxSize: 40,
    });
    assert.doesNotThrow(() => { fn({ nested: 'string' }); });
    assert.doesNotThrow(() => { fn('just a plain string > 10 chars'); });

    assert.throws(() => { fn({}); }, /too small/i);
    assert.throws(() => { fn(null); }, /too small/i);
    assert.throws(() => { fn(); }, /too small/i);
    assert.throws(() => {
      fn(
        'just a plain string > 40 chars, above maxSize');
    }, /too large/i);
  });


  it('should validate "base64_buffer"', () => {
    let fn = builtins.base64_buffer.bind(builtins, {
      type: 'base64_buffer',
    });

    assert.doesNotThrow(() => { fn('abcdef=='); });
    assert.doesNotThrow(() => { fn('abcdefg='); });
    assert.doesNotThrow(() => { fn('abcdefgh'); });
    assert.doesNotThrow(() => { fn('abcdae=='); });

    assert.throws(() => { fn('abcde==='); });
    assert.throws(() => { fn('abcdefghi'); }, /invalid Base64/i);
    assert.throws(() => { fn('cat and mouse'); }, /invalid Base64/i);
    assert.throws(() => { fn('"jsonstr"'); }, /invalid Base64/i);
    assert.throws(() => { fn('===='); }, /invalid Base64/i);

    fn = builtins.base64_buffer.bind(builtins, {
      type: 'base64_buffer',
      minLength: 5,
      maxLength: 8,
    });

    assert.doesNotThrow(() => { fn('abcdef=='); });
    assert.doesNotThrow(() => { fn('abcdefg='); });
    assert.throws(() => { fn('abcdefghefgh'); }, /too long/i);
    assert.throws(() => { fn('abcd', /too short/); });

    fn = builtins.base64_buffer.bind(builtins, {
      type: 'base64_buffer',
    });
    assert.doesNotThrow(() => { fn(''); });
  });


  it('should validate "buffer"', () => {
    const fn = builtins.buffer.bind(builtins, {
      type: 'buffer',
      maxSize: 3,
    });

    assert.doesNotThrow(() => { fn(Buffer.from([0])); });
    assert.doesNotThrow(() => { fn(Buffer.from([0, 1, 2])); });

    assert.throws(() => { fn(Buffer.from([0, 1, 2, 4])); });
    assert.throws(() => { fn('abcdefghi'); }, /got string/i);
    assert.throws(() => { fn({}); }, /got object/i);
    assert.throws(() => { fn([]); }, /got array/i);
  });


  it('should validate "boolean"', () => {
    const fn = builtins.boolean.bind(builtins, { type: 'boolean' });

    assert.doesNotThrow(() => { fn(true); });
    assert.doesNotThrow(() => { fn(false); });

    assert.throws(() => { fn('0.0.0.'); }, /got string/i);
    assert.throws(() => { fn(); }, /got undefined/i);
    assert.throws(() => { fn('true'); }, /got string/i);
    assert.throws(() => { fn(1); }, /got number/i);
  });


  it('should validate "epoch_timestamp_ms"', () => {
    const fn = builtins.epoch_timestamp_ms.bind(builtins, { type: 'epoch_timestamp_ms' });

    assert.doesNotThrow(() => { fn(Date.now()); });
    assert.doesNotThrow(() => { fn(Date.now() + 1e5); });

    assert.throws(() => { fn((new Date())); }, /expected a number/i);
    assert.throws(() => { fn((new Date()).toISOString()); }, /expected a number/i);
    assert.throws(() => { fn('127.0.0.1.0'); }, /expected a number/i);
    assert.throws(() => { fn(1472581934); }, /appears to be seconds/i);
  });


  it('should validate "factor"', () => {
    const fn = builtins.factor.bind(builtins, {
      type: 'factor',
      factors: ['a', 'b', 'c'],
    });
    assert.doesNotThrow(() => { fn('a'); });
    assert.doesNotThrow(() => { fn('b'); });
    assert.doesNotThrow(() => { fn('c'); });
    assert.throws(() => { fn('d'); }, /not a valid factor/i);
  });


  it('should validate "hex_buffer"', () => {
    let fn = builtins.hex_buffer.bind(builtins, {
      type: 'hex_buffer',
    });

    assert.doesNotThrow(() => { fn('abcdef0123456789'); });
    assert.doesNotThrow(() => { fn('0'); });

    assert.throws(() => { fn(0); }, /expected a string/i);
    assert.throws(() => { fn('0xff'); }, /character set/i);
    assert.throws(() => { fn('deadpork'); }, /character set/i);

    fn = builtins.hex_buffer.bind(builtins, {
      type: 'hex_buffer',
      minLength: 2,
      maxLength: 8,
    });

    assert.doesNotThrow(() => { fn('abcdef'); });
    assert.doesNotThrow(() => { fn('abcdefab'); });

    assert.throws(() => { fn(0); }, /expected a string/i);
    assert.throws(() => { fn('0xff'); }, /not in the hexadecimal/i);
    assert.throws(() => { fn('deadpork'); }, /not in the hexadecimal/i);
  });


  it('should validate "integer"', () => {
    const fn = builtins.integer.bind(builtins, {
      type: 'integer',
      minValue: 10,
      maxValue: 100,
    });
    assert.doesNotThrow(() => { fn(10); });
    assert.doesNotThrow(() => { fn(100); });
    assert.throws(() => { fn(9); }, />=/i);
    assert.throws(() => { fn(101); }, /<=/i);
    assert.throws(() => { fn(11.104); }, /expected an integer/i);
  });


  it('should validate "ip_address"', () => {
    const fn = builtins.ip_address.bind(builtins, { type: 'ip_address' });

    assert.doesNotThrow(() => { fn('127.0.0.1'); });
    assert.doesNotThrow(() => { fn('1.1.1.1'); });
    assert.doesNotThrow(() => { fn('FF02:0:0:0:0:0:0:12'); });

    assert.throws(() => { fn('0.0.0.'); }, /not an ip address/i);
    assert.throws(() => { fn('a.b.c.d'); }, /not an ip address/i);
    assert.throws(() => { fn('127.0.0.1.0'); }, /not an ip address/i);
  });


  it('should validate "literal"', () => {
    const strLit = builtins.literal.bind(builtins, {
      type: 'literal',
      value: 'abcd',
    });
    assert.doesNotThrow(() => { strLit('abcd'); });
    assert.throws(() => strLit('abc'), /expected literal "abcd", got "abc"./i);

    const intLit = builtins.literal.bind(builtins, {
      type: 'literal',
      value: 123,
    });
    assert.doesNotThrow(() => { intLit(123); });
    assert.throws(() => intLit('abc'), /expected literal 123, got "abc"./i);
  });


  it('should validate "number"', () => {
    const fn = builtins.number.bind(builtins, {
      type: 'number',
      minValue: 10.15,
      maxValue: 10.69,
    });
    assert.doesNotThrow(() => { fn(10.16); });
    assert.doesNotThrow(() => { fn(10.50); });
    assert.throws(() => { fn(10); }, />=/i);
    assert.throws(() => { fn(11); }, /<=/i);
  });


  it('should validate "string"', () => {
    const fn = builtins.string.bind(builtins, {
      type: 'string',
      minLength: 1,
      maxLength: 16,
    });
    assert.doesNotThrow(() => { fn('abcdef0123456789'); });
    assert.doesNotThrow(() => { fn('0'); });

    assert.throws(() => { fn(0); }, /expected a string/i);
    assert.throws(() => { fn(''); }, /too short/i);
    assert.throws(() => { fn('abcdef0123456789x'); }, /too long/i);
  });
});
