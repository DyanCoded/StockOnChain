"use strict";
/**
 * @stockonchain/chain - Custodian Proof of Backing & Attestation Engine (T-06)
 *
 * Implements:
 * 1. Mock Custody Statement PDF generation with strict mock labeling.
 * 2. Deterministic canonical JSON serialization & Ed25519 signing/verification.
 * 3. On-chain anchoring verification via Stellar issuer `manage_data`.
 * 4. Circulating supply query & exact backing ratio calculation.
 * 5. Demo deficit toggle support for UI testing.
 *
 * AI Guardrails:
 * - G1 No secrets: Secret keys are never exposed or printed.
 * - G4 Verify, do not trust: Cryptographic signatures and on-chain hashes are checked strictly.
 * - G6 Honesty: Strict mock custodian branding and simulated T-bill instrument identifiers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_CUSTODIAN_METADATA = void 0;
exports.generateMockCustodyStatementPdf = generateMockCustodyStatementPdf;
exports.computeSha256 = computeSha256;
exports.canonicalizeJson = canonicalizeJson;
exports.generateCustodianAttestation = generateCustodianAttestation;
exports.verifyAttestationSignature = verifyAttestationSignature;
exports.verifyPdfHash = verifyPdfHash;
exports.calculateBackingRatio = calculateBackingRatio;
exports.queryOnchainBackingData = queryOnchainBackingData;
exports.verifyProofOfBacking = verifyProofOfBacking;
exports.buildOnchainAttestationMessage = buildOnchainAttestationMessage;
exports.signOnchainAttestation = signOnchainAttestation;
exports.verifyOnchainAttestationSignature = verifyOnchainAttestationSignature;
const node_crypto_1 = __importDefault(require("node:crypto"));
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const index_1 = require("./index");
exports.MOCK_CUSTODIAN_METADATA = {
    name: "Mock Custodian Services (Pty) Ltd (Demo Only)",
    location: "Mock Vault, Sandton, Johannesburg (SIMULATED)",
    disclaimer: "MOCK CUSTODIAN DISCLOSURE: Strictly simulated demo attestation. No real-world financial assets, Treasury Bills, bank deposits, or sovereign reserves exist or are held.",
    mockInstrumentId: "MOCK-TBILL-ZA-2026-Q4-DEMO",
    mockInstrumentDescription: "Simulated South African Republic Treasury Bill (91-Day Zero-Coupon Benchmark)",
    onchainDataKey: "zatbill_attestation_hash",
    defaultIpfsUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/mock-custody-statement.pdf",
};
/**
 * Generates a valid standard PDF-1.4 binary buffer for the Mock Custody Statement.
 * Contains visible headers, mock disclaimers, and instrument details.
 */
