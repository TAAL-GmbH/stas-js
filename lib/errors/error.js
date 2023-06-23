class SymbolError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class KeyError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class IssueInfoError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class UtxoError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class IsSplittableError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class SchemaError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class AddressError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class SatAmountError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class SplitDestionError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class SwapError extends Error {
  constructor(msg) {
    super(msg);
  }
}

module.exports = {
  SymbolError,
  KeyError,
  IssueInfoError,
  UtxoError,
  IsSplittableError,
  SchemaError,
  AddressError,
  SatAmountError,
  SplitDestionError,
  SwapError,
};
