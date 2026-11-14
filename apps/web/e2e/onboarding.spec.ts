import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("sample sign-up requires consent and ends in a safe, timed state", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request.url());
    }
  });

  await page.goto("/");
  await page
    .getByRole("radio", { name: /Email.*member@example\.test/ })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/onboarding\?contact=email/);
  await page.locator('[data-onboarding-ready="true"]').waitFor();
  await expect(
    page.getByRole("heading", { name: "Privacy and demo checks" }),
  ).toBeVisible();

  await expect(page.getByLabel("13-digit sample identity number")).toHaveValue(
    "9001015000085",
  );
  await expect(
    page.getByLabel("13-digit sample identity number"),
  ).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Email or mobile number")).toHaveValue(
    "member@example.test",
  );
  await expect(page.getByLabel("Email or mobile number")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(
    page.getByLabel(
      "I have read this privacy notice and agree to run the synthetic demo check.",
    ),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Check sample details" }),
  ).toBeDisabled();

  await page
    .getByLabel(
      "I have read this privacy notice and agree to run the synthetic demo check.",
    )
    .check();
  await page.getByRole("button", { name: "Check sample details" }).click();
  await expect(page.getByText("Screen 3 of 3")).toBeVisible();
  await expect(page.locator(".error-state strong")).toHaveText(
    "Not verified yet",
  );
  await expect(
    page.getByText(/no real identity verification or wallet setup/i),
  ).toBeVisible();

  const metric = await page.evaluate(() =>
    JSON.parse(
      sessionStorage.getItem("stockonchain-demo-onboarding-metric") ?? "null",
    ),
  );
  expect(metric).toMatchObject({ outcome: "sample_passed", screens: 3 });
  expect(metric.durationMs).toBeGreaterThan(0);
  expect(metric.durationMs).toBeLessThan(120_000);
  expect(JSON.stringify(metric)).not.toMatch(
    /member@example\.test|27000000000|9001015000085|123456/,
  );
  expect(apiRequests).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-ZA");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("incorrect sample code remains not verified without sending data", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request.url());
    }
  });

  await page.goto("/onboarding?contact=phone");
  await page.locator('[data-onboarding-ready="true"]').waitFor();
  await expect(
    page.getByRole("heading", { name: "Privacy and demo checks" }),
  ).toBeVisible();
  await page.getByLabel("Six-digit demo code").fill("654321");
  await page
    .getByLabel(
      "I have read this privacy notice and agree to run the synthetic demo check.",
    )
    .check();
  await page.getByRole("button", { name: "Check sample details" }).click();
  await expect(page.locator(".error-state strong")).toHaveText(
    "Not verified yet",
  );
  await expect(page.getByText(/sample checks did not pass/i)).toBeVisible();
  await page.locator('[data-onboarding-ready="true"]').waitFor();
  expect(apiRequests).toEqual([]);
});
