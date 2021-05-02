#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import process from "process";
import chokidar from "chokidar";
import jserve from "./index.js";
import path from "path";
import fs, { rm } from "fs";
import url from "url";
import childProcess from "child_process";
import ora from "ora";

const green = (...args) => console.log(...args.map((x) => chalk.green(x)));
const red = (...args) => console.log(...args.map((x) => chalk.red(x)));
const blue = (...args) => console.log(...args.map((x) => chalk.blue(x)));
const gray = (...args) => console.log(...args.map((x) => chalk.gray(x)));

const config = {};

const spin = (text, action) =>
  new Promise((res, rej) => {
    const spinner = ora({
      text,
      spinner: {
        interval: 100,
        frames: [
          "🕛 ",
          "🕐 ",
          "🕑 ",
          "🕒 ",
          "🕓 ",
          "🕔 ",
          "🕕 ",
          "🕖 ",
          "🕗 ",
          "🕘 ",
          "🕙 ",
          "🕚 ",
        ],
      },
    }).start();

    action
      .then((result) => {
        spinner.succeed(text);
        return res(result);
      })
      .catch((err) => {
        spinner.fail(text);
        return rej(err);
      });
  });

const exec = async (command, options) => {
  return new Promise(async (res, rej) => {
    const process = childProcess.exec(
      command,
      options,
      (error, stdout, stderr) => {
        if (error) return rej(error);
        if (stderr) return rej(stderr);
        return res(stdout);
      }
    );
  });
};

const params = yargs(process.argv.slice(2))
  .scriptName("jserve")
  .usage("$0 <cmd> [args]")
  .command(["serve <script>", "$0"], "Serve a javascript file", {
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
  .command("init <project>", "create a project from a template", {
    template: {
      demandOption: false,
      default: "simple",
      describe: "Template",
      type: "string",
    },
    "list-templates": {
      default: false,
      demandOption: false,
      describe: "List available project templates",
      type: "boolean",
    },
  })
  .command("start", "[TODO] Start jserve daemon", {})
  .command("stop", "[TODO] Stop jserve daemon", {})
  .command("add", "[TODO] Add a server to configuration file", {})
  .command("status", "[TODO] Print the current state of the daemon", {})
  .command("rm", "[TODO] Remove a server", {})
  .command("log", "[TODO] Get the log of a process", {})
  .command("reload", "[TODO] Reload config file", {})
  .command("startup", "[TODO] Add jserve to the startup")
  .option("conf", {})
  .epilog("Javascript API serving tool").argv;

const commmands = {
  async init({ project, template }) {
    const version = JSON.parse(
      await fs.promises.readFile(new URL("package.json", import.meta.url))
    ).version;
    const templateString = await fs.promisces.readFile(
      path.join(
        path.dirname(url.fileURLToPath(import.meta.url)),
        "templates",
        template + ".js"
      )
    );
    await spin("Creating project directory", fs.promises.mkdir(project));
    await spin(
      "Creating package.json",
      fs.promises.writeFile(
        path.join(project, "package.json"),
        JSON.stringify(
          {
            name: project,
            version: "1.0.0",
            description: "",
            main: "main.js",
            type: "module",
            scripts: {
              serve: "jserve main.js",
            },
            dependencies: {
              "@cebecifaruk/jserve": "^" + version,
            },
          },
          null,
          4
        )
      )
    );
    spin(
      "Creating main.js",
      fs.promises.writeFile(path.join(project, "main.js"), templateString)
    );
    await spin(
      "Installing npm dependencies",
      exec("npm install", { cwd: path.join(process.cwd(), project) })
    );
    green("Project has been created.");
    green("You can run your project with:");
    blue("npm run serve");
  },
  async serve({ http, tcp, udp, script, watch }) {
    const environment = {
      current: null,
    };

    // async function updateAPI(script) {
    //   try {
    //     environment.current = ;
    //   } catch (e) {
    //     throw e;
    //     if (typeof err === "object") {
    //       if (err.message) {
    //         red("\nMessage: " + err.message);
    //       }
    //       if (err.stack) {
    //         red("\nStacktrace:");
    //         red("====================");
    //         red(err.stack);
    //       }
    //     } else red("\n" + String(e));
    //   }
    // }

    const updateAPI = async (script) =>
      await spin(
        "Loading script",
        import(path.resolve(script)).then(
          (result) => (environment.current = result)
        )
      );
    await updateAPI(script);
    if (watch)
      chokidar.watch(path.resolve(script)).on("change", () =>
        spin(
          "Updating script",
          fs.promises
            .readFile(path.resolve(script))
            .then((src) => import("data:text/javascript," + src))
            .then((result) => (environment.current = result))
        )
      );

    const server = await jserve(environment.current, {
      HTTP_PORT: http,
      UDP_PORT: udp,
      TCP_PORT: tcp,
    });
  },
  async add() {},
  async status() {},
  async rm() {},
  async log() {},
  async reload() {},
};

commmands[params._.length > 0 ? params._[0] : "serve"](params);
