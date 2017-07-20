function Callback() {
  return {
    type: 'function',
  };
}

function Literal(value) {
  return {
    type: 'literal',
    value,
  };
}

function Type(typeName) {
  return {
    type: typeName,
  };
}

function TypedArray(elements) {
  return {
    type: 'array',
    elements,
  };
}

function TypedObject(fields) {
  return {
    type: 'object',
    fields,
  };
}

module.exports = {
  Callback,
  Literal,
  Type,
  TypedObject,
  TypedArray,
};
