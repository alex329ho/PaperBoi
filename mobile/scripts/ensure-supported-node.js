#!/usr/bin/env node
const supportedMajors = [18, 20, 22];
const nodeVersion = process.versions.node;
const major = Number.parseInt(nodeVersion.split('.')[0], 10);

if (!supportedMajors.includes(major)) {
  console.error(
    `Unsupported Node.js version ${nodeVersion}. Please use Node ${supportedMajors.join(
      ' or ',
    )} (Node 20 LTS recommended) before running Expo commands.`,
  );
  process.exit(1);
}
