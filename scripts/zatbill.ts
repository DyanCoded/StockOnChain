import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  Address,
  Asset,
  type AuthFlag,
  AuthClawbackEnabledFlag,
  AuthRequiredFlag,
  AuthRevocableFlag,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  STELLAR_NETWORKS,
  TESTNET_PASSPHRASE,
} from "../packages/chain/src/index.js";

const root = process.cwd();
const envPath = path.join(root, ".env");
const accountsPath = path.join(root, "docs", "ACCOUNTS.md");
const assetCode = "ZATBILL";
const initialSupply = "1000";
const probeAmount = "1";
const friendbotUrl = "https://friendbot.stellar.org";
const requiredFlags = (AuthRequiredFlag |
  AuthRevocableFlag |
  AuthClawbackEnabledFlag) as AuthFlag;

type RoleName = "ADMIN" | "ZATBILL_ISSUER" | "DEALER" | "CUSTODIAN" | "SPONSOR";
type Role = {
  name: RoleName;
  publicKey: string;
  keypair: Keypair;
};
type AssetBalance = Extract<
  Awaited<ReturnType<Horizon.Server["loadAccount"]>>["balances"][number],
  { asset_code: string }
>;
type ErrorResponseLike = {
  response?: {
    status?: number;
    data?: {
      extras?: {
        result_codes?: {
          transaction?: string;
          operations?: string[];
        };
      };
    };
  };
};

export function testnetTransactionUrl(hash: string): string {
  return `https://horizon-testnet.stellar.org/transactions/${hash}`;
}

