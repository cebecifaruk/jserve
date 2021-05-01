import assert from "assert";
import { isJsonRPC } from "./Predicates.js";

const sessions = [];
var lastId = 0;

export function createSession(context, send, close) {
  const oneShotSession = !(send || close);
  const result = {
    _id: oneShotSession ? -1 : lastId++,
    _online: true,
    _closeSelf: close,
    _send: send,
    _context: context,
  };
  if (!oneShotSession) sessions.push(result);
  result.__proto__ = createSession.prototype;

  // Register functions
  if (typeof context == "object") {
    for (const [key, value] of Object.entries(context))
      if (typeof key === "string" && !key.startsWith("_")) {
        if (typeof value === "function") result[key] = value.bind(result);
        else result[key] = value;
      }
  } else throw "Invalid context";

  if (result.onCreate) result.onCreate.bind(result)();
  return result;
}

createSession.prototype._close = function () {
  if (this.onDestroy) this.onDestroy();
  const index = sessions.findIndex((x) => x._id == this._id);
  sessions.splice(index, 1);
  this.closeSelf();
  return;
};

createSession.prototype._do = async function (method, ...params) {
  const func = this[method];
  if (typeof func !== "function") throw "Unknown method";
  const result = this[method](...params);
  if (result instanceof Promise) return await result;
  return result;
};

createSession.prototype._doRpc = async function (id, method, ...params) {
  try {
    return {
      id,
      result: await this._do(method, ...params),
      error: null,
    };
  } catch (e) {
    return {
      id,
      result: null,
      error: e instanceof assert.AssertionError ? e.message : String(e),
    };
  }
};

createSession.sendTo = function (uId, msg) {
  sessions
    .filter((e) => (e.user ? e.user.id === uId : false))
    .forEach((e) => e._send && e._send(msg));
};
createSession.prototype._sendTo = createSession.sendTo;

createSession.isOnline = function (id) {
  return sessions.some((v) => v.user !== null && v.user.id === id);
};
createSession.prototype._isOnline = createSession.isOnline;

createSession.prototype._repl = async function (s) {
  try {
    const parsed = JSON.parse(String(s));
    assert(isJsonRPC(parsed), "Not a valid Json RPC request");
    const response = await this._doRpc(
      parsed.id,
      parsed.method,
      ...parsed.params
    );
    this._send(JSON.stringify(response) + "\r\n");
  } catch (e) {
    this._send(
      JSON.stringify({
        id: null,
        result: null,
        error: String(e),
      }) + "\r\n"
    );
  }
};

export default createSession;
