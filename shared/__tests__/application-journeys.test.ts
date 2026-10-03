import { describe, expect, it, beforeEach } from "vitest";
import {
  approveApplication,
  assertEmailAvailable,
  checkApplicationStatus,
  getNotificationsForTests,
  listApplications,
  rejectApplication,
  resetStoreForTests,
  resolveLogin,
  submitApplication,
} from "../application-store";

describe("FounderLink application journeys (shared store)", () => {
  beforeEach(() => resetStoreForTests());

  it("rejects duplicate email on second application", () => {
    submitApplication({
      kind: "investor",
      email: "unique@test.co.ke",
      fullName: "Test User",
      payload: {},
    });
    expect(() => assertEmailAvailable("unique@test.co.ke")).toThrow();
  });

  it("investor journey: apply → approve → temp login → password change login", () => {
    const { referenceNumber, applicationId } = submitApplication({
      kind: "investor",
      email: "investor.journey@test.co.ke",
      fullName: "Journey Investor",
      payload: { organization: "Test Capital", ticketSizeKes: 1_000_000 },
      documents: [{ id: "d1", name: "ID.pdf", mimeType: "application/pdf" }],
    });
    expect(checkApplicationStatus("investor.journey@test.co.ke", referenceNumber).status).toBe("pending");

    const cred = approveApplication(applicationId);
    expect(cred.userId).toMatch(/^FL-INV-/);
    const notifications = getNotificationsForTests();
    expect(notifications.some((n) => n.email.includes("investor.journey") && n.body.includes(cred.userId))).toBe(true);

    const firstLogin = resolveLogin(cred.userId, cred.tempPassword);
    expect(firstLogin?.mustChangePassword).toBe(true);

    const afterChange = resolveLogin(cred.userId, "MySecurePass1");
    expect(afterChange?.mustChangePassword).toBe(false);
  });

  it("founder journey: apply → reject with reason → status shows reason", () => {
    const { referenceNumber, applicationId } = submitApplication({
      kind: "founder",
      email: "founder.journey@test.co.ke",
      fullName: "Journey Founder",
      payload: { businessName: "Test Co", county: "Nairobi" },
    });
    rejectApplication(applicationId, "Incomplete BRS documentation.");
    const status = checkApplicationStatus("founder.journey@test.co.ke", referenceNumber);
    expect(status.status).toBe("rejected");
    expect(status.reason).toContain("BRS");
    expect(getNotificationsForTests().some((n) => n.body.includes("BRS"))).toBe(true);
  });

  it("founder journey: apply → approve → founder credentials", () => {
    const { applicationId } = submitApplication({
      kind: "founder",
      email: "approved.founder@test.co.ke",
      fullName: "Approved Founder",
      payload: { businessName: "Agri Co" },
    });
    const cred = approveApplication(applicationId);
    expect(cred.role).toBe("founder");
    expect(cred.userId).toMatch(/^FL-FND-/);
    expect(listApplications("founder").find((a) => a.id === applicationId)?.status).toBe("approved");
  });
});