export function extractFailureReason(error: unknown): string {
  const response = (
    typeof error === "object" && error !== null ? error : {}
  ) as ErrorResponseLike;
  const codes = response.response?.data?.extras?.result_codes;
  const details = [codes?.transaction, ...(codes?.operations ?? [])].filter(
    (code): code is string => Boolean(code),
  );
  if (details.length > 0) {
    return details.join(", ");
  }
  const status = response.response?.status;
  return status
    ? `Horizon rejected the transaction (HTTP ${status})`
    : "Transaction was rejected";
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

export function buildStellarToml(
  issuer: string,
  homeDomain: string,
  options?: { attestationUrl?: string },
): string {
  const rootUrl = `https://${homeDomain}`;
  const disclosureUrl = `${rootUrl}/assets/zatbill-attestation.json`;
  const transparencyUrl = `${rootUrl}/assets`;
  const lines = [
    'VERSION="2.0.0"',
    `NETWORK_PASSPHRASE=${tomlString(TESTNET_PASSPHRASE)}`,
    `ACCOUNTS=[${tomlString(issuer)}]`,
    "",
    "[[CURRENCIES]]",
    `code=${tomlString(assetCode)}`,
    `issuer=${tomlString(issuer)}`,
    'status="test"',
    "display_decimals=2",
    'name="MOCK ZATBILL"',
    'desc="Testnet-only mock pot claim. Not a security, real T-bill, or backed asset."',
    `conditions=${tomlString(`Illustrative face value: 1 token models R1.00 at an example maturity and is sold at a discount. No on-chain maturity schedule or fiat redemption is implemented. No real reserves. See ${disclosureUrl} and ${transparencyUrl}.`)}`,
  ];
  if (options?.attestationUrl) {
    lines.push(`attestation_of_reserve=${tomlString(options.attestationUrl)}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function validateHomeDomain(homeDomain: string | undefined): string {
  if (
    !homeDomain ||
    homeDomain.length > 32 ||
    homeDomain.includes("://") ||
    homeDomain.includes("/") ||
    !homeDomain.includes(".") ||
    !/^[a-z0-9.-]+$/i.test(homeDomain)
  ) {
    throw new Error(
      "Set STELLAR_HOME_DOMAIN to the public HTTPS host serving stellar.toml (domain only, at most 32 characters).",
    );
  }
  return homeDomain.toLowerCase();
}

function loadRole(name: RoleName): Role {
  const secretKey = process.env[`STELLAR_${name}_SECRET_KEY`]?.trim();
  const expectedPublicKey = process.env[`STELLAR_${name}_PUBLIC_KEY`]?.trim();
  if (!secretKey) {
    throw new Error(
      `STELLAR_${name}_SECRET_KEY is missing. Run pnpm chain:bootstrap first; secret values are never printed.`,
    );
  }
  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecret(secretKey);
  } catch {
    throw new Error(
      `STELLAR_${name}_SECRET_KEY is invalid; no key values are printed.`,
    );
  }
  const publicKey = keypair.publicKey();
  if (expectedPublicKey && expectedPublicKey !== publicKey) {
    throw new Error(
      `STELLAR_${name}_PUBLIC_KEY does not match its secret key; no key values are printed.`,
    );
  }
  return { name, publicKey, keypair };
}

function roles(): Record<RoleName, Role> {
  return {
    ADMIN: loadRole("ADMIN"),
    ZATBILL_ISSUER: loadRole("ZATBILL_ISSUER"),
    DEALER: loadRole("DEALER"),
    CUSTODIAN: loadRole("CUSTODIAN"),
    SPONSOR: loadRole("SPONSOR"),
  };
}

function isNotFound(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return status === 404;
}

async function ensureFunded(server: Horizon.Server, role: Role): Promise<void> {
  try {
    await server.loadAccount(role.publicKey);
    return;
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(`Could not check the ${role.name} Testnet account.`);
    }
  }
  const response = await fetch(
    `${friendbotUrl}/?addr=${encodeURIComponent(role.publicKey)}`,
  );
  if (!response.ok) {
    throw new Error(
      `Friendbot could not fund ${role.name} (HTTP ${response.status}).`,
    );
  }
  await server.loadAccount(role.publicKey);
  console.log(`Funded ${role.name} on Stellar Testnet.`);
}

function assetFor(issuer: Role): Asset {
  return new Asset(assetCode, issuer.publicKey);
}

function trustline(
  account: Awaited<ReturnType<Horizon.Server["loadAccount"]>>,
  asset: Asset,
): AssetBalance | undefined {
  return account.balances.find(
    (balance): balance is AssetBalance =>
      "asset_code" in balance &&
      balance.asset_code === asset.code &&
      balance.asset_issuer === asset.issuer,
  );
}

function amountUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, "0"));
}

function formatUnits(units: bigint): string {
  const whole = units / 10_000_000n;
  const fraction = (units % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${fraction}`;
}

function printTransaction(label: string, hash: string): void {
  console.log(`${label}: ${testnetTransactionUrl(hash)}`);
}

async function submitClassic(
  server: Horizon.Server,
  source: Role,
  operations: ReturnType<typeof Operation.payment>[],
): Promise<string>;
async function submitClassic(
  server: Horizon.Server,
  source: Role,
  operations: ReturnType<typeof Operation.setOptions>[],
): Promise<string>;
async function submitClassic(
  server: Horizon.Server,
  source: Role,
  operations: ReturnType<typeof Operation.changeTrust>[],
): Promise<string>;
async function submitClassic(
  server: Horizon.Server,
  source: Role,
  operations: ReturnType<typeof Operation.setTrustLineFlags>[],
): Promise<string>;
async function submitClassic(
  server: Horizon.Server,
  source: Role,
  operations: Array<
    | ReturnType<typeof Operation.payment>
    | ReturnType<typeof Operation.setOptions>
    | ReturnType<typeof Operation.changeTrust>
    | ReturnType<typeof Operation.setTrustLineFlags>
    | ReturnType<typeof Operation.clawback>
  >,
): Promise<string> {
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
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

function stellarCliEnvironment(source?: Role): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      /^STELLAR_.*_SECRET_KEY$/.test(key) ||
      key === "STELLAR_ACCOUNT" ||
      key === "STELLAR_SIGN_WITH_KEY"
    ) {
      delete env[key];
    }
  }
  if (source) {
    env.STELLAR_ACCOUNT = source.publicKey;
    env.STELLAR_SIGN_WITH_KEY = source.keypair.secret();
  }
  return env;
}

function runStellar(args: string[], source?: Role): string {
  const result = spawnSync("stellar", args, {
    encoding: "utf8",
    windowsHide: true,
    env: stellarCliEnvironment(source),
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Stellar CLI command failed (${args.slice(0, 3).join(" ")}); check Testnet connectivity and CLI configuration.`,
    );
  }
  return result.stdout.trim();
}

function getAssetContractId(asset: Asset): string {
  const output = runStellar([
    "contract",
    "id",
    "asset",
    "--asset",
    `${asset.code}:${asset.issuer}`,
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    STELLAR_NETWORKS.testnet.rpcUrl,
  ]);
  const contractId = output.match(/\bC[A-Z2-7]{55}\b/)?.[0];
  if (!contractId) {
    throw new Error("Stellar CLI did not return the ZATBILL SAC contract ID.");
  }
  return contractId;
}

function isContractDeployed(contractId: string): boolean {
  const result = spawnSync(
    "stellar",
    [
      "contract",
      "info",
      "interface",
      "--contract-id",
      contractId,
      "--output",
      "json",
      "--network",
      "testnet",
      "--network-passphrase",
      TESTNET_PASSPHRASE,
      "--rpc-url",
      STELLAR_NETWORKS.testnet.rpcUrl,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      env: stellarCliEnvironment(),
    },
  );
  return result.status === 0 && result.stdout.trim().length > 0;
}

function invokeContractCli(
  source: Role,
  contractId: string,
  functionName: string,
  args: string[],
): string {
  const cliArgs = [
    "contract",
    "invoke",
    "--contract-id",
    contractId,
    "--source-account",
    source.keypair.secret(),
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    STELLAR_NETWORKS.testnet.rpcUrl,
    "--",
    functionName,
    ...args,
  ];
  const result = spawnSync("stellar", cliArgs, {
    encoding: "utf8",
    windowsHide: true,
    env: stellarCliEnvironment(),
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.error || result.status !== 0) {
    throw new Error(
      `Soroban ${functionName} invocation failed: ${output.slice(0, 300)}`,
    );
  }
  const hash =
    output.match(/Signing transaction:\s*([a-f0-9]{64})/i)?.[1] ||
    output.match(/\/tx\/([a-f0-9]{64})/i)?.[1];
  if (!hash) {
    throw new Error("Could not parse transaction hash from Soroban CLI output.");
  }
  return hash;
}

async function authorizePotSAC(
  issuer: Role,
  admin: Role,
  sacId: string,
  potId: string,
): Promise<void> {
  const authorizeHash = invokeContractCli(issuer, sacId, "set_authorized", [
    "--id",
    potId,
    "--authorize",
  ]);
  printTransaction("Authorized pot contract balance on SAC", authorizeHash);
  const configureHash = invokeContractCli(
    admin,
    potId,
    "set_zatbill_token",
    ["--admin", admin.publicKey, "--token", sacId],
  );
  printTransaction("Configured ZATBILL SAC on pot contract", configureHash);
}

async function ensureTrustline(
  server: Horizon.Server,
  role: Role,
  asset: Asset,
): Promise<AssetBalance> {
  const account = await server.loadAccount(role.publicKey);
  const existing = trustline(account, asset);
  if (existing) {
    if (!("is_clawback_enabled" in existing) || !existing.is_clawback_enabled) {
      throw new Error(
        `${role.name} already has a ZATBILL trustline without clawback enabled. Remove the empty trustline and rerun setup; the issuer cannot add clawback retroactively.`,
      );
    }
    return existing;
  }
  const hash = await submitClassic(server, role, [
    Operation.changeTrust({ asset, limit: "1000000" }),
  ]);
  printTransaction(`Created ZATBILL trustline for ${role.name}`, hash);
  const refreshed = await server.loadAccount(role.publicKey);
  const created = trustline(refreshed, asset);
  if (
    !created ||
    !("is_clawback_enabled" in created) ||
    !created.is_clawback_enabled
  ) {
    throw new Error(
      `ZATBILL clawback was not enabled on ${role.name}'s new trustline.`,
    );
  }
  return created;
}

async function setTrustlineAuthorization(
  server: Horizon.Server,
  issuer: Role,
  holder: Role,
  asset: Asset,
  authorized: boolean,
): Promise<void> {
  const account = await server.loadAccount(holder.publicKey);
  const line = trustline(account, asset);
  if (!line) {
    throw new Error(`${holder.name} has no ZATBILL trustline to authorize.`);
  }
  if (line.is_authorized === authorized) {
    console.log(
      `${holder.name} ZATBILL trustline is already ${authorized ? "authorized" : "frozen"}.`,
    );
    return;
  }
  const hash = await submitClassic(server, issuer, [
    Operation.setTrustLineFlags({
      trustor: holder.publicKey,
      asset,
      flags: { authorized },
    }),
  ]);
  printTransaction(
    `${authorized ? "Authorized" : "Froze"} ZATBILL trustline for ${holder.name}`,
    hash,
  );
}

async function ensureDealerSupply(
  server: Horizon.Server,
  issuer: Role,
  dealer: Role,
  asset: Asset,
): Promise<void> {
  const account = await server.loadAccount(dealer.publicKey);
  const line = trustline(account, asset);
  if (!line || !line.is_authorized) {
    throw new Error(
      "Dealer must have an authorized ZATBILL trustline before issuance.",
    );
  }
  const amount = line.balance ?? "0";
  const remaining = amountUnits(initialSupply) - amountUnits(amount);
  if (remaining <= 0n) {
    console.log(
      "ZATBILL supply is already held by the dealer; no additional tokens minted.",
    );
    return;
  }
  const hash = await submitClassic(server, issuer, [
    Operation.payment({
      destination: dealer.publicKey,
      asset,
      amount: formatUnits(remaining),
    }),
  ]);
  printTransaction(`Issued ${formatUnits(remaining)} ZATBILL to dealer`, hash);
}

async function ensureSacAndPotAuthorization(
  issuer: Role,
  admin: Role,
  asset: Asset,
  potId: string,
): Promise<string> {
  const sacId = getAssetContractId(asset);
  if (!isContractDeployed(sacId)) {
    runStellar(
      [
        "contract",
        "asset",
        "deploy",
        "--asset",
        `${asset.code}:${asset.issuer}`,
        "--source-account",
        issuer.publicKey,
        "--network",
        "testnet",
        "--network-passphrase",
        TESTNET_PASSPHRASE,
        "--rpc-url",
        STELLAR_NETWORKS.testnet.rpcUrl,
      ],
      issuer,
    );
  }
  await authorizePotSAC(issuer, admin, sacId, potId);
  return sacId;
}

async function setup(): Promise<void> {
  const homeDomain = validateHomeDomain(process.env.STELLAR_HOME_DOMAIN);
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  await Promise.all([
    ensureFunded(server, configuredRoles.ZATBILL_ISSUER),
    ensureFunded(server, configuredRoles.DEALER),
    ensureFunded(server, configuredRoles.SPONSOR),
    ensureFunded(server, configuredRoles.ADMIN),
  ]);
  const potId = process.env.STELLAR_CONTRACT_ID?.trim();
  if (!potId) {
    throw new Error(
      "STELLAR_CONTRACT_ID is missing; run pnpm chain:bootstrap first.",
    );
  }

  const issuerAccount = await server.loadAccount(
    configuredRoles.ZATBILL_ISSUER.publicKey,
  );
  if (issuerAccount.flags.auth_immutable) {
    throw new Error(
      "The dedicated ZATBILL issuer is immutable; use a fresh Testnet issuer account.",
    );
  }
  if (issuerAccount.balances.some((balance) => "asset_code" in balance)) {
    throw new Error(
      "The dedicated ZATBILL issuer already has a trustline. Use a fresh issuer so flags are set before any issued-asset trustline exists.",
    );
  }
  const flagsHash = await submitClassic(
    server,
    configuredRoles.ZATBILL_ISSUER,
    [
      Operation.setOptions({
        setFlags: requiredFlags,
        homeDomain,
      }),
    ],
  );
  printTransaction("Set ZATBILL issuer flags and home domain", flagsHash);

  const refreshedIssuer = await server.loadAccount(
    configuredRoles.ZATBILL_ISSUER.publicKey,
  );
  if (
    !refreshedIssuer.flags.auth_required ||
    !refreshedIssuer.flags.auth_revocable ||
    !refreshedIssuer.flags.auth_clawback_enabled ||
    refreshedIssuer.flags.auth_immutable ||
    refreshedIssuer.home_domain !== homeDomain
  ) {
    throw new Error(
      "ZATBILL issuer flags or home domain do not match the T-01 requirements.",
    );
  }

  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  await ensureTrustline(server, configuredRoles.DEALER, asset);
  await ensureTrustline(server, configuredRoles.SPONSOR, asset);
  await setTrustlineAuthorization(
    server,
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.DEALER,
    asset,
    true,
  );
  await setTrustlineAuthorization(
    server,
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.SPONSOR,
    asset,
    false,
  );
  await ensureDealerSupply(
    server,
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.DEALER,
    asset,
  );
  const sacId = await ensureSacAndPotAuthorization(
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.ADMIN,
    asset,
    potId,
  );
  updateAccountDoc(configuredRoles.ZATBILL_ISSUER.publicKey, sacId);
  console.log(
    `ZATBILL setup complete on Stellar Testnet: ${assetCode}:${asset.issuer}`,
  );
  console.log(`SAC: ${sacId}`);
  console.log(
    "No real T-bills, reserves, yield, or securities are represented.",
  );
}

async function attemptTransfer(
  server: Horizon.Server,
  dealer: Role,
  sponsor: Role,
  asset: Asset,
  amount: string,
): Promise<boolean> {
  try {
    const hash = await submitClassic(server, dealer, [
      Operation.payment({ destination: sponsor.publicKey, asset, amount }),
    ]);
    printTransaction(`Transferred ${amount} ZATBILL to sponsor`, hash);
    return true;
  } catch (error) {
    const reason = extractFailureReason(error);
    if (!reason.includes("op_not_authorized")) {
      throw new Error(`Transfer failed for an unexpected reason: ${reason}`);
    }
    console.log(`Expected transfer rejection: ${reason}`);
    return false;
  }
}

async function authorize(): Promise<void> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  await setTrustlineAuthorization(
    server,
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.SPONSOR,
    asset,
    true,
  );
  const transferred = await attemptTransfer(
    server,
    configuredRoles.DEALER,
    configuredRoles.SPONSOR,
    asset,
    probeAmount,
  );
  if (!transferred) {
    throw new Error("Authorized ZATBILL transfer did not succeed.");
  }
}

