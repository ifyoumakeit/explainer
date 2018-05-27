#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");
const util = require("util");

const FILE_CACHE = "./explainer.json";
const FILE_PKG = "./package.json";

const command = process.argv[2];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const access = util.promisify(fs.access);

const stringify = str => JSON.stringify(str, null, 2);
const getPackageName = (deps, key) => `${key}@${deps[key]}`;

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

    const max = Object.keys(deps).reduce((acc, key) => {
      return Math.max(getPackageName(deps, key).length, acc);
    }, 0);

    for (const key in deps) {
      console.log(
        getPackageName(deps, key).padEnd(max),
        cache[key] ? "" : "\x1b[33m",
        cache[key] || "Needs description",
        "\x1b[0m"
      );
    }
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
    console.log("Cleaned!");
    process.exit(0);
  } catch (err) {
    console.error(err);
  }
}

async function update() {
  try {
    const deps = await getDependencies();
    const cache = await getCache();

    const updated = Object.keys(deps).reduce((memo, key) => {
      memo[key] = cache[key] || "";
      return memo;
    }, cache);

    await writeFile(FILE_CACHE, stringify(updated));
    console.log("Updated!");
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

switch (command) {
  case "list":
    list();
    break;
  case "add":
    add();
    break;
  case "clean":
    clean();
    break;
  case "update":
    update();
    break;
  default:
    console.log("Commands => list, add, clean, update");
    process.exit(0);
}
