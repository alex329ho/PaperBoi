#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const binPath = path.join(__dirname, '..', 'node_modules', '.bin', 'expo');
const wrapperPath = path.join(__dirname, 'expo-cli.js');

const loader = `#!/usr/bin/env node
require('${wrapperPath.replace(/\\/g, '\\\\')}');
`;

try {
  fs.writeFileSync(binPath, loader);
  fs.chmodSync(binPath, 0o755);
} catch (error) {
  console.warn('Failed to link Expo wrapper:', error);
  process.exitCode = 0;
}