async function freeze(): Promise<void> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  await setTrustlineAuthorization(
    server,
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.SPONSOR,
    asset,
    false,
  );
}

async function clawback(): Promise<void> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  const dealerBefore = await server.loadAccount(
    configuredRoles.DEALER.publicKey,
  );
  const before = amountUnits(trustline(dealerBefore, asset)?.balance ?? "0");
  if (before < amountUnits(probeAmount)) {
    throw new Error(
      "Dealer does not hold enough ZATBILL to claw back the verification amount.",
    );
  }
  const hash = await submitClassic(server, configuredRoles.ZATBILL_ISSUER, [
    Operation.clawback({
      from: configuredRoles.DEALER.publicKey,
      asset,
      amount: probeAmount,
    }),
  ]);
  printTransaction(
    "Clawed back 1 ZATBILL from dealer (burned, not returned to issuer)",
    hash,
  );
  const dealerAfter = await server.loadAccount(
    configuredRoles.DEALER.publicKey,
  );
  const after = amountUnits(trustline(dealerAfter, asset)?.balance ?? "0");
  if (before - after !== amountUnits(probeAmount)) {
    throw new Error(
      "Dealer balance did not decrease by the clawed-back amount.",
    );
  }
}

async function verifyFlow(): Promise<void> {
  await setup();
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);

  await setTrustlineAuthorization(
    server,
    configuredRoles.ZATBILL_ISSUER,
    configuredRoles.SPONSOR,
    asset,
    false,
  );
  const unauthorizedSucceeded = await attemptTransfer(
    server,
    configuredRoles.DEALER,
    configuredRoles.SPONSOR,
    asset,
    probeAmount,
  );
  if (unauthorizedSucceeded) {
    throw new Error(
      "Unexpectedly transferred ZATBILL to an unauthorized account.",
    );
  }

  await authorize();
  await freeze();
  const frozenSucceeded = await attemptTransfer(
    server,
    configuredRoles.DEALER,
    configuredRoles.SPONSOR,
    asset,
    probeAmount,
  );
  if (frozenSucceeded) {
    throw new Error("Unexpectedly transferred ZATBILL to a frozen account.");
  }

  await clawback();
  const issuer = await server.loadAccount(
    configuredRoles.ZATBILL_ISSUER.publicKey,
  );
  const dealer = await server.loadAccount(configuredRoles.DEALER.publicKey);
  const sponsor = await server.loadAccount(configuredRoles.SPONSOR.publicKey);
  console.log(`Issuer flags: ${JSON.stringify(issuer.flags)}`);
  console.log(`Issuer home domain: ${issuer.home_domain ?? "(not set)"}`);
  console.log(
    `Dealer ZATBILL balance: ${trustline(dealer, asset)?.balance ?? "0"}`,
  );
  console.log(
    `Sponsor ZATBILL balance: ${trustline(sponsor, asset)?.balance ?? "0"}`,
  );
  console.log(
    "Stellar clawback burns tokens; the issuer cannot hold its own asset.",
  );
}

