const assert = require('chai').assert,
  typename = require('../lib/typename')
;


describe('Type reflection', () => {
  it('should recognize Buffer', () => {
    assert.strictEqual('buffer', typename(Buffer.from([1, 2, 3])));
  });

  it('should recognize arrays', () => {
    assert.strictEqual('array', typename([1, 2, 3]));
  });

  it('should recognize object', () => {
    assert.strictEqual('object', typename({}));
  });

  it('should recognize boolean', () => {
    assert.strictEqual('boolean', typename(true));
  });

  it('should recognize undefined', () => {
    assert.strictEqual('undefined', typename(undefined));
  });

  it('should recognize null', () => {
    assert.strictEqual('null', typename(null));
  });

  it('should recognize function', () => {
    assert.strictEqual('function', typename(() => {}));
  });
});
