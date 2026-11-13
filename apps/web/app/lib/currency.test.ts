import assert from "node:assert/strict";
import test from "node:test";
import { formatMzarAsRand } from "./currency.js";

test("mZAR uses South African rand formatting with two decimal places", () => {
  assert.equal(
    formatMzarAsRand(1234.5).replace(/[\u00a0\u202f]/g, " "),
    "R 1 234,50",
  );
});

test("mZAR formatting rejects non-finite amounts", () => {
  assert.throws(() => formatMzarAsRand(Number.NaN), /finite numbers/);
});
