"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const dotenv_1 = require("dotenv");
const node_path_1 = __importDefault(require("node:path"));
(0, dotenv_1.config)({ path: node_path_1.default.join(process.cwd(), ".env"), quiet: true });
const keeper_js_1 = require("./keeper.js");
(0, node_test_1.default)("KeeperService - full hands-off lifecycle execution from open to invest to settle and claim", async () => {
    const keeper = new keeper_js_1.KeeperService();
    // Initial state is open
    const initial = keeper.getStatus();
    strict_1.default.equal(initial.lifecycleState, "open");
    strict_1.default.equal(initial.step, "idle");
    // Step 1: Execute Buy Window & Invest
    await keeper.executeCycleStep();
    const invested = keeper.getStatus();
    strict_1.default.equal(invested.lifecycleState, "invested");
    strict_1.default.equal(invested.step, "waiting_for_maturity");
    strict_1.default.ok(invested.timeRemainingSeconds > 0);
    // Fast forward maturity to simulate passage of time
    const ffRes = keeper.fastForwardMaturity(130);
    strict_1.default.equal(ffRes.success, true);
    strict_1.default.equal(ffRes.timeRemainingSeconds, 0);
    // Step 2: Mature & Settle
    await keeper.executeCycleStep();
    const settled = keeper.getStatus();
    strict_1.default.equal(settled.lifecycleState, "settled");
    strict_1.default.equal(settled.step, "claiming");
    // Step 3: Complete Claims
    await keeper.executeCycleStep();
    const completed = keeper.getStatus();
    strict_1.default.equal(completed.lifecycleState, "closed");
    strict_1.default.equal(completed.step, "completed");
    strict_1.default.ok(completed.history.length >= 4);
});
(0, node_test_1.default)("KeeperService - single-step demo reset restores clean baseline seed state", async () => {
    const keeper = new keeper_js_1.KeeperService();
    // Fast forward and run cycles
    keeper.fastForwardMaturity(200);
    await keeper.executeCycleStep();
    await keeper.executeCycleStep();
    // Execute reset
    const resetRes = keeper.resetDemoState();
    strict_1.default.equal(resetRes.success, true);
    const resetStatus = keeper.getStatus();
    strict_1.default.equal(resetStatus.lifecycleState, "open");
    strict_1.default.equal(resetStatus.step, "idle");
    strict_1.default.equal(resetStatus.timeRemainingSeconds, 120);
    strict_1.default.equal(resetStatus.retries, 0);
});
