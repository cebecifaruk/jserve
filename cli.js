#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import process from "process";
import chokidar from "chokidar";
import jserve from "./src/index.js";
import path from "path";
import fs from "fs";
import url from "url";
import childProcess from "child_process";
import ora from "ora";
import untildify from "untildify";
import fsExtra from "fs-extra";

const green = (...args) => console.log(...args.map((x) => chalk.green(x)));
const red = (...args) => console.log(...args.map((x) => chalk.red(x)));
const blue = (...args) => console.log(...args.map((x) => chalk.blue(x)));
const gray = (...args) => console.log(...args.map((x) => chalk.gray(x)));

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
  .usage("Javascript API serving tool.\n\n$0 <cmd> [args]")
  .command(["serve <script>", "$0"], "Serve a javascript file", {
    w: {
      alias: "http",
      default: 8080,
      describe: "Watch the script file",
      type: "number",
    },
    u: {
      alias: "udp",
      default: 8090,
      describe: "Raw UDP Server Port",
      type: "number",
    },
    t: {
      alias: "tcp",
      default: 8090,
      describe: "Raw TCP Server Port",
      type: "number",
    },
    watch: {
      default: false,
      describe: "watch mode",
      type: "boolean",
    },
  })
  .command("start <conf>", "Start jserve with a configuration file", {
    dns: {
      default: false,
      describe: "DNS Server",
      type: "boolean",
    },
    tls: {
      default: false,
      describe: "TLS Support",
      type: "boolean",
    },
  })
  .command("init <project> [template]", "Create a project from a template.", {
    path: {
      default: "./",
      describe: "Path of the project will be created.",
      type: "string",
    },
  })
  .command("test <template>", "Test a template", {})
  .command("list-templates", "List available project templates.")
  .command("startup", "Add jserve to the startup", {
    initSystem: {
      default: "",
      describe: "Name of the init system.",
      type: "string",
    },
    write: {
      default: false,
      describe: "Write startup script to the disk.",
      type: "boolean",
    },
  })
  .command("status", "Print the current state of the daemon", {})
  .command("log", "Get the log of a process", {})
  .command("conf-init [conf]", "Create a configuration file")
  .command("conf-show [conf]", "Show a config file")
  .command("conf-check [conf]", "Check configuration file")
  .command(
    "conf-set <key> <value> [conf]",
    "Set a property to a value in a conf file"
  )
  .command("conf-add <name> <script> [conf]", "Add a server to a conf file")
  .command("conf-rm <name> [conf]", "Remove a server from a conf file")
  .alias("v", "version")
  .alias("h", "help")
  .example("jserve index.js", "Create a server from index.js")
  .epilog("https://github.com/cebecifaruk/jserve").argv;

const commmands = {
  async init({ project, template = "simple" }) {
    await spin("Creating project directory", fs.promises.mkdir(project));
    await spin(
      "Copying template",
      fsExtra.copy(
        path.join(
          path.dirname(url.fileURLToPath(import.meta.url)),
          "templates",
          template
        ),
        path.resolve(untildify(project))
      )
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
    const environment = {};

    const updateAPI = async (script) =>
      await spin(
        "Loading script",
        import(path.resolve(script)).then((result) =>
          Object.assign(environment, result)
        )
      );
    await updateAPI(script);
    if (watch)
      chokidar.watch(path.resolve(script)).on("change", () =>
        spin(
          "Updating script",
          fs.promises
            .readFile(path.resolve(script))
            .then((src) => import(`data:text/javascript,${src}`))
            .then((result) => Object.assign(environment, result))
        )
      );

    const server = await jserve(environment, {
      HTTP_PORT: http,
      UDP_PORT: udp,
      TCP_PORT: tcp,
    });
  },
  async status() {
    console.log("TODO");
  },
  "conf-init": async ({ conf = "jserve.config.json" }) => {
    await spin(
      "Creating configuration file",
      fs.promises.writeFile(
        conf,
        JSON.stringify(
          {
            httpPort: 80,
            httpsPort: 443,
            udpPort: 3000,
            tcpPort: 3000,
            watch: true,
            domains: [],
          },
          null,
          4
        )
      )
    );
  },
  "conf-rm": async ({ conf = "jserve.config.json", key, value }) => {},
  "conf-set": async ({ conf = "jserve.config.json", key, value }) => {
    const confContent = await spin(
      "Reading configuration file",
      fs.promises.readFile(conf).then(JSON.parse)
    );
    try {
      value = JSON.parse(value);
    } catch (e) {}
    await spin(
      "Updating configuration file",
      fs.promises.writeFile(
        conf,
        JSON.stringify({ ...confContent, [key]: value }, null, 4)
      )
    );
  },
  "conf-show": async ({ conf = "jserve.config.json" }) => {
    console.log(String(await fs.promises.readFile(conf)));
  },
  async log() {
    console.log("TODO");
  },
  async test() {
    fs.mkdtemp(path.join(os.tmpdir(), "foo-"), (err, folder) => {
      if (err) throw err;
      console.log(folder);
      // Prints: /tmp/foo-itXde2
    });
  },
  async startup({ initSystem, write }) {
    initSystem =
      initSystem === ""
        ? await spin("Detecting init system.", async () => {
            const platform = process.platform;
            return null;
          })
        : initSystem;

    switch (initSystem) {
      case "windows":
      // Windows
      case "launchd":
      // Mac
      case "systemv":
      case "systemd":
      case "openrc":
      case "runit":
      case "initrc":
      // BSD
      default:
        red("Unsupported init system.");
        gray("You can add jserve to your init system manually");
        gray("Just run this command when system has been boot up:");
        gray("jserve");
        return;
    }

    // childProcess.fork(
    //   path.join(path.dirname(url.fileURLToPath(import.meta.url)), "cli.js"),
    //   {
    //     cwd: "/",
    //   }
    // );
  },
};

commmands[params._.length > 0 ? params._[0] : "serve"](params);
