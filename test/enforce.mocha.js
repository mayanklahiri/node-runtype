const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  def = require('..').schemaDef,
  enforce = require('..').enforce,
  types = require('..').library,
  fmt = require('util').format
  ;


describe('enforce(): wrap async functions with runtime type checking',
  () => {
    before(() => {
      types.SampleType = {
        type: 'object',
        fields: {
          testField: {
            type: 'string',
          },
        },
      };
      types.SampleReturnType = {
        type: 'literal',
        value: 'hello',
      };
    });

    it('should wrap a target function and its callback result', (cb) => {
      const sampleFunc = (arg, cb) => {
        assert.strictEqual(arg.testField, 'hello');
        return cb(null, arg.testField);
      };
      sampleFunc.$schema = {
        arguments: [
          def.Type('SampleType'),
        ],
        callbackResult: [
          def.Type('SampleReturnType'),
        ],
      };
      const enforcedFunc = enforce(sampleFunc);

      return async.series([
        cb => enforcedFunc((err) => {
          assert.isOk(err);
          assert.match(
            err.message,
            /Function "sampleFunc" called with invalid arguments/i);
          return cb();
        }),

        cb => enforcedFunc({ testField: 'hello' }, (err, result) => {
          assert.isNotOk(err);
          assert.strictEqual(result, 'hello');
          return cb();
        }),

        cb => enforcedFunc({ testField: 'not_hello' }, (err, result) => {
          assert.isOk(err);
          assert.match(
            err.message,
            /expected 'not_hello' to equal 'hello'/i);
          assert.isUndefined(result);
          return cb();
        }),
      ], cb);
    });


    it('should pass errors through via the callback', (cb) => {
      const sampleFunc = (cb) => {
        return cb(new Error('no-go'));
      };
      sampleFunc.$schema = {
        arguments: [],
        callbackResult: [],
      };
      const enforcedFunc = enforce(sampleFunc);
      enforcedFunc((err, result) => {
        assert.isOk(err);
        assert.match(err.message, /no-go/);
        assert.isUndefined(result);
        return cb();
      });
    });


    it('should throw immediately on attempts to wrap untyped functions', () => {
      assert.throws(() => {
        enforce();
      }, /argument to wrap must be a function/i);

      assert.throws(() => {
        enforce(() => {});
      }, /has no \$schema property/i);

      assert.throws(() => {
        const sampleFunc = () => {};
        sampleFunc.$schema = {};
        enforce(sampleFunc);
      }, /Function "sampleFunc" has an invalid \$schema\.arguments pr/i);

      assert.throws(() => {
        const sampleFunc = () => {};
        sampleFunc.$schema = {
          arguments: [],
        };
        enforce(sampleFunc);
      }, /Function "sampleFunc" has an invalid \$schema\.callbackResult pr/i);

      assert.doesNotThrow(() => {
        const sampleFunc = () => {};
        sampleFunc.$schema = {
          arguments: [],
          callbackResult: [],
        };
        enforce(sampleFunc);
      });

      assert.throws(() => {
        const sampleFunc = () => {};
        sampleFunc.$schema = {
          arguments: [],
          callbackResult: [],
        };
        const enforced = enforce(sampleFunc);
        enforced();
      }, /require a callback/i);

      assert.throws(() => {
        const sampleFunc = () => {};
        sampleFunc.$schema = {
          arguments: [
            {
              type: 'array',
              elements: [
                { type: 'integer' },
                { type: 'string' },
              ],
            },
          ],
          callbackResult: [],
        };
        const enforced = enforce(sampleFunc);
        enforced(1);
      }, /requires a callback/i);

      assert.doesNotThrow(() => {
        const sampleFunc = () => {};
        sampleFunc.$schema = {
          arguments: [
            {
              type: 'array',
              elements: [
                { type: 'integer' },
                { type: 'string' },
              ],
            },
          ],
          callbackResult: [],
        };
        const enforced = enforce(sampleFunc);
        enforced([1, 'test'], _.noop);
      });
    });


    it('should return callback errors on attempts to pass invalid arguments', (cb) => {
      const sampleFunc = (fnArg, cb) => cb(null, fnArg);
      sampleFunc.$schema = {
        arguments: [
          {
            type: 'array',
            elements: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
        ],
        callbackResult: [],
      };
      const enforced = enforce(sampleFunc);
      enforced(1, (err) => {
        assert.isOk(err);
        assert.match(err.message, /Index 0: expected an array, got number/i);
        return cb();
      });
    });


    it('should return callback errors on attempts to return invalid results', (cb) => {
      const sampleFunc = (fnArg, cb) => cb(null, fnArg);
      sampleFunc.$schema = {
        arguments: [
          {
            type: 'array',
            elements: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
        ],
        callbackResult: [],
      };
      const enforced = enforce(sampleFunc);
      enforced([1, 'test'], (err) => {
        assert.isOk(err);
        assert.match(err.message, /expected an array of length 0, got length 1/i);
        return cb();
      });
    });


    it('should allow conforming function to work', (cb) => {
      const sampleFunc = (fnArg, cb) => cb(null, fnArg);
      sampleFunc.$schema = {
        arguments: [
          {
            type: 'array',
            elements: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
        ],
        callbackResult: [
          {
            type: 'array',
            elements: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
        ],
      };
      const enforced = enforce(sampleFunc);
      enforced([1, 'test'], (err, echo) => {
        assert.isNotOk(err);
        assert.deepEqual(echo, [1, 'test']);
        return cb();
      });
    });
  });

