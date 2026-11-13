import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import {
  generateMockCustodyStatementPdf,
  computeSha256,
  generateCustodianAttestation,
  verifyAttestationSignature,
  verifyPdfHash,
  calculateBackingRatio,
  verifyProofOfBacking,
  MOCK_CUSTODIAN_METADATA,
} from './attestation';

test('attestation - Mock Custody Statement PDF generation and disclaimers', () => {
  const custodianKp = Keypair.random();
  const issuerKp = Keypair.random();

  const pdf = generateMockCustodyStatementPdf({
    custodianPublicKey: custodianKp.publicKey(),
    issuerPublicKey: issuerKp.publicKey(),
    faceAmountHeld: '1000.00',
    asOfDate: '2026-11-13T12:00:00.000Z',
  });

  assert.ok(pdf.length > 500, 'PDF buffer should be non-empty');
  assert.equal(pdf.slice(0, 8).toString(), '%PDF-1.4', 'Must start with PDF-1.4 header');

  const pdfText = pdf.toString('utf8');
  assert.ok(pdfText.includes('MOCK CUSTODIAN SERVICES'), 'Must contain mock custodian title');
  assert.ok(pdfText.includes('SIMULATED DEMO CUSTODY STATEMENT'), 'Must state simulated demo status');
  assert.ok(pdfText.includes('MOCK ZATBILL'), 'Must state mock asset code');
  assert.ok(pdfText.includes(MOCK_CUSTODIAN_METADATA.mockInstrumentId), 'Must include mock instrument ID');
  assert.ok(pdfText.includes('NO REAL SOUTH AFRICAN GOVERNMENT TREASURY BILLS'), 'Must include statutory disclaimers');

  const hash = computeSha256(pdf);
  assert.equal(hash.length, 64, 'SHA-256 hash must be 64 hex characters');
});

test('attestation - Ed25519 signature generation and tamper rejection', () => {
  const custodianKp = Keypair.random();
  const issuerKp = Keypair.random();

  const pdf = generateMockCustodyStatementPdf({
    custodianPublicKey: custodianKp.publicKey(),
    issuerPublicKey: issuerKp.publicKey(),
  });
  const pdfHash = computeSha256(pdf);

  const doc = generateCustodianAttestation({
    custodianKeypair: custodianKp,
    issuerPublicKey: issuerKp.publicKey(),
    pdfSha256: pdfHash,
    homeDomain: 'stockonchain.app',
    faceAmountHeld: '1000.00',
    unitsHeld: 1000,
  });

  // Verify valid signature
  const isValid = verifyAttestationSignature(doc, custodianKp.publicKey());
  assert.equal(isValid, true, 'Valid signature should verify successfully');

  // Tamper 1: Modify face amount held
  const tamperedAmount = {
    ...doc,
    reserves: { ...doc.reserves, faceAmountHeld: '2000.00' },
  };
  assert.equal(
    verifyAttestationSignature(tamperedAmount, custodianKp.publicKey()),
    false,
    'Tampering with face amount held must invalidate signature',
  );

  // Tamper 2: Modify statement PDF hash
  const tamperedHash = {
    ...doc,
    statementPdf: { ...doc.statementPdf, sha256: '0000000000000000000000000000000000000000000000000000000000000000' },
  };
  assert.equal(
    verifyAttestationSignature(tamperedHash, custodianKp.publicKey()),
    false,
    'Tampering with PDF hash must invalidate signature',
  );

  // Tamper 3: Modify instrument ID
  const tamperedInstrument = {
    ...doc,
    instrument: { ...doc.instrument, id: 'REAL-TREASURY-BOND-123' },
  };
  assert.equal(
    verifyAttestationSignature(tamperedInstrument, custodianKp.publicKey()),
    false,
    'Tampering with instrument ID must invalidate signature',
  );

  // Tamper 4: Corrupted signature string
  const corruptedSig = {
    ...doc,
    signature: 'bad' + doc.signature.slice(3),
  };
  assert.equal(
    verifyAttestationSignature(corruptedSig, custodianKp.publicKey()),
    false,
    'Corrupted signature must fail verification',
  );
});

test('attestation - PDF buffer tampering and hash verification', () => {
  const custodianKp = Keypair.random();
  const issuerKp = Keypair.random();

  const originalPdf = generateMockCustodyStatementPdf({
    custodianPublicKey: custodianKp.publicKey(),
    issuerPublicKey: issuerKp.publicKey(),
  });
  const validHash = computeSha256(originalPdf);

  // Original matches
  assert.equal(verifyPdfHash(originalPdf, validHash), true);

  // Alter single byte
  const tamperedPdf = Buffer.from(originalPdf);
  tamperedPdf[100] = tamperedPdf[100] === 65 ? 66 : 65;

  assert.equal(
    verifyPdfHash(tamperedPdf, validHash),
    false,
    'Tampered PDF byte must fail hash verification',
  );
});

