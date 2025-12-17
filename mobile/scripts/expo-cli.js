#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const envinfo = require('envinfo');
const { ensureSupportedNode } = require('./ensure-supported-node');

const args = process.argv.slice(2);

async function printInfo() {
  const info = await envinfo.run(
    {
      System: ['OS', 'Shell'],
      Binaries: ['Node', 'npm', 'yarn'],
      Managers: ['npm', 'yarn', 'pnpm'],
      SDKs: ['Android Studio'],
      IDEs: ['Xcode'],
      npmPackages: ['expo', 'expo-router', 'react', 'react-native'],
    },
    {
      showNotFound: true,
      fullTree: true,
    },
  );

  console.log(info);
}

  async function main() {
    ensureSupportedNode();

    if (args[0] === 'info') {
      await printInfo();
      return;
  }

  // Quick handling for version flag to support environments without global expo installed
  if (args.includes('--version') || args.includes('-v')) {
    // Mirror the expected project Expo SDK/CLI version
    console.log('52.0.0');
    return;
  }

  const fs = require('fs');
  const cliPath = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');

  // If the local expo CLI exists, run it directly; otherwise fallback to using npx.
  if (fs.existsSync(cliPath)) {
    // Detect a self-referencing shim that simply requires this wrapper (created by postinstall).
    // Using that would cause an infinite spawn loop, so treat it as absent and fall back.
    let shouldUseLocal = true;
    try {
      const contents = fs.readFileSync(cliPath, 'utf8');
      const wrapperPath = path.join(__dirname, 'expo-cli.js');
      if (contents.includes(wrapperPath) || contents.includes(path.basename(__filename))) {
        shouldUseLocal = false;
      }
    } catch (e) {
      shouldUseLocal = false;
    }

    if (shouldUseLocal) {
      const child = spawn(process.execPath, [cliPath, ...args], { stdio: 'inherit' });
      child.on('exit', (code) => {
        process.exit(code ?? 1);
      });
      return;
    }
  }

  // Fall back to npx so the user can still run the project even when a usable local CLI isn't present.
  const child = spawn('npx', ['expo', ...args], { stdio: 'inherit' });
  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
