#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import process from "process";
import chokidar from "chokidar";
import jserve from "./index.js";
import path from "path";

const green = (...args) => console.log(...args.map((x) => chalk.green(x)));
const red = (...args) => console.log(...args.map((x) => chalk.red(x)));
const blue = (...args) => console.log(...args.map((x) => chalk.blue(x)));

const params = yargs(process.argv.slice(2))
  //.usage("Usage: $0 [-W] [-w HTTP_PORT] [-t TCP_PORT] [-u UDP_PORT] path")
  .scriptName("jserve")
  .usage("$0 <cmd> [args]")
  .command(["serve <script>", "$0"], "serve a javascript file", {
    w: {
      alias: "http",
      demandOption: false,
      default: 8080,
      describe: "Watch the script file",
      type: "number",
    },
    u: {
      alias: "udp",
      demandOption: false,
      default: 8090,
      describe: "Raw UDP Server Port",
      type: "number",
    },
    t: {
      alias: "tcp",
      demandOption: false,
      default: 8090,
      describe: "Raw TCP Server Port",
      type: "number",
    },
    watch: {
      demandOption: false,
      default: false,
      describe: "watch mode",
      type: "boolean",
    },
  })
  .command("init <project>", "create a simple project", {
    m: {
      alias: "mode",
      demandOption: false,
      default: 8080,
      describe: "HTTP Server Port",
      type: "number",
    },
  })
  .epilog("Javascript API serving tool").argv;

const HTTP_PORT = params.http;
const TCP_PORT = params.tcp;
const UDP_PORT = params.udp;
const SCRIPT_PATH = params.script;
const WATCH = params.watch;

blue("Server is starting...");

process.on("exit", () => {
  if (!(HTTP_PORT | TCP_PORT | UDP_PORT))
    red("Please check your script or your parameters");
});

process.on("SIG_TERM", () => red("Server is stopped"));

// ===== Loading Scripts =====

const environment = {
  current: null,
};

async function updateAPI(script) {
  try {
    environment.current = await import(path.resolve(script));
    green("Script has been loaded.");
  } catch (e) {
    if (typeof err === "object") {
      if (err.message) {
        red("\nMessage: " + err.message);
      }
      if (err.stack) {
        red("\nStacktrace:");
        red("====================");
        red(err.stack);
      }
    } else red("\n" + String(e));
  }
}

await updateAPI(SCRIPT_PATH);
if (WATCH)
  chokidar
    .watch(path.resolve(SCRIPT_PATH))
    .on("change", (_, script) => updateAPI(path.resolve(SCRIPT_PATH)));

await jserve(environment.current, { HTTP_PORT, UDP_PORT, TCP_PORT });
green("Server has been started.");