test('attestation - Backing ratio calculations across scenarios', () => {
  // 1: Exactly 100% backed
  const r100 = calculateBackingRatio(1000, 1000);
  assert.equal(r100.ratio, 100.0);
  assert.equal(r100.formattedRatio, '100.00%');
  assert.equal(r100.isSufficient, true);
  assert.equal(r100.status, 'fully_backed');

  // 2: Under-collateralized (85% backed)
  const r85 = calculateBackingRatio(850, 1000);
  assert.equal(r85.ratio, 85.0);
  assert.equal(r85.formattedRatio, '85.00%');
  assert.equal(r85.isSufficient, false);
  assert.equal(r85.status, 'under_collateralized');

  // 3: Over-collateralized (110% backed)
  const r110 = calculateBackingRatio(1100, 1000);
  assert.equal(r110.ratio, 110.0);
  assert.equal(r110.formattedRatio, '110.00%');
  assert.equal(r110.isSufficient, true);
  assert.equal(r110.status, 'fully_backed');

  // 4: Zero supply edge case
  const rZero = calculateBackingRatio(1000, 0);
  assert.equal(rZero.ratio, 100.0);
  assert.equal(rZero.isSufficient, true);
});

test('attestation - Full proof-of-backing pipeline verification and tamper detection', async () => {
  const custodianKp = Keypair.random();
  const issuerKp = Keypair.random();

  const pdf = generateMockCustodyStatementPdf({
    custodianPublicKey: custodianKp.publicKey(),
    issuerPublicKey: issuerKp.publicKey(),
  });
  const pdfHash = computeSha256(pdf);

  const doc = generateCustodianAttestation({
    custodianKeypair: custodianKp,
    issuerPublicKey: issuerKp.publicKey(),
    pdfSha256: pdfHash,
    homeDomain: 'stockonchain.app',
  });

  // Happy Path: Everything valid and matching on-chain anchor
  const happyResult = await verifyProofOfBacking({
    doc,
    pdfBuffer: pdf,
    onchainHash: pdfHash,
    circulatingSupply: 1000,
  });

  assert.equal(happyResult.isValid, true);
  assert.equal(happyResult.status, 'fully_backed');
  assert.equal(happyResult.backingRatio, 100.0);
  assert.equal(happyResult.verification.allChecksPassed, true);
  assert.equal(happyResult.verification.signatureValid, true);
  assert.equal(happyResult.verification.pdfHashMatched, true);
  assert.equal(happyResult.verification.onchainAnchorMatched, true);
  assert.equal(happyResult.verification.errors.length, 0);

  // Failure Case 1: Tampered PDF Buffer
  const tamperedPdf = Buffer.from(pdf);
  tamperedPdf[50] = 0;
  const badPdfResult = await verifyProofOfBacking({
    doc,
    pdfBuffer: tamperedPdf,
    onchainHash: pdfHash,
    circulatingSupply: 1000,
  });
  assert.equal(badPdfResult.isValid, false);
  assert.equal(badPdfResult.status, 'invalid');
  assert.equal(badPdfResult.verification.pdfHashMatched, false);
  assert.ok(badPdfResult.verification.errors.some((e) => e.includes('HASH_MISMATCH')));

  // Failure Case 2: Tampered On-Chain Anchor
  const badAnchorResult = await verifyProofOfBacking({
    doc,
    pdfBuffer: pdf,
    onchainHash: 'badhash0000000000000000000000000000000000000000000000000000000000',
    circulatingSupply: 1000,
  });
  assert.equal(badAnchorResult.isValid, false);
  assert.equal(badAnchorResult.status, 'invalid');
  assert.equal(badAnchorResult.verification.onchainAnchorMatched, false);
  assert.ok(badAnchorResult.verification.errors.some((e) => e.includes('ONCHAIN_ANCHOR_MISMATCH')));

  // Failure Case 3: Tampered Document Signature
  const tamperedDoc = {
    ...doc,
    reserves: { ...doc.reserves, faceAmountHeld: '9999.00' },
  };
  const badSigResult = await verifyProofOfBacking({
    doc: tamperedDoc,
    pdfBuffer: pdf,
    onchainHash: pdfHash,
    circulatingSupply: 1000,
  });
  assert.equal(badSigResult.isValid, false);
  assert.equal(badSigResult.status, 'invalid');
  assert.equal(badSigResult.verification.signatureValid, false);
  assert.ok(badSigResult.verification.errors.some((e) => e.includes('INVALID_SIGNATURE')));
});

test('attestation - Demo deficit mode toggle forces under-collateralized state', async () => {
  const custodianKp = Keypair.random();
  const issuerKp = Keypair.random();

  const pdf = generateMockCustodyStatementPdf({
    custodianPublicKey: custodianKp.publicKey(),
    issuerPublicKey: issuerKp.publicKey(),
  });
  const pdfHash = computeSha256(pdf);

  const doc = generateCustodianAttestation({
    custodianKeypair: custodianKp,
    issuerPublicKey: issuerKp.publicKey(),
    pdfSha256: pdfHash,
    homeDomain: 'stockonchain.app',
  });

  // Run with demoDeficit: true
  const deficitResult = await verifyProofOfBacking({
    doc,
    pdfBuffer: pdf,
    onchainHash: pdfHash,
    circulatingSupply: 1000,
    demoDeficit: true,
  });

  assert.equal(deficitResult.isDemoDeficit, true);
  assert.equal(deficitResult.status, 'under_collateralized');
  assert.equal(deficitResult.backingRatio, 85.0);
  assert.equal(deficitResult.backingRatioFormatted, '85.00%');
  assert.equal(deficitResult.isBackingSufficient, false);
  assert.ok(deficitResult.warning?.includes('DEMO WARNING: Under-collateralized'));
  assert.equal(deficitResult.verification.allChecksPassed, true, 'Cryptographic checks still pass in demo deficit mode');
});
