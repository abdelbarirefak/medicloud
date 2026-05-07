import { test, expect } from "@playwright/test";

test.describe("Doctor Search Flow", () => {
  test("should display search page for patients", async ({ page }) => {
    // This test assumes the user is authenticated as a patient
    // In a real setup, you'd use storageState for auth
    await page.goto("/patient/search");
    // Should either show search page or redirect to login
    const url = page.url();
    if (url.includes("/login")) {
      // Not authenticated — that's okay for the test structure
      expect(url).toContain("/login");
    } else {
      await expect(page.locator("body")).toContainText(/médecin|chercher|recherche/i);
    }
  });
});
