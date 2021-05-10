import R from "ramda";

const _ = R.__;

export function createDoc(env) {
  const isFunction = (x) => typeof x === "function" || x instanceof Function;
  const _env = { ...env };
  return R.pipe(
    R.toPairs,
    R.map(
      ([name, val]) => ({
        name,
        title: name,
        type: isFunction(val) ? "function" : "constant",
        // $type: "A -> B",
        // arity: null,
        desc: null,
        params: [
          // { name: "params1", type: "A", desc: "Description" }
        ],
      }),
      _
    )
  )(_env);
}

export function createDocumentedEnv(env) {
  return {
    ...env,
    doc: () => createDoc(env),
  };
}

export default createDoc;
