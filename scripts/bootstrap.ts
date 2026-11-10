import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { config } from 'dotenv';
import {
  assertTestnetConfiguration,
  STELLAR_NETWORKS,
  TESTNET_PASSPHRASE,
} from '../packages/chain/src/index.js';

const root = process.cwd();
const envPath = path.join(root, '.env');
const accountsPath = path.join(root, 'docs', 'ACCOUNTS.md');
const contractAlias = 'stockonchain-pot';
const friendbotUrl = 'https://friendbot.stellar.org';
const contractSalt = '53544f434b4f4e434841494e2d504f542d56312d544553544e45540000000000';
const assetCodes = ['MOCKZAR', 'MOCKTBL'] as const;
const seedAmount = '1000';

type RoleName =
  | 'ADMIN'
  | 'ISSUER'
  | 'DEALER'
  | 'CUSTODIAN'
  | 'SPONSOR'
  | 'ANCHOR_SIM';
type Role = {
  name: RoleName;
  title: string;
  secretKey: string;
  publicKey: string;
  keypair: Keypair;
};
type StellarOperation =
  | ReturnType<typeof Operation.changeTrust>
  | ReturnType<typeof Operation.payment>;

const roleDefinitions: ReadonlyArray<{ name: RoleName; title: string }> = [
  { name: 'ADMIN', title: 'Admin' },
  { name: 'ISSUER', title: 'Issuer' },
  { name: 'DEALER', title: 'Dealer' },
  { name: 'CUSTODIAN', title: 'Custodian' },
  { name: 'SPONSOR', title: 'Sponsor' },
  { name: 'ANCHOR_SIM', title: 'Anchor-sim' },
];

function updateEnv(values: Record<string, string>): void {
  let contents = readFileSync(envPath, 'utf8');
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const matcher = new RegExp(`^[ \\t]*${key}[ \\t]*=.*$`, 'gm');
    const hasExistingValue = matcher.test(contents);
    matcher.lastIndex = 0;
    if (hasExistingValue) {
      contents = contents.replace(matcher, line);
    } else {
      contents = `${contents.trimEnd()}\n${line}\n`;
    }
    process.env[key] = value;
  }
  writeFileSync(envPath, contents, { encoding: 'utf8' });
  if (process.platform !== 'win32') {
    chmodSync(envPath, 0o600);
  }
}

function createOrLoadRoles(): Role[] {
  const updates: Record<string, string> = {};
  const roles = roleDefinitions.map(({ name, title }) => {
    const secretEnv = `STELLAR_${name}_SECRET_KEY`;
    const publicEnv = `STELLAR_${name}_PUBLIC_KEY`;
    const configuredSecret = process.env[secretEnv]?.trim();
    let keypair: Keypair;

    if (configuredSecret) {
      try {
        keypair = Keypair.fromSecret(configuredSecret);
      } catch {
        throw new Error(
          `${secretEnv} is not a valid Stellar secret key. Correct it in .env; no key values are printed.`,
        );
      }
      if (
        process.env[publicEnv] &&
        process.env[publicEnv] !== keypair.publicKey()
      ) {
        throw new Error(
          `${publicEnv} does not match ${secretEnv}. Correct the local .env before bootstrapping.`,
        );
      }
    } else {
      keypair = Keypair.random();
      updates[secretEnv] = keypair.secret();
    }

    const publicKey = keypair.publicKey();
    updates[publicEnv] = publicKey;
    return {
      name,
      title,
      secretKey: keypair.secret(),
      publicKey,
      keypair,
    };
  });

  updateEnv(updates);
  return roles;
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false;
  }
  const response = error.response;
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    response.status === 404
  );
}

async function ensureFunded(
  server: Horizon.Server,
  role: Role,
): Promise<void> {
  try {
    await server.loadAccount(role.publicKey);
    return;
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(`Could not check the ${role.title} testnet account.`);
    }
  }

  const response = await fetch(
    `${friendbotUrl}/?addr=${encodeURIComponent(role.publicKey)}`,
  );
  if (!response.ok) {
    throw new Error(
      `Friendbot could not fund the ${role.title} testnet account (HTTP ${response.status}).`,
    );
  }
  await server.loadAccount(role.publicKey);
  console.log(`Funded ${role.title} on Stellar Testnet.`);
}

function hasTrustline(
  account: Awaited<ReturnType<Horizon.Server['loadAccount']>>,
  asset: Asset,
): boolean {
  return account.balances.some(
    (balance) =>
      'asset_code' in balance &&
      balance.asset_code === asset.code &&
      balance.asset_issuer === asset.issuer,
  );
}

function getAssetBalance(
  account: Awaited<ReturnType<Horizon.Server['loadAccount']>>,
  asset: Asset,
): string {
  const line = account.balances.find(
    (balance) =>
      'asset_code' in balance &&
      balance.asset_code === asset.code &&
      balance.asset_issuer === asset.issuer,
  );
  return line && 'balance' in line ? line.balance : '0';
}

function toUnits(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
}

function fromUnits(units: bigint): string {
  const whole = units / 10_000_000n;
  const fraction = (units % 10_000_000n).toString().padStart(7, '0');
  return `${whole}.${fraction}`;
}

async function submitOperations(
  server: Horizon.Server,
  source: Role,
  operations: StellarOperation[],
): Promise<void> {
  const account = await server.loadAccount(source.publicKey);
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  });
  for (const operation of operations) {
    builder.addOperation(operation);
  }
  const transaction = builder.setTimeout(60).build();
  transaction.sign(source.keypair);
  await server.submitTransaction(transaction);
}

