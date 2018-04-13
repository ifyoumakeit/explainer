#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");
const util = require("util");

const FILE_CACHE = "./explainer.json";
const FILE_PKG = "./package.json";

const command = process.argv[2];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const access = util.promisify(fs.access);

const stringify = str => JSON.stringify(str, null, 2);
const getPackageName = (deps, key) => `${key}@${deps[key]}`;

const COLORS = {
  reset: "[0m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  blue: "[34m",
  magenta: "[35m",
};

const log = (color = COLORS.reset, title, ...strs) => {
  return console.log(`\x1b${color}${title}\x1b${COLORS.reset}`, ...strs);
};

const title = (title, ...strs) => log(COLORS.yellow, title, ...strs);
const msg = (title, ...strs) => log(COLORS.blue, title, ...strs);
const row = (title, ...strs) => log(COLORS.green, title, ...strs);
const warn = (title, ...strs) => log(COLORS.red, title, ...strs);

async function writeCacheToFile() {
  try {
    await access(FILE_CACHE);
  } catch (err) {
    if (err.code === "ENOENT") {
      await writeFile(
        FILE_CACHE,
        stringify({ explainer: "To help explain our choices." })
      );
    } else {
      console.warn(err);
    }
  }
}

async function list() {
  try {
    const deps = await getDependencies();
    const cache = await getCache();

    const unexplained = Object.keys(deps).length - Object.keys(cache).length;

    const max = Object.keys(deps).reduce((acc, key) => {
      return Math.max(getPackageName(deps, key).length, acc);
    }, 0);

    for (const key in cache) {
      msg(`\n${getPackageName(deps, key).padEnd(max)}`, "|", cache[key]);
    }

    msg("\nUnexplained dependencies", Math.max(unexplained, 0));
    process.exit(0);
  } catch (err) {
    console.error(err);
  }
}

async function getDependencies() {
  const filePkg = await readFile(FILE_PKG);
  const { dependencies = {}, devDependencies = {} } = JSON.parse(filePkg);
  return Object.assign({}, dependencies, devDependencies);
}

async function getCache() {
  await writeCacheToFile();
  const fileCache = await readFile(FILE_CACHE);
  return JSON.parse(fileCache) || {};
}

async function clean() {
  try {
    const deps = await getDependencies();
    const cache = await getCache();

    const cleaned = Object.keys(cache).reduce((memo, key) => {
      if (deps[key]) {
        memo[key] = cache[key];
      }
      return memo;
    }, {});

    await writeFile(FILE_CACHE, stringify(cleaned));
    msg("Cleaned!");
    process.exit(0);
  } catch (err) {
    warn(err);
  }
}

async function update() {
  msg("Updating explanations with current dependencies");
  try {
    const deps = await getDependencies();
    const cache = await getCache();

    const updated = Object.keys(deps).reduce((memo, key) => {
      return Object.assign({}, memo, { [key]: cache[key] || "" });
    }, cache);

    const added = Object.keys(updated).length - Object.keys(cache).length;

    await writeFile(FILE_CACHE, stringify(updated));
    msg("Added", `${added} dependencies to Explainer`);
    process.exit(0);
  } catch (err) {
    console.error(err);
  }
}

async function add() {
  try {
    const deps = await getDependencies();
    const cache = await getCache();

    const dep = process.argv.slice(3);

    if (!deps[dep]) {
      console.error(`Dependency "${dep}" not in package.json`);
      process.exit(1);
    }

    rl.question(`Why "${dep}"? `, async description => {
      await writeFile(
        FILE_CACHE,
        stringify(Object.assign({}, cache, { [dep]: description }))
      );
      rl.close();
    });
  } catch (err) {
    console.error(err);
  }
}

(() => {
  title("Explainer 🕵️", "The why behind the package.\n");

  switch (command) {
    case "list":
      msg("Listing explanations");
      list();
      break;
    case "add":
      msg("Adding an explanation");
      add();
      break;
    case "clean":
      msg("Cleaning explanations");
      clean();
      break;
    case "update":
      update();
      break;
    default:
      warn("Invalid command", "Try: list, add, clean, update");
      process.exit(0);
  }
})();
