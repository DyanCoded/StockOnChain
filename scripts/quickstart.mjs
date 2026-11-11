import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

if (Number(process.versions.node.split('.')[0]) < 20) {
  throw new Error('Node.js 20 or newer is required.');
}

if (!existsSync(path.join(process.cwd(), '.env'))) {
  throw new Error('Missing .env. Copy .env.example to .env before running quickstart.');
}

function runPnpm(args) {
  const result = spawnSync('pnpm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw new Error(`Could not run pnpm ${args[0]}. Install pnpm 9.15.9 first.`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runPnpm(['install', '--frozen-lockfile']);
runPnpm(['chain:bootstrap']);
