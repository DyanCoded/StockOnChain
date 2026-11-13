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
import { Keypair } from "@stellar/stellar-sdk";
export declare const MOCK_CUSTODIAN_METADATA: {
    name: string;
    location: string;
    disclaimer: string;
    mockInstrumentId: string;
    mockInstrumentDescription: string;
    onchainDataKey: string;
    defaultIpfsUri: string;
};
export interface CustodianAttestationPayload {
    documentType: "mock-custodian-reserve-attestation";
    disclaimer: string;
    custodian: {
        name: string;
        publicKey: string;
        location: string;
        isMock: true;
    };
    asset: {
        code: "ZATBILL";
        issuer: string;
        network: "testnet";
    };
    instrument: {
        id: string;
        description: string;
        faceValuePerUnit: string;
        currency: string;
    };
    reserves: {
        faceAmountHeld: string;
        currency: string;
        unitsHeld: number;
    };
    statementPdf: {
        filename: string;
        url: string;
        ipfsUri: string;
        sha256: string;
    };
    asOfDate: string;
}
export interface CustodianAttestationDocument extends CustodianAttestationPayload {
    signature: string;
}
export interface BackingVerificationResult {
    isValid: boolean;
    status: "fully_backed" | "under_collateralized" | "invalid";
    backingRatio: number;
    backingRatioFormatted: string;
    isBackingSufficient: boolean;
    circulatingSupply: number;
    circulatingSupplyFormatted: string;
    attestedReserves: number;
    attestedReservesFormatted: string;
    reserveCurrency: string;
    mockInstrumentId: string;
    asOfDate: string;
    custodian: {
        name: string;
        publicKey: string;
        isMock: boolean;
    };
    asset: {
        code: string;
        issuer: string;
        network: string;
    };
    anchors: {
        attestationUrl: string;
        pdfUrl: string;
        ipfsUri: string;
        pdfSha256: string;
        onchainDataKey: string;
        onchainHash: string | null;
        onchainMatched: boolean;
    };
    verification: {
        signatureValid: boolean;
        pdfHashMatched: boolean;
        onchainAnchorMatched: boolean;
        allChecksPassed: boolean;
        errors: string[];
    };
    isDemoDeficit: boolean;
    warning: string | null;
    disclaimer: string;
}
/**
 * Generates a valid standard PDF-1.4 binary buffer for the Mock Custody Statement.
 * Contains visible headers, mock disclaimers, and instrument details.
 */
export declare function generateMockCustodyStatementPdf(params: {
    custodianPublicKey: string;
    issuerPublicKey: string;
    faceAmountHeld?: string;
    asOfDate?: string;
}): Buffer;
/**
 * Computes the SHA-256 hex digest of a buffer.
 */
export declare function computeSha256(buffer: Buffer): string;
/**
 * Deterministically canonicalizes a JSON object by sorting keys alphabetically at all levels.
 */
export declare function canonicalizeJson(obj: unknown): string;
/**
 * Generates and cryptographically signs a Custodian Attestation document using Ed25519.
 */
export declare function generateCustodianAttestation(params: {
    custodianKeypair: Keypair;
    issuerPublicKey: string;
    pdfSha256: string;
    homeDomain: string;
    faceAmountHeld?: string;
    unitsHeld?: number;
    asOfDate?: string;
}): CustodianAttestationDocument;
/**
 * Cryptographically verifies the Ed25519 signature of an attestation document.
 */
export declare function verifyAttestationSignature(doc: CustodianAttestationDocument, custodianPublicKey: string): boolean;
/**
 * Verifies that the PDF buffer matches the declared SHA-256 hash.
 */
export declare function verifyPdfHash(pdfBuffer: Buffer, declaredHash: string): boolean;
/**
 * Calculates the exact backing ratio percentage:
 * Ratio = (Attested Reserves / Circulating Supply) * 100
 */
export declare function calculateBackingRatio(attestedReserves: number, circulatingSupply: number): {
    ratio: number;
    formattedRatio: string;
    isSufficient: boolean;
    status: "fully_backed" | "under_collateralized" | "invalid";
};
/**
 * Queries Horizon to obtain circulating ZATBILL tokens and on-chain issuer manage_data hash.
 */
export declare function queryOnchainBackingData(params: {
    issuerPublicKey: string;
    horizonUrl?: string;
}): Promise<{
    circulatingSupply: number;
    onchainHash: string | null;
}>;
/**
 * Runs full proof-of-backing verification against attestation, PDF, on-chain anchor, and circulating supply.
 */
export declare function verifyProofOfBacking(params: {
    doc: CustodianAttestationDocument;
    pdfBuffer: Buffer;
    onchainHash?: string | null;
    circulatingSupply?: number;
    demoDeficit?: boolean;
}): Promise<BackingVerificationResult>;
/**
 * Constructs the canonical 41-byte binary message for on-chain Soroban Ed25519 attestation verification (T-07):
 * - ASCII prefix: "ZATBILL_RESERVES:" (17 bytes)
 * - reserves: 16 bytes big-endian signed 128-bit integer (i128)
 * - timestamp: 8 bytes big-endian unsigned 64-bit integer (u64)
 */
export declare function buildOnchainAttestationMessage(reservesStroops: bigint, timestampSeconds: bigint): Buffer;
/**
 * Signs an on-chain attestation payload for the Soroban StokvelPot contract using Ed25519 (T-07).
 */
export declare function signOnchainAttestation(params: {
    custodianKeypair: Keypair;
    reservesStroops: bigint;
    timestampSeconds?: bigint;
}): {
    custodianPubkey: Buffer;
    custodianPubkeyHex: string;
    reservesStroops: bigint;
    timestampSeconds: bigint;
    message: Buffer;
    signature: Buffer;
    signatureHex: string;
};
/**
 * Cryptographically verifies an on-chain attestation signature using Ed25519.
 */
export declare function verifyOnchainAttestationSignature(params: {
    custodianPubkey: Buffer | string;
    reservesStroops: bigint;
    timestampSeconds: bigint;
    signature: Buffer | string;
}): boolean;