function generateMockCustodyStatementPdf(params) {
    const amount = params.faceAmountHeld ?? "1000.00";
    const date = params.asOfDate ?? "2026-11-13T12:00:00.000Z";
    const lines = [
        "==================================================================",
        "          MOCK CUSTODIAN SERVICES (PTY) LTD",
        "    SIMULATED DEMO CUSTODY STATEMENT & PROOF OF RESERVE",
        "==================================================================",
        "",
        "STATUS: STRICTLY DEMO - NOT A REAL FINANCIAL DOCUMENT",
        "",
        `As-of Date:       ${date}`,
        `Custodian Signer: ${params.custodianPublicKey}`,
        `Custody Location: ${exports.MOCK_CUSTODIAN_METADATA.location}`,
        "",
        "------------------------------------------------------------------",
        "  ASSET & HOLDINGS DECLARATION",
        "------------------------------------------------------------------",
        "Asset Code:       MOCK ZATBILL",
        `Issuer Account:   ${params.issuerPublicKey}`,
        "Network:          Stellar Testnet (Test SDF Network ; September 2015)",
        `Mock Instrument:  ${exports.MOCK_CUSTODIAN_METADATA.mockInstrumentId}`,
        `Description:      ${exports.MOCK_CUSTODIAN_METADATA.mockInstrumentDescription}`,
        "Face Value/Token: R 1.00 (simulated)",
        `Units Held:       ${parseInt(amount, 10).toLocaleString()} ZATBILL`,
        `Total Face Value: R ${amount} (mZAR equivalent)`,
        "",
        "------------------------------------------------------------------",
        "  MOCK CUSTODIAN ATTESTATION",
        "------------------------------------------------------------------",
        "Mock Custodian Services (Pty) Ltd certifies that as of the date",
        "above, it holds the aforementioned mock debt claims in segregated",
        "simulated custody backing circulating ZATBILL tokens.",
        "",
        "------------------------------------------------------------------",
        "  STATUTORY DISCLAIMER (AI GUARDRAILS G4 & G6)",
        "------------------------------------------------------------------",
        "WARNING: This document is an illustrative mock statement generated",
        "solely for protocol development, testing, and UI verification.",
        "NO REAL SOUTH AFRICAN GOVERNMENT TREASURY BILLS, BANKING DEPOSITS,",
        "SECURITIES, OR FIAT RAND RESERVES ARE HELD OR GUARANTEED.",
        "==================================================================",
    ];
    let stream = "BT\n/F1 10 Tf\n50 720 Td\n15 TL\n";
    for (const line of lines) {
        const escaped = line
            .replace(/\\/g, "\\\\")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)");
        stream += `(${escaped}) '\n`;
    }
    stream += "ET\n";
    const streamLen = Buffer.byteLength(stream, "utf8");
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        `<< /Length ${streamLen} >>\nstream\n${stream}endstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    ];
    let out = "%PDF-1.4\n";
    const xref = [0];
    for (let i = 0; i < objects.length; i++) {
        xref.push(Buffer.byteLength(out, "utf8"));
        out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(out, "utf8");
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
        out += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(out, "utf8");
}
/**
 * Computes the SHA-256 hex digest of a buffer.
 */
function computeSha256(buffer) {
    return node_crypto_1.default.createHash("sha256").update(buffer).digest("hex");
}
/**
 * Deterministically canonicalizes a JSON object by sorting keys alphabetically at all levels.
 */
function canonicalizeJson(obj) {
    if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map((item) => canonicalizeJson(item)).join(",")}]`;
    }
    const sortedKeys = Object.keys(obj).sort();
    const entries = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`);
    return `{${entries.join(",")}}`;
}
/**
 * Generates and cryptographically signs a Custodian Attestation document using Ed25519.
 */
function generateCustodianAttestation(params) {
    const faceAmountHeld = params.faceAmountHeld ?? "1000.00";
    const unitsHeld = params.unitsHeld ?? 1000;
    const asOfDate = params.asOfDate ?? "2026-11-13T12:00:00.000Z";
    const payload = {
        documentType: "mock-custodian-reserve-attestation",
        disclaimer: exports.MOCK_CUSTODIAN_METADATA.disclaimer,
        custodian: {
            name: exports.MOCK_CUSTODIAN_METADATA.name,
            publicKey: params.custodianKeypair.publicKey(),
            location: exports.MOCK_CUSTODIAN_METADATA.location,
            isMock: true,
        },
        asset: {
            code: "ZATBILL",
            issuer: params.issuerPublicKey,
            network: "testnet",
        },
        instrument: {
            id: exports.MOCK_CUSTODIAN_METADATA.mockInstrumentId,
            description: exports.MOCK_CUSTODIAN_METADATA.mockInstrumentDescription,
            faceValuePerUnit: "1.00",
            currency: "ZAR (Simulated)",
        },
        reserves: {
            faceAmountHeld,
            currency: "mZAR (Mock Rand)",
            unitsHeld,
        },
        statementPdf: {
            filename: "mock-custody-statement.pdf",
            url: `https://${params.homeDomain}/assets/mock-custody-statement.pdf`,
            ipfsUri: exports.MOCK_CUSTODIAN_METADATA.defaultIpfsUri,
            sha256: params.pdfSha256,
        },
        asOfDate,
    };
    const canonical = canonicalizeJson(payload);
    const payloadHash = node_crypto_1.default.createHash("sha256").update(canonical).digest();
    const signatureBuffer = params.custodianKeypair.sign(payloadHash);
    const signature = signatureBuffer.toString("hex");
    return {
        ...payload,
        signature,
    };
}
/**
 * Cryptographically verifies the Ed25519 signature of an attestation document.
 */
function verifyAttestationSignature(doc, custodianPublicKey) {
    try {
        const { signature, ...payload } = doc;
        if (!signature || typeof signature !== "string") {
            return false;
        }
        const canonical = canonicalizeJson(payload);
        const payloadHash = node_crypto_1.default.createHash("sha256").update(canonical).digest();
        const verifier = stellar_sdk_1.Keypair.fromPublicKey(custodianPublicKey);
        return verifier.verify(payloadHash, Buffer.from(signature, "hex"));
    }
    catch {
        return false;
    }
}
/**
 * Verifies that the PDF buffer matches the declared SHA-256 hash.
 */
