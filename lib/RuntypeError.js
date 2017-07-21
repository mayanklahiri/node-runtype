const _ = require('lodash');

class RuntypeError extends Error {
  constructor(errorDetails) {
    super(errorDetails);
    Error.captureStackTrace(this, RuntypeError);
    _.forEach(errorDetails, (val, key) => {
      this[key] = val;
    });
  }
}

module.exports = RuntypeError;
