import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route.js";

test("stellar.toml advertises only the Testnet mock mZAR issuer", async () => {
  const original = {
    zatbill: process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY,
    mzar: process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY,
    domain: process.env.STELLAR_HOME_DOMAIN,
  };
  process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY =
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY =
    "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";
  process.env.STELLAR_HOME_DOMAIN = "assets.example.org";

  try {
    const response = GET();
    const toml = await response.text();
    assert.equal(response.status, 200);
    assert.match(
      toml,
      /NETWORK_PASSPHRASE="Test SDF Network ; September 2015"/,
    );
    assert.match(toml, /code="mZAR"/);
    assert.match(toml, /name="MOCK mZAR"/);
    assert.match(toml, /Testnet-only mock rand token/);
    assert.match(toml, /not backed by fiat reserves/);
    assert.match(toml, /code="ZATBILL"/);
  } finally {
    if (original.zatbill === undefined) {
      delete process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY;
    } else {
      process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY = original.zatbill;
    }
    if (original.mzar === undefined) {
      delete process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY;
    } else {
      process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY = original.mzar;
    }
    if (original.domain === undefined) {
      delete process.env.STELLAR_HOME_DOMAIN;
    } else {
      process.env.STELLAR_HOME_DOMAIN = original.domain;
    }
  }
});
