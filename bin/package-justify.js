#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");
const util = require("util");

const FILE_CACHE = ".cache";
const FILE_PKG = "./package.json";

const command = process.argv[2];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const access = util.promisify(fs.access);

async function writeCacheToFile() {
  try {
    await access(FILE_CACHE);
  } catch (err) {
    await writeFile(FILE_CACHE, JSON.stringify({}));
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

    for (const key in deps) {
      console.log(
        key,
        "\t",
        deps[key],
        "\t",
        cache[key] ? "" : "\x1b[33m",
        cache[key] || "Needs description",
        "\x1b[0m"
      );
    }
    process.exit(1);
  } catch (err) {
    console.warn(err);
  }
}

async function addJustification() {
  try {
    await writeCacheToFile();
    const fileCache = await readFile(FILE_CACHE);
    const cache = JSON.parse(fileCache);
    const dep = process.argv.slice(3);
    rl.question(`How would you describe ${dep}? `, async description => {
      await writeFile(
        FILE_CACHE,
        JSON.stringify(Object.assign({}, cache, { [dep]: description }))
      );
      rl.close();
    });
  } catch (err) {
    console.warn(err);
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
