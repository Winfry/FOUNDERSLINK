import { test, expect } from "@playwright/test";

test.describe("Admin application review", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("super@founderlink.co.ke");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify and continue" }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("investor application detail shows documents and footer actions", async ({ page }) => {
    await page.goto("/investor-applications");
    await page.getByRole("link", { name: /Michael Njenga|Capital Partners/i }).first().click();
    await expect(page.getByText("Documents attached")).toBeVisible();
    await expect(page.getByText("Investment profile")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  test("founder applications queue opens detail", async ({ page }) => {
    await page.goto("/founder-applications");
    await page.getByRole("link", { name: /Nairobi Last-Mile|Brian/i }).first().click();
    await expect(page.getByText("Business details (as submitted)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  });
});
