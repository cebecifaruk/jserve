#!/usr/bin/env node
import http from "http";
import path from "path";
import fs from "fs";
import websocket from "ws";
import {ArgumentParser} from "argparse";
import chalk from "chalk";
import net from "net";
import dgram from "dgram";
import process from "process";
import Session from "./sessions.js";
import chokidar from "chokidar";

// TODO: Watch script file
// TODO: Multiple script files
// TODO: Directory serve


// ===== Utils and Argument Parser =====

const green = (...args) => console.log(...args.map(x => chalk.green(x)));
const red = (...args) => console.log(...args.map(x => chalk.red(x)));
const blue = (...args) => console.log(...args.map(x => chalk.blue(x)));
 
const parser = new ArgumentParser({
  prog: "jserve",
  description: 'Javascript API serving tool'
});

parser.add_argument('-w', '--http', { dest: 'HTTP_PORT', type: 'int', help: 'HTTP Server Port', default: null });
parser.add_argument('-t', '--tcp', { dest: 'TCP_PORT', type: 'int', help: 'Raw TCP Server Port', default: null});
parser.add_argument('-u', '--udp', { dest: 'UDP_PORT', type: 'int', help: 'Raw UDP Server Port', default: null});
parser.add_argument('-W', '--ws', { dest: 'WS_ENABLE', help: 'Websocket support', action: 'store_true' });
parser.add_argument('SCRIPT_PATH', {metavar: "path", type: 'str', help: "Path of the script"});

const {HTTP_PORT, TCP_PORT, UDP_PORT, SCRIPT_PATH, WS_ENABLE} = parser.parse_args();


blue('Server is starting...');

// ===== Loading Scripts =====

var lib = {};

async function updateAPI(clear) {
  if(clear) lib = {};
  try {
    lib = {...lib, ...await import(path.resolve(SCRIPT_PATH))};
    green("Script has been loaded");
  } catch (e) {
    red(String(e));
  }
}

await updateAPI(true);
//chokidar.watch(path.resolve(SCRIPT_PATH)).on('change', () => updateAPI(true));


// ===== HTTP App =====

const app = async (req, res) => {
  // Body Getter and Parser
  const getBody = () =>
    new Promise((res, rej) => {
      let body = [];
      req
        .on("data", (chunk) => {
          body.push(chunk);
        })
        .on("end", () => {
          res(Buffer.concat(body).toString());
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

  if (req.method === "POST" || req.method === "PUT") {
    try {
      body = JSON.parse(await getBody());
    } catch (e) {
      return sendJSON({ id: 0, error: "Parse Error", result: null });
    }
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
    } else if (req.method === "POST" && req.url.startsWith("/rpc/")) {
      id = 0;
      method = req.url.slice(5);
      params = [body];
    } else if (req.method === "POST" || req.method === "PUT") {
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
    } else {
      // TODO: Other methods
    }
  } catch (e) {
    return res
      .write(502, {})
      .end(JSON.stringify({ result: null, id, error: String(e) }));
  }

  // ------ In here: We have body, and method params, id values

  const s = new Session({
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
  else if (response.result)
    return res.writeHead(200, headers).end(JSON.stringify(response));
  else return res.writeHead(502, headers).end(JSON.stringify(response));
};

// =====  HTTP Server =====

const httpServer = http.createServer(app);
if(HTTP_PORT) httpServer.listen(HTTP_PORT, () => green("HTTP is avalible on", HTTP_PORT));


// ===== Web Socket =====
if (WS_ENABLE && HTTP_PORT) {
  const wsHandler = async (ws, req) => {
    const s = new Session(
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
  }
  new websocket.Server({ server: httpServer, autoAcceptConnections: true })
  .on("open", () => green("Websocket is serving..."))
  .on("connection",wsHandler);
}


// ===== TCP Server =====
if (TCP_PORT) net.createServer((socket) => {
    const s = new Session(lib, (x) => socket.write(Buffer.from(x)), socket.end);
    socket.on("close", s._close);
    socket.on("data", (x) => s._repl(String(x)));
  })
  .on('error', (err) => red(`TCP Server Error: ${err.stack}`))
  .on('listening', () => green("TCP is serving on ", TCP_PORT))
  .listen(TCP_PORT);


// ===== UDP Server =====
if (UDP_PORT) dgram.createSocket('udp4')
  .on('message', (msg, rinfo) => {
    console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  })
  .on('error', (err) => red(`UDP Server Error: ${err.stack}`))
  .on('listening', () => green("UDP isserving on", UDP_PORT))
  .bind(UDP_PORT);


// ===== END =====
process.on('exit', () => {
  if(!(HTTP_PORT | TCP_PORT | UDP_PORT)) red('Please check your script or your parameters');
});

process.on('SIG_TERM', () => red('Server is stopped'));