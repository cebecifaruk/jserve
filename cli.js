import { ArgumentParser } from "argparse";
import chalk from "chalk";
import process from "process";
import chokidar from "chokidar";
import jserve from "./index.js";
import path from "path";

// ===== Utils and Argument Parser =====

const green = (...args) => console.log(...args.map((x) => chalk.green(x)));
const red = (...args) => console.log(...args.map((x) => chalk.red(x)));
const blue = (...args) => console.log(...args.map((x) => chalk.blue(x)));

blue("Server is starting...");
const parser = new ArgumentParser({
  prog: "jserve",
  description: "Javascript API serving tool",
});

parser.add_argument("-W", "--watch", {
  dest: "WATCH",
  help: "Watch the script file",
  action: "store_true",
});
parser.add_argument("-w", "--http", {
  dest: "HTTP_PORT",
  type: "int",
  help: "HTTP Server Port",
  default: null,
});
parser.add_argument("-t", "--tcp", {
  dest: "TCP_PORT",
  type: "int",
  help: "Raw TCP Server Port",
  default: null,
});
parser.add_argument("-u", "--udp", {
  dest: "UDP_PORT",
  type: "int",
  help: "Raw UDP Server Port",
  default: null,
});
parser.add_argument("SCRIPT_PATH", {
  metavar: "path",
  type: "str",
  help: "Path of the script",
});

const {
  HTTP_PORT,
  TCP_PORT,
  UDP_PORT,
  SCRIPT_PATH,
  WATCH,
} = parser.parse_args();

process.on("exit", () => {
  if (!(HTTP_PORT | TCP_PORT | UDP_PORT))
    red("Please check your script or your parameters");
});

process.on("SIG_TERM", () => red("Server is stopped"));

// TODO: Watch script file
// TODO: Directory serve

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
