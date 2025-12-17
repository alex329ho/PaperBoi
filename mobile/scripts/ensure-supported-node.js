#!/usr/bin/env node
const MIN_SUPPORTED_MAJOR = 18;
const MAX_SUPPORTED_MAJOR = 24;
const nodeVersion = process.versions.node;
const major = Number.parseInt(nodeVersion.split('.')[0], 10);

function ensureSupportedNode() {
  if (major < MIN_SUPPORTED_MAJOR || major > MAX_SUPPORTED_MAJOR) {
    console.error(
      `Unsupported Node.js version ${nodeVersion}. Please use Node ${MIN_SUPPORTED_MAJOR}–${MAX_SUPPORTED_MAJOR} (Node 24 or 22 LTS recommended) before running Expo commands.`,
    );
    process.exit(1);
  }
}

module.exports = { ensureSupportedNode };

if (require.main === module) {
  ensureSupportedNode();
}
