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

async function readJustifications() {
  try {
    await writeCacheToFile();
    const filePkg = await readFile(FILE_PKG);
    const fileCache = await readFile(FILE_CACHE);

    const { dependencies = {}, devDependencies = {} } = JSON.parse(filePkg);
    const cache = JSON.parse(fileCache) || {};

    const deps = Object.assign({}, dependencies, devDependencies);
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

async function addJustification() {
  try {
    await writeCacheToFile();
    const fileCache = await readFile(FILE_CACHE);
    const cache = JSON.parse(fileCache);
    const dep = process.argv.slice(3);
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
  case "add":
    addJustification();
    break;
  default: {
    readJustifications();
  }
}
