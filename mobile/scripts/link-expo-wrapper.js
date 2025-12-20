#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const binPath = path.join(__dirname, '..', 'node_modules', '.bin', 'expo');
const expoBinPath = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const wrapperPath = path.join(__dirname, 'expo-cli.js');

const wrapperLoader = `#!/usr/bin/env node
require('${wrapperPath.replace(/\\/g, '\\\\')}');
`;

let resolvedExpoCli;
try {
  resolvedExpoCli = require.resolve('@expo/cli/build/bin/cli', { paths: [path.join(__dirname, '..')] });
} catch {
  // If it fails, we still want to write the wrapper to .bin so that npx can find it.
}

const expoCliLoader = resolvedExpoCli
  ? `#!/usr/bin/env node
require('${resolvedExpoCli.replace(/\\/g, '\\\\')}');
`
  : null;

function writeLoader(targetPath, contents, label) {
  try {
    fs.writeFileSync(targetPath, contents);
    fs.chmodSync(targetPath, 0o755);
  } catch (error) {
    console.warn(`Failed to link ${label}:`, error);
    process.exitCode = 0;
  }
}

try {
  writeLoader(binPath, wrapperLoader, 'Expo wrapper');
  if (expoCliLoader) {
    writeLoader(expoBinPath, expoCliLoader, 'Expo CLI entrypoint');
  }
} catch (error) {
  console.warn('Failed to link Expo wrapper:', error);
  process.exitCode = 0;
}
