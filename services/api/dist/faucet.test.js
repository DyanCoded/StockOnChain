"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const faucet_js_1 = require("./faucet.js");
const destination = "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";
(0, node_test_1.default)("mZAR faucet enforces one claim per account for the full cooldown", async () => {
    const limiter = new faucet_js_1.MzarRateLimiter();
    let issueCount = 0;
    const issue = async () => {
        issueCount += 1;
        return "testnet-transaction";
    };
    const now = 1_000_000;
    const first = await (0, faucet_js_1.claimMzar)(destination, limiter, issue, now);
    const duplicate = await (0, faucet_js_1.claimMzar)(destination, limiter, issue, now + 1);
    const afterCooldown = await (0, faucet_js_1.claimMzar)(destination, limiter, issue, now + faucet_js_1.MZAR_FAUCET_COOLDOWN_MS);
    strict_1.default.equal(first.status, 200);
    strict_1.default.equal(first.body.amount, "100");
    strict_1.default.equal(duplicate.status, 429);
    strict_1.default.equal(duplicate.retryAfterSeconds, 86_400);
    strict_1.default.equal(afterCooldown.status, 200);
    strict_1.default.equal(issueCount, 2);
});
(0, node_test_1.default)("concurrent faucet requests cannot bypass the account cooldown", async () => {
    const limiter = new faucet_js_1.MzarRateLimiter();
    let issueCount = 0;
    let releaseIssue;
    const pendingIssue = new Promise((resolve) => {
        releaseIssue = () => resolve("testnet-transaction");
    });
    const issue = async () => {
        issueCount += 1;
        return pendingIssue;
    };
    const firstRequest = (0, faucet_js_1.claimMzar)(destination, limiter, issue, 2_000_000);
    const secondRequest = await (0, faucet_js_1.claimMzar)(destination, limiter, issue, 2_000_000);
    releaseIssue?.();
    const firstResult = await firstRequest;
    strict_1.default.equal(firstResult.status, 200);
    strict_1.default.equal(secondRequest.status, 429);
    strict_1.default.equal(issueCount, 1);
});
(0, node_test_1.default)("missing trustline does not consume the faucet allowance", async () => {
    const limiter = new faucet_js_1.MzarRateLimiter();
    const result = await (0, faucet_js_1.claimMzar)(destination, limiter, async () => {
        throw new faucet_js_1.MzarTrustlineRequiredError();
    }, 3_000_000);
    const retry = await (0, faucet_js_1.claimMzar)(destination, limiter, async () => "testnet-transaction", 3_000_001);
    strict_1.default.equal(result.status, 409);
    strict_1.default.equal(retry.status, 200);
});
(0, node_test_1.default)("mZAR faucet cooldown survives limiter restarts without storing account keys", async () => {
    const directory = (0, node_fs_1.mkdtempSync)(node_path_1.default.join((0, node_os_1.tmpdir)(), "mzar-faucet-"));
    const statePath = node_path_1.default.join(directory, "rate-limits.json");
    try {
        const firstLimiter = new faucet_js_1.MzarRateLimiter(statePath);
        const first = await (0, faucet_js_1.claimMzar)(destination, firstLimiter, async () => "testnet-transaction", 4_000_000);
        const restartedLimiter = new faucet_js_1.MzarRateLimiter(statePath);
        const afterRestart = await (0, faucet_js_1.claimMzar)(destination, restartedLimiter, async () => "should-not-be-issued", 4_000_001);
        strict_1.default.equal(first.status, 200);
        strict_1.default.equal(afterRestart.status, 429);
        strict_1.default.doesNotMatch((0, node_fs_1.readFileSync)(statePath, "utf8"), new RegExp(destination));
    }
    finally {
        (0, node_fs_1.rmSync)(directory, { recursive: true, force: true });
    }
});
(0, node_test_1.default)("separate API limiter instances share an atomic persistent cooldown", async () => {
    const directory = (0, node_fs_1.mkdtempSync)(node_path_1.default.join((0, node_os_1.tmpdir)(), "mzar-faucet-shared-"));
    const statePath = node_path_1.default.join(directory, "rate-limits.json");
    try {
        const firstLimiter = new faucet_js_1.MzarRateLimiter(statePath);
        const secondLimiter = new faucet_js_1.MzarRateLimiter(statePath);
        const first = await (0, faucet_js_1.claimMzar)(destination, firstLimiter, async () => "testnet-transaction", 5_000_000);
        const second = await (0, faucet_js_1.claimMzar)(destination, secondLimiter, async () => "should-not-be-issued", 5_000_001);
        strict_1.default.equal(first.status, 200);
        strict_1.default.equal(second.status, 429);
    }
    finally {
        (0, node_fs_1.rmSync)(directory, { recursive: true, force: true });
    }
});