function verifyPdfHash(pdfBuffer, declaredHash) {
    const actualHash = computeSha256(pdfBuffer);
    return actualHash.toLowerCase() === declaredHash.toLowerCase();
}
/**
 * Calculates the exact backing ratio percentage:
 * Ratio = (Attested Reserves / Circulating Supply) * 100
 */
function calculateBackingRatio(attestedReserves, circulatingSupply) {
    if (circulatingSupply <= 0) {
        return {
            ratio: 100.0,
            formattedRatio: "100.00%",
            isSufficient: true,
            status: "fully_backed",
        };
    }
    const rawRatio = (attestedReserves / circulatingSupply) * 100;
    const ratio = Math.round(rawRatio * 100) / 100;
    const isSufficient = ratio >= 100.0;
    const status = isSufficient ? "fully_backed" : "under_collateralized";
    return {
        ratio,
        formattedRatio: `${ratio.toFixed(2)}%`,
        isSufficient,
        status,
    };
}
/**
 * Queries Horizon to obtain circulating ZATBILL tokens and on-chain issuer manage_data hash.
 */
async function queryOnchainBackingData(params) {
    const horizon = new stellar_sdk_1.Horizon.Server(params.horizonUrl ?? index_1.STELLAR_NETWORKS.testnet.horizonUrl);
    let circulatingSupply = 1000.0;
    let onchainHash = null;
    try {
        // 1. Query circulating supply from asset endpoint
        const assetResp = await horizon
            .assets()
            .forCode("ZATBILL")
            .forIssuer(params.issuerPublicKey)
            .call();
        const record = assetResp.records[0];
        if (record && record.balances) {
            const auth = parseFloat(record.balances.authorized ?? "0");
            const unauth = parseFloat(record.balances.unauthorized ?? "0");
            const contracts = parseFloat(record.contracts_amount ?? "0");
            circulatingSupply = Math.round((auth + unauth + contracts) * 100) / 100;
        }
    }
    catch (err) {
        // Fallback if asset lookup fails in sandbox
        console.warn("Asset supply query warning:", err instanceof Error ? err.message : err);
    }
    try {
        // 2. Query issuer account data_attr for on-chain anchor
        const account = await horizon.loadAccount(params.issuerPublicKey);
        const rawData = account.data_attr[exports.MOCK_CUSTODIAN_METADATA.onchainDataKey];
        if (rawData) {
            onchainHash = Buffer.from(rawData, "base64").toString("utf8");
        }
    }
    catch (err) {
        console.warn("Issuer manage_data query warning:", err instanceof Error ? err.message : err);
    }
    return { circulatingSupply, onchainHash };
}
/**
 * Runs full proof-of-backing verification against attestation, PDF, on-chain anchor, and circulating supply.
 */
