#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");
const util = require("util");

const FILE_PKG = "./package.json";

const command = process.argv[2];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const access = util.promisify(fs.access);

const stringify = exp => JSON.stringify(exp, null, 2);
const getPackageName = (deps, key) => `${key}@${deps[key]}`;
const getDeps = ({ dependencies, devDependencies, peerDependencies }) =>
  Object.assign({}, dependencies, devDependencies, peerDependencies);
const keysDiff = (a, b) =>
  Math.abs(Object.keys(a).length - Object.keys(b).length);

const COLORS = {
  reset: "[0m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  blue: "[34m",
  magenta: "[35m"
};

const log = (color = COLORS.reset, title, ...strs) => {
  return console.log(`\x1b${color}${title}\x1b${COLORS.reset}`, ...strs);
};

const title = (title, ...strs) => log(COLORS.yellow, title, ...strs);
const msg = (title, ...strs) => log(COLORS.blue, title, ...strs);
const row = (title, ...strs) => log(COLORS.green, title, ...strs);
const throwError = (title, ...strs) => {
  log(COLORS.red, title, ...strs);
  process.exit(1);
};

async function writeToPkg(dataPkg) {
  const data = stringify(dataPkg);
  await writeFile(FILE_PKG, data);
}

async function list() {
  msg("Listing explainer");
  const dataPkg = await getPkgData();
  const deps = getDeps(dataPkg);

  const max = Object.keys(deps).reduce((acc, key) => {
    return Math.max(getPackageName(deps, key).length, acc);
  }, 0);

  for (const key in dataPkg.explainer) {
    msg(
      `\n${getPackageName(deps, key).padEnd(max)}`,
      "|",
      dataPkg.explainer[key]
    );
  }

  await writeToPkg(dataPkg);
  msg(keysDiff(deps, dataPkg.explainer), "Unexplained dependencies");
  process.exit(0);
}

async function getPkgData() {
  const filePkg = await readFile(FILE_PKG);
  const dataPkg = JSON.parse(filePkg);
  return {
    ...dataPkg,
    explainer: dataPkg.explainer || {
      explainer: "Explains our choices"
    }
  };
}

async function clean() {
  msg("Cleaning", "start");
  const dataPkg = await getPkgData();
  const deps = getDeps(dataPkg);

  const cleaned = Object.keys(dataPkg.explainer).reduce((memo, key) => {
    if (deps[key]) {
      memo[key] = explainer[key];
    } else {
      msg("Removing", key);
    }
    return memo;
  }, {});

  await writeToPkg({ ...dataPkg, explainer: cleaned });
  msg("Cleaning", "end");
  process.exit(0);
}

async function update() {
  msg("Updating explainer with current dependencies");

  const dataPkg = await getPkgData();
  const deps = getDeps(dataPkg);

  const updated = Object.keys(deps).reduce((memo, key) => {
    return Object.assign({}, memo, { [key]: dataPkg.explainer[key] || "" });
  }, explainer);

  await writeToPkg({ ...dataPkg, explainer: updated });
  msg("Added", `${keysDiff(updated, explainer)} dependencies to Explainer`);
  process.exit(0);
}

async function add() {
  msg("Adding an explanation");
  const dataPkg = await getPkgData();
  const deps = getDeps(dataPkg);

  const dep = process.argv.slice(3);

  if (!deps[dep]) {
    err(`Dependency "${dep}" not in package.json`);
    process.exit(1);
  }

  rl.question(`Why "${dep}"? `, async description => {
    await writeToPkg(
      stringify({
        ...dataPkg,
        explainer: {
          ...dataPkg.explainer,
          [dep]: description
        }
      })
    );
    rl.close();
  });
}

(async () => {
  title("Explainer 🕵️", "The why behind the package.\n");

  try {
    switch (command) {
      case "list":
        await list();
        break;
      case "add":
        await add();
        break;
      case "clean":
        await clean();
        break;
      case "update":
        await update();
        break;
      default:
        err("Invalid command", "Try: list, add, clean, update");
        process.exit(0);
    }
  } catch (err) {
    error(err);
  }
})();
