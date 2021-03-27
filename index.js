#!/usr/bin/env node
import http from "http";
import path from "path";
import websocket from "ws";
import net from "net";
import dgram from "dgram";
import Session from "./sessions.js";
import mime from "mime-types";
import fs from "fs";
import _ from "lodash";

// Helper Functions

export function Html(body = "", headers = {}) {
  return {
    type: "HttpResponse",
    headers: {
      "Content-Type": "text/html",
    },
    body,
  };
}

export function Static(root) {
  return async (...params) => {
    const dirs = params.slice(0, -1);
    const file = params[params.length - 1];
    const filePath = path.join(root, ...dirs, file);
    try {
      await fs.promises.access(filePath, fs.R_OK);
    } catch (e) {
      return Html("<h1>Page Not Found</h1>");
    }
    return {
      type: "HttpResponse",
      headers: {
        "Content-Type": mime.contentType(file),
      },
      body: await fs.promises.readFile(filePath),
    };
  };
}

// Server stuff
export const tcpServer = (lib, port) =>
  new Promise((res, rej) => {
    net
      .createServer((socket) => {
        const s = new Session(
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

export const udpServer = (lib, port) =>
  new Promise((res, rej) => {
    dgram
      .createSocket("udp4")
      .on("message", (msg, rinfo) => {
        console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
      })
      .on("error", (err) => rej(`UDP Server Error: ${err.stack}`))
      .on("listening", () => res(null))
      .bind(port);
  });

export const httpServer = (lib, port) =>
  new Promise((res, rej) => {
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

    const httpServer = http.createServer(app);
    httpServer.listen(port, res(null));
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
    };
    new websocket.Server({ server: httpServer, autoAcceptConnections: true })
      //  .on("open", res(null))
      .on("connection", wsHandler);
  });

export default async function (
  lib,
  { HTTP_PORT = null, UDP_PORT = null, TCP_PORT = null }
) {
  if (HTTP_PORT) await httpServer(lib, HTTP_PORT);
  if (TCP_PORT) await tcpServer(lib, TCP_PORT);
  if (UDP_PORT) await udpServer(lib, UDP_PORT);
}