function updateAccountDoc(issuer: string, sacId: string): void {
  let content = readFileSync(accountsPath, "utf8");
  const end = "<!-- BOOTSTRAP-ACCOUNTS:END -->";
  const rows = [
    `| ZATBILL Issuer | \`${issuer}\` |`,
    `| ZATBILL SAC | \`${sacId}\` |`,
  ];
  for (const row of rows) {
    const role = row.split("|")[1].trim();
    const existing = new RegExp(`^\\| ${role} \\|.*$`, "m");
    if (existing.test(content)) {
      content = content.replace(existing, row);
      continue;
    }
    const endIndex = content.indexOf(end);
    if (endIndex < 0) {
      throw new Error("Account documentation is missing bootstrap markers.");
    }
    content = `${content.slice(0, endIndex)}${row}\n${content.slice(endIndex)}`;
  }
  writeFileSync(accountsPath, content, "utf8");
}

export async function allowlistAccount(targetPublicKey: string): Promise<string> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  const hash = await submitClassic(server, configuredRoles.ZATBILL_ISSUER, [
    Operation.setTrustLineFlags({
      trustor: targetPublicKey,
      asset,
      flags: { authorized: true },
    }),
  ]);
  printTransaction(`Authorized ZATBILL trustline for ${targetPublicKey}`, hash);
  return hash;
}

