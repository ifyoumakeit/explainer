# Explainer

Explain your package choices! Creates an explainer.json file with key/value pairs matching your deps.

## Requirements

Node 8+ (async/await). Will probably transpile in future.

## Installation

`yarn add --dev explainer`

## Commands

| Command                 | Description                                 |
| :---------------------- | :------------------------------------------ |
| `yarn explainer`        | Show all commands                           |
| `yarn explainer add $1` | Add new explanation ($1 = package name)     |
| `yarn explainer list`   | List all explanations                       |
| `yarn explainer update` | Fill explainer.json with all packages       |
| `yarn explainer clean`  | Remove all explanations not in package.json |