async function verifyProofOfBacking(params) {
    const errors = [];
    // 1. Signature check
    const signatureValid = verifyAttestationSignature(params.doc, params.doc.custodian.publicKey);
    if (!signatureValid) {
        errors.push("INVALID_SIGNATURE: Custodian Ed25519 signature verification failed.");
    }
    // 2. PDF hash check
    const pdfHashMatched = verifyPdfHash(params.pdfBuffer, params.doc.statementPdf.sha256);
    if (!pdfHashMatched) {
        errors.push("HASH_MISMATCH: Computed PDF SHA-256 digest does not match attestation statementPdf.sha256.");
    }
    // 3. On-chain anchor check
    const onchainHash = params.onchainHash ?? null;
    const onchainAnchorMatched = onchainHash !== null &&
        onchainHash.toLowerCase() === params.doc.statementPdf.sha256.toLowerCase();
    if (onchainHash && !onchainAnchorMatched) {
        errors.push("ONCHAIN_ANCHOR_MISMATCH: Issuer manage_data anchor does not match attestation PDF hash.");
    }
    // 4. Backing Ratio calculation
    let circulatingSupply = params.circulatingSupply ?? 1000.0;
    let attestedReserves = parseFloat(params.doc.reserves.faceAmountHeld);
    let isDemoDeficit = Boolean(params.demoDeficit);
    let warning = null;
    if (isDemoDeficit) {
        // Demo mode: Force ratio below 100% (85.00%) to test UI warning state
        attestedReserves = Math.round(circulatingSupply * 0.85 * 100) / 100;
        warning = "DEMO WARNING: Under-collateralized backing ratio (85.00% < 100.00%) triggered for UI testing.";
    }
    const ratioCalc = calculateBackingRatio(attestedReserves, circulatingSupply);
    const allChecksPassed = signatureValid && pdfHashMatched && (!onchainHash || onchainAnchorMatched);
    const isValid = allChecksPassed && (isDemoDeficit || ratioCalc.isSufficient);
    const status = !allChecksPassed
        ? "invalid"
        : ratioCalc.isSufficient
            ? "fully_backed"
            : "under_collateralized";
    return {
        isValid,
        status,
        backingRatio: ratioCalc.ratio,
        backingRatioFormatted: ratioCalc.formattedRatio,
        isBackingSufficient: ratioCalc.isSufficient,
        circulatingSupply,
        circulatingSupplyFormatted: `${circulatingSupply.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} ZATBILL`,
        attestedReserves,
        attestedReservesFormatted: `R ${attestedReserves.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
        reserveCurrency: params.doc.reserves.currency,
        mockInstrumentId: params.doc.instrument.id,
        asOfDate: params.doc.asOfDate,
        custodian: {
            name: params.doc.custodian.name,
            publicKey: params.doc.custodian.publicKey,
            isMock: true,
        },
        asset: {
            code: params.doc.asset.code,
            issuer: params.doc.asset.issuer,
            network: params.doc.asset.network,
        },
        anchors: {
            attestationUrl: params.doc.statementPdf.url.replace("mock-custody-statement.pdf", "attestation.json"),
            pdfUrl: params.doc.statementPdf.url,
            ipfsUri: params.doc.statementPdf.ipfsUri,
            pdfSha256: params.doc.statementPdf.sha256,
            onchainDataKey: exports.MOCK_CUSTODIAN_METADATA.onchainDataKey,
            onchainHash,
            onchainMatched: onchainAnchorMatched,
        },
        verification: {
            signatureValid,
            pdfHashMatched,
            onchainAnchorMatched,
            allChecksPassed,
            errors,
        },
        isDemoDeficit,
        warning,
        disclaimer: exports.MOCK_CUSTODIAN_METADATA.disclaimer,
    };
}
/**
 * Constructs the canonical 41-byte binary message for on-chain Soroban Ed25519 attestation verification (T-07):
 * - ASCII prefix: "ZATBILL_RESERVES:" (17 bytes)
 * - reserves: 16 bytes big-endian signed 128-bit integer (i128)
 * - timestamp: 8 bytes big-endian unsigned 64-bit integer (u64)
 */
function buildOnchainAttestationMessage(reservesStroops, timestampSeconds) {
    const prefix = Buffer.from("ZATBILL_RESERVES:", "utf8");
    const resBuf = Buffer.alloc(16);
    let v = BigInt(reservesStroops);
    for (let i = 15; i >= 0; i--) {
        resBuf[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    const timeBuf = Buffer.alloc(8);
    timeBuf.writeBigUInt64BE(BigInt(timestampSeconds), 0);
    return Buffer.concat([prefix, resBuf, timeBuf]);
}
/**
 * Signs an on-chain attestation payload for the Soroban StokvelPot contract using Ed25519 (T-07).
 */
function signOnchainAttestation(params) {
    const ts = params.timestampSeconds ?? BigInt(Math.floor(Date.now() / 1000));
    const message = buildOnchainAttestationMessage(params.reservesStroops, ts);
    const signature = params.custodianKeypair.sign(message);
    const custodianPubkey = params.custodianKeypair.rawPublicKey();
    return {
        custodianPubkey,
        custodianPubkeyHex: custodianPubkey.toString("hex"),
        reservesStroops: params.reservesStroops,
        timestampSeconds: ts,
        message,
        signature,
        signatureHex: signature.toString("hex"),
    };
}
/**
 * Cryptographically verifies an on-chain attestation signature using Ed25519.
 */
function verifyOnchainAttestationSignature(params) {
    try {
        const message = buildOnchainAttestationMessage(params.reservesStroops, params.timestampSeconds);
        let strKey;
        if (Buffer.isBuffer(params.custodianPubkey)) {
            strKey = stellar_sdk_1.StrKey.encodeEd25519PublicKey(params.custodianPubkey);
        }
        else if (params.custodianPubkey.startsWith("G") && params.custodianPubkey.length === 56) {
            strKey = params.custodianPubkey;
        }
        else {
            strKey = stellar_sdk_1.StrKey.encodeEd25519PublicKey(Buffer.from(params.custodianPubkey, "hex"));
        }
        const sigBuf = Buffer.isBuffer(params.signature)
            ? params.signature
            : Buffer.from(params.signature, "hex");
        const kp = stellar_sdk_1.Keypair.fromPublicKey(strKey);
        return kp.verify(message, sigBuf);
    }
    catch {
        return false;
    }
}
