import http from "http";
import websocket from "ws";
import net from "net";
import dgram from "dgram";
import createSession from "./createSession.js";
import { createDocumentedEnv } from "./createDoc.js";
import _ from "lodash";

export function createTcpServer(lib, port) {
  return new Promise((res, rej) => {
    net
      .createServer((socket) => {
        const s = createSession(
          lib,
          (x) => socket.write(Buffer.from(x)),
          socket.end
        );
        socket.on("close", s._close);
        socket.on("data", (x) => s._repl(String(x)));
      })
      .on("error", (err) => rej(`TCP Server Error: ${err.stack}`))
      .on("listening", () => res(null))
      .listen(port);
  });
}

export function createUdpServer(lib, port) {
  return new Promise((res, rej) => {
    dgram
      .createSocket("udp4")
      .on("message", (msg, rinfo) => {
        console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
      })
      .on("error", (err) => rej(`UDP Server Error: ${err.stack}`))
      .on("listening", () => res(null))
      .bind(port);
  });
}

const app = (lib) => async (req, res) => {
  // Body Getter and Parser
  const getBody = () =>
    new Promise((res, rej) => {
      let body = [];
      req
        .on("data", (chunk) => {
          body.push(chunk);
        })
        .on("end", () => {
          res(Buffer.concat(body));
        });
    });

  const send = (str) => res.end(String(str));

  const sendJSON = (x) => {
    try {
      return res.end(String(JSON.stringify(x)));
    } catch (e) {
      return res.end(
        String(JSON.stringify({ error: "Response is not a JSON" }))
      );
    }
  };

  var body = null;

  if (req.method === "POST") {
    try {
      body = await getBody();
      body = JSON.parse(body.toString());
    } catch (e) {}
  } else if (req.method === "PUT") {
    try {
      body = await getBody();
    } catch (e) {}
  }

  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
    "Content-Type": "application/json",
  };

  if (req.method == "OPTIONS") return res.writeHead(200, headers).end();

  var method = "";
  var params = [];
  var id = 0;

  try {
    if (req.method === "GET") {
      const path = req.url.startsWith("/rpc") ? req.url.slice(3) : req.url;
      const tokens = path.split("/");
      params = tokens.slice(2);
      method = tokens[1];
    } else if (req.method === "POST") {
      const keys = Object.keys(body);
      if (
        !(
          keys.length === 3 &&
          keys.includes("method") &&
          keys.includes("id") &&
          keys.includes("params")
        )
      )
        throw "Not a valid JSON-RPC";
      id = body.id;
      method = body.method;
      params = Array.isArray(body.params) ? body.params : [body.params];
    } else if (req.method === "PUT") {
      const path = req.url.startsWith("/rpc") ? req.url.slice(3) : req.url;
      const tokens = path.split("/");
      method = tokens[1];
      params = tokens.slice(2);
      id = 0;
      params = [...params, body];
    } else {
      // TODO: Other methods
    }
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ result: null, id, error: String(e) }));
  }

  // ------ In here: We have body, and method params, id values

  const s = createSession({
    token: req.headers["authorization"]
      ? req.headers["authorization"].slice(7)
      : null,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion,
    ...req.headers,
    body,
    ...lib,
  });

  if (s._onReady) await new Promise((res, rej) => s._onReady(res));

  const response = await s._doRpc(id, method, ...params);

  if (
    response.result &&
    response.result.type === "HttpResponse" &&
    typeof response.result.headers === "object"
  )
    return res
      .writeHead(200, { ...headers, ...response.result.headers })
      .end(response.result.body);
  else return res.writeHead(200, headers).end(JSON.stringify(response));
};

const wsApp = (lib) => async (ws, req) => {
  const s = createSession(
    {
      ...lib,
      headers: req.headers,
      token: req.headers["authorization"],
    },
    (x) => ws.send(x),
    () => ws.terminate()
  );

  ws.on("close", s._close);

  if (s._onReady) await new Promise((res, rej) => s._onReady(res));
  ws.on("message", (x) => s._repl(x));

  // Auto close connection
  var isAlive = true;
  var interval = null;
  interval = setInterval(() => {
    if (isAlive === false) {
      clearInterval(interval);
      return ws.terminate();
    }
    isAlive = false;
    ws.ping();
  }, 30000);
  ws.on("pong", function () {
    isAlive = true;
  });
};

export function createHttpServer(app, wsHandler, port) {
  return new Promise((res, rej) => {
    const httpServer = http.createServer(app);
    httpServer.listen(port, res(null));
    new websocket.Server({
      server: httpServer,
      autoAcceptConnections: true,
    }).on("connection", wsHandler);
  });
}

export async function createServer(
  env,
  {
    HTTPS_PORT = null,
    HTTP_PORT = null,
    UDP_PORT = null,
    TCP_PORT = null,
    doc = true,
  }
) {
  if (doc) env = createDocumentedEnv(env);
  if (HTTP_PORT) await createHttpServer(app(env), wsApp(env), HTTP_PORT);
  if (TCP_PORT) await createTcpServer(env, TCP_PORT);
  if (UDP_PORT) await createUdpServer(env, UDP_PORT);
}

export default createServer;