export async function revokeAccount(targetPublicKey: string): Promise<string> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  const hash = await submitClassic(server, configuredRoles.ZATBILL_ISSUER, [
    Operation.setTrustLineFlags({
      trustor: targetPublicKey,
      asset,
      flags: { authorized: false },
    }),
  ]);
  printTransaction(`Revoked/froze ZATBILL trustline for ${targetPublicKey}`, hash);
  return hash;
}

export async function transferZatbill(
  destination: string,
  amount: string = probeAmount,
): Promise<boolean> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);
  try {
    const hash = await submitClassic(server, configuredRoles.DEALER, [
      Operation.payment({ destination, asset, amount }),
    ]);
    printTransaction(`Transferred ${amount} ZATBILL to ${destination}`, hash);
    return true;
  } catch (error) {
    const reason = extractFailureReason(error);
    console.error(`ZATBILL payment rejected: ${reason}`);
    return false;
  }
}

export async function runKycDemo(): Promise<void> {
  const configuredRoles = roles();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const asset = assetFor(configuredRoles.ZATBILL_ISSUER);

  console.log("=== StockOnChain: T-03 Simulated KYC & Allowlist Lifecycle Demo ===");

  const memberKeypair = Keypair.random();
  const member: Role = {
    name: "CUSTODIAN", // using Role name type for typing
    publicKey: memberKeypair.publicKey(),
    keypair: memberKeypair,
  };
  console.log(`Generated synthetic member address: ${member.publicKey}`);

  console.log("Sponsor provisioning member account on Testnet (2.5 XLM starting balance)...");
  const createHash = await submitClassic(server, configuredRoles.SPONSOR, [
    Operation.createAccount({ destination: member.publicKey, startingBalance: "2.5" }),
  ]);
  printTransaction("Sponsor provisioned member account", createHash);

  console.log("Member establishing ZATBILL trustline (unauthorized by default due to AUTH_REQUIRED)...");
  const trustHash = await submitClassic(server, member, [
    Operation.changeTrust({ asset, limit: "1000000" }),
  ]);
  printTransaction("Member established ZATBILL trustline", trustHash);

  console.log("Attempting payment to unverified member (expecting rejection)...");
  let unverifiedFailedAsExpected = false;
  try {
    await submitClassic(server, configuredRoles.DEALER, [
      Operation.payment({ destination: member.publicKey, asset, amount: probeAmount }),
    ]);
  } catch (error) {
    const reason = extractFailureReason(error);
    console.log(`ZATBILL payment rejected as expected: ${reason}`);
    if (reason.includes("op_not_authorized")) {
      unverifiedFailedAsExpected = true;
    }
  }
  if (!unverifiedFailedAsExpected) {
    throw new Error("Unverified account transfer should have been rejected with op_not_authorized.");
  }

  console.log("Simulating KYC verification (synthetic SA ID format check, phone OTP, POPIA consent)...");
  console.log("Zero personal data is stored or logged. Issuer granting trustline authorization...");
  const authHash = await submitClassic(server, configuredRoles.ZATBILL_ISSUER, [
    Operation.setTrustLineFlags({
      trustor: member.publicKey,
      asset,
      flags: { authorized: true },
    }),
  ]);
  printTransaction("Issuer authorized ZATBILL trustline for verified member", authHash);

  console.log(`Attempting transfer of ${probeAmount} ZATBILL to verified member...`);
  const transferHash = await submitClassic(server, configuredRoles.DEALER, [
    Operation.payment({ destination: member.publicKey, asset, amount: probeAmount }),
  ]);
  printTransaction("Payment to verified member succeeded", transferHash);

  console.log("Admin executing compliance revocation / freeze...");
  const revokeHash = await submitClassic(server, configuredRoles.ZATBILL_ISSUER, [
    Operation.setTrustLineFlags({
      trustor: member.publicKey,
      asset,
      flags: { authorized: false },
    }),
  ]);
  printTransaction("Issuer revoked/froze ZATBILL trustline for member", revokeHash);

  console.log("Attempting transfer to revoked member (expecting rejection)...");
  let revokedFailedAsExpected = false;
  try {
    await submitClassic(server, configuredRoles.DEALER, [
      Operation.payment({ destination: member.publicKey, asset, amount: probeAmount }),
    ]);
  } catch (error) {
    const reason = extractFailureReason(error);
    console.log(`ZATBILL payment rejected as expected after revocation: ${reason}`);
    if (reason.includes("op_not_authorized")) {
      revokedFailedAsExpected = true;
    }
  }
  if (!revokedFailedAsExpected) {
    throw new Error("Revoked account transfer should have been rejected with op_not_authorized.");
  }

  console.log("=== T-03 Simulated KYC & Allowlist Lifecycle Demo Completed Successfully ===");
}

