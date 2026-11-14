import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPREHENSION_QUESTIONS,
  createStokvelPot,
  D01_GLOSSARY,
  evaluateRuleComprehension,
  generatePotInvite,
  joinStokvelPot,
  parsePotInviteToken,
  POT_RULES_ANCHORED_SUMMARY,
  POT_TERM_OPTIONS,
} from "./pot-create-join";

test("pot-create-join - supports 91, 182, 364 day terms alongside the 120s demo bill option", async () => {
  assert.equal(POT_TERM_OPTIONS.length, 4);
  const keys = POT_TERM_OPTIONS.map((t) => t.key);
  assert.deepEqual(keys, [
    "standard91Day",
    "standard182Day",
    "standard364Day",
    "demoTimeCompressed",
  ]);

  const pot182 = await createStokvelPot({
    potName: "Masakhane 182-Day Stokvel",
    termKey: "standard182Day",
    monthlyContributionRand: 50,
    memberCapRand: 300,
    creatorName: "Nandi M. (Synthetic Treasurer)",
    mode: "testnet",
    fetchImpl: async () =>
      new Response(JSON.stringify({ result: { sequence: 901234 } }), {
        status: 200,
      }),
  });

  assert.equal(pot182.termDays, 182);
  assert.equal(pot182.termSeconds, 182 * 86400);
  assert.equal(pot182.isTimeCompressed, false);
  assert.equal(pot182.treasurer.role, "Treasurer");
  assert.equal(pot182.treasurer.isCreator, true);
  assert.equal(pot182.members[0].role, "Treasurer");
  assert.match(pot182.monthlyContributionFormatted, /50[,.]00/);
  assert.match(pot182.memberCapFormatted, /300[,.]00/);

  const pot364 = await createStokvelPot({
    potName: "Siyakhula 364-Day Stokvel",
    termKey: "standard364Day",
    monthlyContributionRand: 100,
    memberCapRand: 600,
    mode: "mock",
  });
  assert.equal(pot364.termDays, 364);
  assert.equal(pot364.termSeconds, 364 * 86400);

  const potDemo = await createStokvelPot({
    potName: "Time-Compressed Demo Pot",
    termKey: "demoTimeCompressed",
    monthlyContributionRand: 25,
    memberCapRand: 100,
    mode: "testnet",
    fetchImpl: async () =>
      new Response(JSON.stringify({ result: { sequence: 901235 } }), {
        status: 200,
      }),
  });
  assert.equal(potDemo.isTimeCompressed, true);
  assert.equal(potDemo.termSeconds, 120);
});

test("pot-create-join - generates direct invitation links and WhatsApp share URLs and round-trips token", async () => {
  const created = await createStokvelPot({
    potName: "Ubuntu Siyakhula Pot",
    termKey: "standard91Day",
    monthlyContributionRand: 50,
    memberCapRand: 250,
    creatorName: "Nandi M. (Synthetic Treasurer)",
    mode: "testnet",
    fetchImpl: async () =>
      new Response(JSON.stringify({ result: { sequence: 888111 } }), {
        status: 200,
      }),
  });

  const invite = generatePotInvite(created, "https://stockonchain.test", "en");
  assert.ok(invite.inviteCode.length > 20);
  assert.ok(
    invite.directInviteUrl.startsWith(
      "https://stockonchain.test/pot/join?invite=",
    ),
  );
  assert.ok(invite.whatsappShareUrl.startsWith("https://wa.me/?text="));
  assert.ok(invite.whatsappMessageText.includes("Ubuntu Siyakhula Pot"));
  assert.ok(invite.whatsappMessageText.includes("Treasurer"));
  assert.ok(invite.whatsappMessageText.includes("docs/POT_RULES.md"));

  const parsed = parsePotInviteToken(invite.inviteCode);
  assert.equal(parsed.potName, "Ubuntu Siyakhula Pot");
  assert.equal(parsed.termKey, "standard91Day");
  assert.equal(parsed.monthlyContributionRand, 50);
  assert.equal(parsed.memberCapRand, 250);
  assert.equal(parsed.treasurer.role, "Treasurer");
});

test("pot-create-join - adheres strictly to D-01 glossary and docs/POT_RULES.md pool rules", () => {
  const expectedTerms = [
    "Stokvel",
    "Treasurer",
    "T-Bill",
    "Custodian",
    "Maturity",
    "Yield",
    "Testnet",
    "Wallet key",
    "Trustline",
    "Mock asset",
    "Attestation",
    "Soroban",
  ];
  assert.deepEqual(
    D01_GLOSSARY.map((g) => g.term),
    expectedTerms,
  );
  assert.equal(POT_RULES_ANCHORED_SUMMARY.length, 5);
  assert.equal(COMPREHENSION_QUESTIONS.length, 3);
});

test("pot-create-join - enforces RiskExplainer review and rule comprehension before joining on Testnet", async () => {
  const pot = await createStokvelPot({
    potName: "Kea Stokvel Testnet Pot",
    termKey: "demoTimeCompressed",
    monthlyContributionRand: 50,
    memberCapRand: 200,
    mode: "testnet",
    fetchImpl: async () =>
      new Response(JSON.stringify({ result: { sequence: 999000 } }), {
        status: 200,
      }),
  });

  const correctAnswers = {
    maturityLockup: "after_maturity_and_settlement",
    yieldAndMockStatus: "not_guaranteed_and_simulated_testnet",
    memberCapAndAllowlist: "allowlisted_members_and_cap_enforced",
  };

  // Rejects when RiskExplainer has not been reviewed
  await assert.rejects(
    () =>
      joinStokvelPot({
        pot,
        memberDisplayName: "Zanele P. (Synthetic Member)",
        memberAddress:
          "GE2W6C9Q9N6XY8A5Z7U0M1O2P5Q6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0",
        hasReviewedRiskExplainer: false,
        hasAcceptedPotRules: true,
        comprehensionAnswers: correctAnswers,
      }),
    /Risk Explainer/,
  );

  // Rejects when comprehension check fails
  const wrongEval = evaluateRuleComprehension({
    ...correctAnswers,
    yieldAndMockStatus: "guaranteed_bank_interest",
  });
  assert.equal(wrongEval.passed, false);
  assert.equal(wrongEval.score, 2);
  assert.deepEqual(wrongEval.failedQuestionIds, ["yieldAndMockStatus"]);

  // Succeeds when RiskExplainer, Pot Rules, and 3/3 Comprehension checks pass
  const joined = await joinStokvelPot({
    pot,
    memberDisplayName: "Zanele P. (Synthetic Member)",
    memberAddress: "GE2W6C9Q9N6XY8A5Z7U0M1O2P5Q6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0",
    hasReviewedRiskExplainer: true,
    hasAcceptedPotRules: true,
    comprehensionAnswers: correctAnswers,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          _embedded: {
            records: [
              {
                hash: "2139e7303d556af1ebe4260964806bcd6cdb8baf43b786e5ae2ee32732bee394",
              },
            ],
          },
        }),
        { status: 200 },
      ),
  });

  assert.equal(joined.success, true);
  assert.equal(joined.comprehension.passed, true);
  assert.equal(joined.comprehension.score, 3);
  assert.ok(
    joined.pot.members.some(
      (m) => m.displayName === "Zanele P. (Synthetic Member)",
    ),
  );
  assert.match(joined.explorerUrl, /horizon-testnet\.stellar\.org/);
});
