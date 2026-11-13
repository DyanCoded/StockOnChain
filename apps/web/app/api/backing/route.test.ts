import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";
import { Keypair } from "@stellar/stellar-sdk";

test("API /api/backing returns valid fully backed attestation verification", async () => {
  const originalEnv = {
    custodian: process.env.STELLAR_CUSTODIAN_SECRET_KEY,
    zatbill: process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY,
    domain: process.env.STELLAR_HOME_DOMAIN,
  };

  const testCustodian = Keypair.random();
  const testIssuer = Keypair.random();

  process.env.STELLAR_CUSTODIAN_SECRET_KEY = testCustodian.secret();
  process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY = testIssuer.publicKey();
  process.env.STELLAR_HOME_DOMAIN = "test.stockonchain.app";

  try {
    const req = new Request("https://test.stockonchain.app/api/backing");
    const res = await GET(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.isValid, true);
    assert.equal(body.status, "fully_backed");
    assert.equal(body.backingRatio >= 100, true);
    assert.equal(body.verification.signatureValid, true);
    assert.equal(body.verification.pdfHashMatched, true);
    assert.equal(body.isDemoDeficit, false);
    assert.match(body.disclaimer, /MOCK CUSTODIAN DISCLOSURE/i);
    assert.equal(body.custodian.isMock, true);
  } finally {
    if (originalEnv.custodian) {
      process.env.STELLAR_CUSTODIAN_SECRET_KEY = originalEnv.custodian;
    } else {
      delete process.env.STELLAR_CUSTODIAN_SECRET_KEY;
    }
    if (originalEnv.zatbill) {
      process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY = originalEnv.zatbill;
    } else {
      delete process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY;
    }
    if (originalEnv.domain) {
      process.env.STELLAR_HOME_DOMAIN = originalEnv.domain;
    } else {
      delete process.env.STELLAR_HOME_DOMAIN;
    }
  }
});

test("API /api/backing supports ?demo_deficit=true toggle for UI warning testing", async () => {
  const originalEnv = {
    custodian: process.env.STELLAR_CUSTODIAN_SECRET_KEY,
    zatbill: process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY,
    domain: process.env.STELLAR_HOME_DOMAIN,
  };

  const testCustodian = Keypair.random();
  const testIssuer = Keypair.random();

  process.env.STELLAR_CUSTODIAN_SECRET_KEY = testCustodian.secret();
  process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY = testIssuer.publicKey();
  process.env.STELLAR_HOME_DOMAIN = "test.stockonchain.app";

  try {
    const req = new Request(
      "https://test.stockonchain.app/api/backing?demo_deficit=true",
    );
    const res = await GET(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.isDemoDeficit, true);
    assert.equal(body.backingRatio, 85.0);
    assert.equal(body.backingRatioFormatted, "85.00%");
    assert.equal(body.isBackingSufficient, false);
    assert.equal(body.status, "under_collateralized");
    assert.match(body.warning, /DEMO WARNING/i);
  } finally {
    if (originalEnv.custodian) {
      process.env.STELLAR_CUSTODIAN_SECRET_KEY = originalEnv.custodian;
    } else {
      delete process.env.STELLAR_CUSTODIAN_SECRET_KEY;
    }
    if (originalEnv.zatbill) {
      process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY = originalEnv.zatbill;
    } else {
      delete process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY;
    }
    if (originalEnv.domain) {
      process.env.STELLAR_HOME_DOMAIN = originalEnv.domain;
    } else {
      delete process.env.STELLAR_HOME_DOMAIN;
    }
  }
});