async function main(): Promise<void> {
  const dotenvResult = config({ path: envPath, quiet: true });
  if (dotenvResult.error) {
    throw new Error("Could not load .env. Copy .env.example to .env first.");
  }
  assertTestnetConfiguration();

  const command = process.argv[2] ?? "setup";
  const target = process.argv[3];
  const amount = process.argv[4] ?? probeAmount;

  if (command === "setup") {
    await setup();
  } else if (command === "authorize") {
    await authorize();
  } else if (command === "freeze") {
    await freeze();
  } else if (command === "clawback") {
    await clawback();
  } else if (command === "verify") {
    await verifyFlow();
  } else if (command === "allowlist") {
    if (!target) throw new Error("Usage: pnpm chain:zatbill allowlist <public-key>");
    await allowlistAccount(target);
  } else if (command === "revoke") {
    if (!target) throw new Error("Usage: pnpm chain:zatbill revoke <public-key>");
    await revokeAccount(target);
  } else if (command === "transfer") {
    if (!target) throw new Error("Usage: pnpm chain:zatbill transfer <destination> [amount]");
    await transferZatbill(target, amount);
  } else if (command === "kyc-demo") {
    await runKycDemo();
  } else {
    throw new Error(
      "Usage: pnpm chain:zatbill [setup|authorize|freeze|clawback|verify|allowlist|revoke|transfer|kyc-demo]",
    );
  }
}

if (path.basename(process.argv[1] ?? "") === "zatbill.ts") {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.stack : error,
    );
    process.exitCode = 1;
  });
}
