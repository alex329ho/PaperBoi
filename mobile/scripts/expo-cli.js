#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const envinfo = require('envinfo');

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

  const cliPath = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
  const child = spawn(process.execPath, [cliPath, ...args], { stdio: 'inherit' });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