async function ensureAssets(
  server: Horizon.Server,
  roles: Role[],
): Promise<void> {
  const issuer = roles.find((role) => role.name === 'ISSUER');
  if (!issuer) {
    throw new Error('Issuer role is required to create MOCK assets.');
  }

  const assets = assetCodes.map((code) => new Asset(code, issuer.publicKey));
  for (const role of roles) {
    if (role.name === 'ISSUER') {
      continue;
    }
    const account = await server.loadAccount(role.publicKey);
    const missingTrustlines = assets.filter(
      (asset) => !hasTrustline(account, asset),
    );
    if (missingTrustlines.length > 0) {
      await submitOperations(
        server,
        role,
        missingTrustlines.map((asset) =>
          Operation.changeTrust({ asset, limit: '10000000' }),
        ),
      );
    }
  }

  for (const role of roles) {
    if (role.name === 'ISSUER') {
      continue;
    }
    for (const asset of assets) {
      const account = await server.loadAccount(role.publicKey);
      const current = toUnits(getAssetBalance(account, asset));
      const target = toUnits(seedAmount);
      if (current >= target) {
        continue;
      }
      const payment = Operation.payment({
        destination: role.publicKey,
        asset,
        amount: fromUnits(target - current),
      });
      await submitOperations(server, issuer, [payment]);
    }
  }
  console.log(`Created trustlines and seeded ${assetCodes.join(', ')} MOCK assets.`);
}

function runStellar(args: string[], sourceSecret?: string): string {
  const result = spawnSync('stellar', args, {
    encoding: 'utf8',
    windowsHide: true,
    env: stellarCliEnvironment(sourceSecret),
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Stellar CLI command failed (${args.slice(0, 2).join(' ')}). Check the CLI and testnet connection.`,
    );
  }
  return result.stdout.trim();
}

function stellarCliEnvironment(sourceSecret?: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^STELLAR_.*_SECRET_KEY$/.test(key) || key === 'STELLAR_ACCOUNT') {
      delete env[key];
    }
  }
  if (sourceSecret) {
    env.STELLAR_ACCOUNT = sourceSecret;
  }
  return env;
}

function saveAccounts(roles: Role[], contractId: string): void {
  const table = [
    '| Role | Testnet Public Key |',
    '|---|---|',
    ...roles.map((role) => `| ${role.title} | \`${role.publicKey}\` |`),
    `| Stokvel Pot contract | \`${contractId}\` |`,
  ].join('\n');
  const start = '<!-- BOOTSTRAP-ACCOUNTS:START -->';
  const end = '<!-- BOOTSTRAP-ACCOUNTS:END -->';
  const contents = readFileSync(accountsPath, 'utf8');
  const startIndex = contents.indexOf(start);
  const endIndex = contents.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error('Account documentation is missing bootstrap markers.');
  }
  const updated =
    contents.slice(0, startIndex + start.length) +
    `\n${table}\n` +
    contents.slice(endIndex);
  writeFileSync(accountsPath, updated, 'utf8');
  updateEnv({ STELLAR_CONTRACT_ID: contractId });
}

async function deployAndInvokeHello(admin: Role): Promise<string> {
  execFileSync('stellar', ['contract', 'build', '--package', 'stokvel-pot'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
    env: stellarCliEnvironment(),
  });
  const wasmPath = path.join(
    root,
    'target',
    'wasm32v1-none',
    'release',
    'stokvel_pot.wasm',
  );
  const commonNetworkArgs = [
    '--network',
    'testnet',
    '--network-passphrase',
    TESTNET_PASSPHRASE,
    '--rpc-url',
    STELLAR_NETWORKS.testnet.rpcUrl,
  ];
  const idOutput = runStellar([
    'contract',
    'id',
    'wasm',
    '--salt',
    contractSalt,
    '--source-account',
    admin.publicKey,
    ...commonNetworkArgs,
  ]);
  const contractId = idOutput.match(/\bC[A-Z2-7]{55}\b/)?.[0];
  if (!contractId) {
    throw new Error('Stellar CLI did not return a valid deterministic contract ID.');
  }

  const fetched = spawnSync(
    'stellar',
    [
      'contract',
      'info',
      'interface',
      '--contract-id',
      contractId,
      '--output',
      'json',
      ...commonNetworkArgs,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (fetched.error) {
    throw new Error('Could not check for an existing testnet contract.');
  }
  const deployed = fetched.status === 0;

  if (!deployed) {
    runStellar(
      [
        'contract',
        'deploy',
        '--wasm',
        wasmPath,
        '--salt',
        contractSalt,
        '--alias',
        contractAlias,
        ...commonNetworkArgs,
      ],
      admin.secretKey,
    );
  }

  runStellar(
    [
      'contract',
      'invoke',
      '--contract-id',
      contractId,
      ...commonNetworkArgs,
      '--',
      'hello',
      '--to',
      'world',
    ],
    admin.secretKey,
  );
  console.log(`Deployed contract and invoked hello on testnet: ${contractId}`);
  return contractId;
}

async function main(): Promise<void> {
  const dotenvResult = config({ path: envPath, quiet: true });
  if (dotenvResult.error) {
    throw new Error('Could not load .env. Copy .env.example to .env first.');
  }
  assertTestnetConfiguration();

  const roles = createOrLoadRoles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  for (const role of roles) {
    await ensureFunded(server, role);
  }
  await ensureAssets(server, roles);

  const admin = roles.find((role) => role.name === 'ADMIN');
  if (!admin) {
    throw new Error('Admin role is required to deploy the contract.');
  }
  const contractId = await deployAndInvokeHello(admin);
  saveAccounts(roles, contractId);
  console.log(
    `Bootstrap complete. Public account keys are recorded in ${path.relative(root, accountsPath)}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Bootstrap failed.');
  process.exitCode = 1;
});
