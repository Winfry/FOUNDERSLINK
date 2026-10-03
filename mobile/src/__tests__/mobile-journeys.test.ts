import { beforeEach, describe, expect, it } from "vitest";
import { resetStoreForTests, submitApplication, approveApplication } from "../lib/application-store";
import { mockAuthService } from "../services/mocks/auth.mock";
import { mockInvestorApplicationService } from "../services/mocks/investor-application.mock";
import { mockFounderApplicationService } from "../services/mocks/founder-application.mock";
import { investorService } from "../services";
import { groupService } from "../services";

describe("Mobile service journeys", () => {
  beforeEach(() => resetStoreForTests());

  it("investor: application submit → admin approve (store) → login → discover founders", async () => {
    const { referenceNumber } = await mockInvestorApplicationService.submit({
      email: "mobile.inv@test.co.ke",
      fullName: "Mobile Investor",
      organization: "Angel",
      ticketSizeKes: 500_000,
    });
    expect(referenceNumber).toMatch(/FL-INV-APP/);

    const apps = await import("../lib/application-store").then((m) => m.listApplications("investor"));
    const app = apps.find((a) => a.referenceNumber === referenceNumber)!;
    const cred = approveApplication(app.id);

    const session = await mockAuthService.login({ identifier: cred.userId, password: cred.tempPassword });
    expect(session.user.mustChangePassword).toBe(true);
    expect(session.user.role).toBe("investor");

    await mockAuthService.setNewPassword(session.user.id, cred.tempPassword, "NewPass123!");
    const founders = await investorService.discover({});
    expect(founders.length).toBeGreaterThan(0);
  });

  it("founder: application → duplicate email blocked", async () => {
    await mockFounderApplicationService.submit({
      email: "dup@test.co.ke",
      fullName: "A",
      businessName: "A Co",
    });
    await expect(mockFounderApplicationService.submit({ email: "dup@test.co.ke", fullName: "B" })).rejects.toThrow();
  });

  it("investor: approved founder flow can list groups after mock login", async () => {
    const { user } = await mockAuthService.login({ identifier: "wanjiku@maziwafresh.co.ke", password: "password1" });
    expect(user.role).toBe("founder");
    const groups = await groupService.listGroups();
    expect(groups.length).toBeGreaterThan(0);
  });
});
