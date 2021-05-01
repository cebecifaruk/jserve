import R from "ramda";

export const isAny = (x) => true;
export const isEmpty = (x) => false;
export const is = (y) => (x) => y === x;

export const isString = (x) => typeof x === "string";
export const isNumber = (x) => typeof x === "number";
export const isBool = (x) => typeof x === "boolean";
export const isNull = (x) => x === null;
export const isUndefined = (x) => x === undefined;
export const isObject = (x) => x instanceof Object;
export const isArray = (x) => x instanceof Array;
export const isFunction = (x) => typeof x === "function";

export const isPositive = (x) => isNumber(x) && x >= 0;
export const isNegative = (x) => isNumber(x) && x <= 0;
export const isInt = (x) => isNumber(x) && Number.isInteger(x);
export const isUInt = (x) => isInt(x) && isPositive(x);

export const isU8 = (x) => isUInt(x) && x < 2 ** 8;
export const isU16 = (x) => isUInt(x) && x < 2 ** 16;
export const isU32 = (x) => isUInt(x) && x < 2 ** 32;
export const isU64 = (x) => isUInt(x) && x < 2 ** 64;
export const isI8 = (x) => isInt(x) && x > -(2 ** 7) && x < 2 ** 7;
export const isI16 = (x) => isInt(x) && x > -(2 ** 15) && x < 2 ** 15;
export const isI32 = (x) => isInt(x) && x > -(2 ** 31) && x < 2 ** 31;
export const isI64 = (x) => isInt(x) && x > -(2 ** 63) && x < 2 ** 63;

export const isChar = (x) => isString(x) && x.length === 1;
export const isText = (x) => isString(x) && x.length <= 4096;

export const isDate = (x) => isU64(x);
export const isTime = (x) => isU64(x);
export const isDateTime = (x) => isU64(x);

export const isListOf = (t) => (x) => isArray(x) && x.every(t);
export const isTupleOf = (...ts) => (x) =>
  isArray(x) && x.length === ts.length && x.every((x, i) => ts[i](x));
export const isMapOf = (ts) => (x) =>
  Object.keys(ts).every((key) => ts[key](x[key]));

export const isMaybeOf = (t) => (x) => isNull(x) || isUndefined(x) || t(x);
export const isOneOf = (...ts) => (x) => ts.some((t) => t(x));

// T.Set = (xs) => Type(xs.includes, "Set", xs[0], { xs });
// T.Value = (v) => Type((x) => x === v, "Value", v, { v });

const isUrl = (x) =>
  isString(x) && (x === "" || /^(https?|chrome):\/\/[^\s$.?#].[^\s]*$/.test(x));
const isEmail = (x) =>
  (isString(x) && x === "") ||
  (x.length <= 50 &&
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      x
    ));

// T.Map = (t) =>
//   T.Object.sub(
//     (x) =>
//       _.every(_.map(t, (v, k) => (typeof v === "function" ? v(x[k]) : false))),
//     "Map",
//     _.mapValues(t, (v, k) => v.defaultValue),
//     { T: t }
//   );

// // {title: , index}
// T.Enum = (t) =>
//   T.I64.sub(_.map(t, (v, k) => v.index).includes, "Enum", t[0].index, { T: t });

// T.Ref = (t) =>
//   Type((x) => typeof x === "string" && x.length < 1000, "Ref", "", { T: t });

// T.Documents = (t) =>
//   Type((x) => (T.Array(x) ? x.every(t) : false), "Documents", [], { T: t });
// // T.Reducer = (t,reducer) => Type(t, "Reducer", reducer(), {T:t,reducer});
// T.Effect = (effect) =>
//   Type(() => true, "Effect", R.clone(effect.defaultValue), { effect });

// const valueOf = (obj, type) => obj?.$type === type;
// const isRef = (x) => valueOf(x, "Ref");

export const isJsonRPC = (x) =>
  x instanceof Object &&
  Object.keys(x).length === 3 &&
  R.has("id")(x) &&
  R.has("method")(x) &&
  R.has("params")(x) &&
  x.params instanceof Array &&
  typeof x.method === "string";
