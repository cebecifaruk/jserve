import assert from "assert";

var sessions = [];
var lastId = 0;
const debugSessions = true;

const checkRPC = (x) => {
  const keys = Object.keys(x);
  if (
    !(
      keys.length === 3 &&
      keys.includes("method") &&
      keys.includes("id") &&
      keys.includes("params")
    )
  )
    throw "Not a valid JSON-RPC";
  return x;
};

const sendTo = (uId, msg) => {
  sessions
    .filter((e) => (e.user ? e.user.id === uId : false))
    .forEach((e) => e._send && e._send(msg));
};

const isOnline = (id) =>
  sessions.some((v) => v.user !== null && v.user.id === id);

function Session(context, send, close) {
  // Definitions for every session

  this._online = true;
  this._sendTo = sendTo;
  this._isOnline = isOnline;

  this._do = async (method, ...params) => {
    const func = this[method];
    if (typeof func !== "function") throw "Unknown method";
    const result = this[method](...params);
    if (result instanceof Promise) return await result;
    return result;
  };

  this._doRpc = async (id, method, ...params) => {
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

  // For one shots

  const oneShotSession = !(send || close);

  if (oneShotSession) this._id = -1;
  else {
    this._id = lastId++;
    this._send = send;
    this._close = () => {
      console.log("Unconnected:", this._id);
      if (this.onDestroy) this.onDestroy();
      const index = sessions.findIndex((x) => x._id == this._id);
      sessions.splice(index, 1);
      console.log(this);
      console.log(sessions.findIndex((x) => x._id == this._id))
      close();
      return;
    };
    this._repl = async (s) => {
      try {
        const parsed = checkRPC(JSON.parse(String(s)));
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
  }

  // Auto log-off
  // setInterval(() => {}, 5000);

  // Register functions
  // TODO: Error for non valid context.

  if (typeof context == "object") {
    // If it is a function bind it to this context
    for (const [key, value] of Object.entries(context))
      if (typeof key === "string" && !key.startsWith("_")) {
        if (typeof value === "function") this[key] = value.bind(this);
        else this[key] = value;
      }
  }

  if (this.onCreate) {
    const r = this.onCreate();
    if (r instanceof Promise) this._onReady = (f) => r.then(f);
  }
  // Session push
  sessions.push(this);
  return this;
}


export default Session;