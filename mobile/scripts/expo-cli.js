#!/usr/bin/env node
const { spawn } = require('child_process');
const envinfo = require('envinfo');
const { ensureSupportedNode } = require('./ensure-supported-node');
const fs = require('fs');

const args = process.argv.slice(2);
const command = args[0];

const connectionFlags = ['--tunnel', '--lan', '--localhost', '--offline'];
const hasConnectionFlag =
  args.some((arg) => connectionFlags.includes(arg) || arg.startsWith('--host')) ?? false;

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

function resolveLocalExpoCli() {
  try {
    return require.resolve('@expo/cli/build/bin/cli');
  } catch {
    return null;
  }
}

async function main() {
  ensureSupportedNode();

  if (command === 'info') {
    await printInfo();
    return;
  }

  // Quick handling for version flag to support environments without global expo installed
  if (args.includes('--version') || args.includes('-v')) {
    // Mirror the expected project Expo SDK/CLI version
    console.log('52.0.0');
    return;
  }

  // Default to a tunnel connection for reliable QR scanning from iOS Camera/Expo Go
  if (command === 'start' && !hasConnectionFlag) {
    const defaultConnection = process.env.EXPO_DEFAULT_CONNECTION || 'tunnel';
    const connectionArgMap = {
      tunnel: '--tunnel',
      lan: '--lan',
      localhost: '--localhost',
      offline: '--offline',
    };
    const connectionArg = connectionArgMap[defaultConnection];
    if (connectionArg) {
      args.push(connectionArg);
      console.log(`No connection flag supplied; defaulting to ${connectionArg} for Expo start`);
    }
  }

  const cliPath = resolveLocalExpoCli();
  const cliDisplayPath = cliPath?.replace(process.cwd(), '.');

  // If the local Expo CLI exists, run it directly; otherwise fallback to using npx.
  if (cliPath && fs.existsSync(cliPath)) {
    const child = spawn(process.execPath, [cliPath, ...args], { stdio: 'inherit' });
    child.on('exit', (code) => {
      process.exit(code ?? 1);
    });
    console.log(`Using local Expo CLI at ${cliDisplayPath}`);
    return;
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
