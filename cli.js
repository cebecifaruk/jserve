#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import process from "process";
import chokidar from "chokidar";
import jserve from "./index.js";
import path from "path";
import fs from "fs";
import url from "url";
import { exec } from "child_process";

const green = (...args) => console.log(...args.map((x) => chalk.green(x)));
const red = (...args) => console.log(...args.map((x) => chalk.red(x)));
const blue = (...args) => console.log(...args.map((x) => chalk.blue(x)));
const gray = (...args) => console.log(...args.map((x) => chalk.gray(x)));

const params = yargs(process.argv.slice(2))
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
  .epilog("Javascript API serving tool").argv;

const commmands = {
  async init({ project, template }) {
    const version = JSON.parse(
      await fs.promises.readFile(new URL("package.json", import.meta.url))
    ).version;
    const templateString = await fs.promises.readFile(
      path.join(
        path.dirname(url.fileURLToPath(import.meta.url)),
        "templates",
        template + ".js"
      )
    );
    gray("Creating project directory");
    await fs.promises.mkdir(project);
    gray("Creating package.json");
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
    );
    gray("Creating main.js");
    fs.promises.writeFile(path.join(project, "main.js"), templateString);
    gray("Installing npm dependencies");
    exec(
      "npm install",
      { cwd: path.join(process.cwd(), project) },
      (error, stdout, stderr) => {
        if (error || stderr) red("Error:");
        if (error) console.log(error);
        if (stderr) console.log(stderr);
        green("Project has been created.");
        green("You can run your project with:");
        blue("npm run serve");
      }
    );
  },
  async serve({ http, tcp, udp, script, watch }) {
    blue("Server is starting...");

    process.on("exit", () => {
      if (!(http | tcp | udp))
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

    await updateAPI(script);
    if (watch)
      chokidar
        .watch(path.resolve(script))
        .on("change", (_, _script) => updateAPI(path.resolve(script)));

    await jserve(environment.current, { http, udp, tcp });
    green("Server has been started.");
  },
};

commmands[params._.length > 0 ? params._[0] : "serve"](params);
