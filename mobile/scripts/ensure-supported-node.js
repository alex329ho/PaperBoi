#!/usr/bin/env node
const supportedMajors = [18, 20, 22, 24];
const nodeVersion = process.versions.node;
const major = Number.parseInt(nodeVersion.split('.')[0], 10);

const supportedRange = `${supportedMajors.slice(0, -1).join(', ')} or ${supportedMajors.at(-1)}`;

function ensureSupportedNode() {
  if (!supportedMajors.includes(major)) {
    console.error(
      `Unsupported Node.js version ${nodeVersion}. Please use Node ${supportedRange} (Node 24 or 22 LTS recommended) before running Expo commands.`,
    );
    process.exit(1);
  }
}

module.exports = { ensureSupportedNode };

if (require.main === module) {
  ensureSupportedNode();
}