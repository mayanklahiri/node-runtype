const assert = require('chai').assert,
  construct = require('..').construct,
  loadFromDisk = require('..').loadFromDisk,
  path = require('path')
  ;


describe('Type library', () => {
  it('should load type specifications from disk', () => {
    assert.throws(() => {
      construct('TypeOnDisk', {
        testField: 123,
      });
    });
    loadFromDisk(path.join(__dirname, 'test_types'));
    assert.doesNotThrow(() => {
      construct('TypeOnDisk', {
        testField: 123,
      });
    });
  });
});

