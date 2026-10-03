/**
 * In-memory application & credential store shared by mobile mocks and admin services.
 * Replace with API persistence in production.
 */

export type ApplicationKind = "founder" | "investor";
export type ApplicationStatus =
  | "pending"
  | "more_info_requested"
  | "approved"
  | "rejected";

export interface StoredDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface PlatformApplication {
  id: string;
  kind: ApplicationKind;
  referenceNumber: string;
  email: string;
  phone?: string;
  fullName: string;
  status: ApplicationStatus;
  submittedAt: string;
  payload: Record<string, unknown>;
  documents: StoredDocument[];
  rejectionReason?: string;
}

export interface PlatformCredential {
  userId: string;
  email: string;
  tempPassword: string;
  role: "founder" | "investor";
  fullName: string;
  mustChangePassword: true;
}

export interface NotificationRecord {
  id: string;
  email: string;
  subject: string;
  body: string;
  createdAt: string;
}

const emailsInUse = new Set<string>([
  "wanjiku@maziwafresh.co.ke",
  "james.kariuki@example.com",
  "super@founderlink.co.ke",
]);

const applications: PlatformApplication[] = [];
const credentialsByUserId = new Map<string, PlatformCredential>();
const credentialsByEmail = new Map<string, PlatformCredential>();
const notifications: NotificationRecord[] = [];

let appSeq = 1;
let credSeq = 20481;

function nextRef(kind: ApplicationKind) {
  const n = String(appSeq++).padStart(4, "0");
  return kind === "founder" ? `FL-FND-APP-2026-${n}` : `FL-INV-APP-2026-${n}`;
}

function nextUserId(kind: ApplicationKind) {
  credSeq += 1;
  return kind === "founder" ? `FL-FND-${credSeq}` : `FL-INV-${credSeq}`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmailRegistered(email: string): boolean {
  return emailsInUse.has(normalizeEmail(email));
}

export function assertEmailAvailable(email: string): void {
  if (isEmailRegistered(email)) {
    throw { code: "EMAIL_IN_USE", message: "An account or application already exists for this email." };
  }
}

export function submitApplication(input: {
  kind: ApplicationKind;
  email: string;
  fullName: string;
  phone?: string;
  payload: Record<string, unknown>;
  documents?: StoredDocument[];
}): { referenceNumber: string; applicationId: string } {
  const email = normalizeEmail(input.email);
  const pending = applications.find(
    (a) => a.email === email && a.status === "pending" && a.kind === input.kind,
  );
  if (pending) {
    throw { code: "DUPLICATE_APPLICATION", message: "You already have a pending application for this email." };
  }
  if (isEmailRegistered(email)) {
    const cred = credentialsByEmail.get(email);
    if (cred) {
      throw { code: "EMAIL_IN_USE", message: "This email is already registered on the platform." };
    }
  }

  const id = `app-${input.kind}-${Date.now()}`;
  const referenceNumber = nextRef(input.kind);
  applications.push({
    id,
    kind: input.kind,
    referenceNumber,
    email,
    phone: input.phone,
    fullName: input.fullName,
    status: "pending",
    submittedAt: new Date().toISOString(),
    payload: input.payload,
    documents: input.documents ?? [],
  });
  emailsInUse.add(email);
  return { referenceNumber, applicationId: id };
}

export function listApplications(kind?: ApplicationKind): PlatformApplication[] {
  return kind ? applications.filter((a) => a.kind === kind) : [...applications];
}

export function getApplication(id: string): PlatformApplication | undefined {
  return applications.find((a) => a.id === id);
}

export function getApplicationByReference(
  email: string,
  referenceNumber: string,
): PlatformApplication | undefined {
  const e = normalizeEmail(email);
  return applications.find((a) => a.email === e && a.referenceNumber === referenceNumber);
}

export function checkApplicationStatus(email: string, referenceNumber: string) {
  const app = getApplicationByReference(email, referenceNumber);
  if (!app) {
    return { status: "not_found" as const };
  }
  return {
    status: app.status,
    reason: app.rejectionReason,
    kind: app.kind,
  };
}

function pushNotification(email: string, subject: string, body: string) {
  notifications.push({
    id: `ntf-${Date.now()}`,
    email,
    subject,
    body,
    createdAt: new Date().toISOString(),
  });
}

export function approveApplication(id: string): PlatformCredential {
  const app = applications.find((a) => a.id === id);
  if (!app) throw new Error("Application not found");
  app.status = "approved";
  const userId = nextUserId(app.kind);
  const tempPassword = "TempPass2026!";
  const cred: PlatformCredential = {
    userId,
    email: app.email,
    tempPassword,
    role: app.kind,
    fullName: app.fullName,
    mustChangePassword: true,
  };
  credentialsByUserId.set(userId.toLowerCase(), cred);
  credentialsByEmail.set(app.email, cred);
  pushNotification(
    app.email,
    "FounderLink — application approved",
    `Your ${app.kind} application was approved.\nUser ID: ${userId}\nTemporary password: ${tempPassword}\nSign in and set a new password on first login.`,
  );
  return cred;
}

export function rejectApplication(id: string, reason: string): void {
  const app = applications.find((a) => a.id === id);
  if (!app) throw new Error("Application not found");
  app.status = "rejected";
  app.rejectionReason = reason;
  pushNotification(
    app.email,
    "FounderLink — application update",
    `Your ${app.kind} application was not approved.\nReason: ${reason}`,
  );
}

export function resolveLogin(
  identifier: string,
  password: string,
): (PlatformCredential & { mustChangePassword: boolean }) | null {
  const id = identifier.trim().toLowerCase();
  const byUser = credentialsByUserId.get(id);
  const byEmail = credentialsByEmail.get(normalizeEmail(identifier));
  const cred = byUser ?? byEmail;
  if (!cred) return null;
  if (password === cred.tempPassword) {
    return { ...cred, mustChangePassword: true };
  }
  if (password.length >= 8 && password !== cred.tempPassword) {
    return { ...cred, mustChangePassword: false };
  }
  return null;
}

export function getNotificationsForTests() {
  return [...notifications];
}

export function resetStoreForTests() {
  applications.length = 0;
  notifications.length = 0;
  credentialsByUserId.clear();
  credentialsByEmail.clear();
  emailsInUse.clear();
  emailsInUse.add("wanjiku@maziwafresh.co.ke");
  emailsInUse.add("james.kariuki@example.com");
  emailsInUse.add("super@founderlink.co.ke");
  appSeq = 1;
  credSeq = 20481;
}

/** Seed demo applications for admin UI */
export function seedDemoApplications() {
  if (applications.length > 0) return;
  submitApplication({
    kind: "investor",
    email: "michael@capitalpartners.co.ke",
    fullName: "Michael Njenga",
    phone: "+254756789012",
    payload: {
      applicantType: "Angel investor",
      organization: "Capital Partners East Africa",
      ticketSizeKes: 5_000_000,
      county: "Nairobi",
      sourceOfFunds: "Business income",
    },
    documents: [
      { id: "d1", name: "National ID (front).pdf", mimeType: "application/pdf" },
      { id: "d2", name: "KRA PIN certificate.pdf", mimeType: "application/pdf" },
      { id: "d3", name: "Proof of funds.pdf", mimeType: "application/pdf" },
    ],
  });
  submitApplication({
    kind: "founder",
    email: "brian@nairobidelivery.co.ke",
    fullName: "Brian Mutua",
    phone: "+254723456789",
    payload: {
      businessName: "Nairobi Last-Mile Logistics",
      sector: "Logistics",
      county: "Nairobi",
      stage: "mvp",
      fundingTargetKes: 1_200_000,
    },
    documents: [
      { id: "f1", name: "BRS Certificate.pdf", mimeType: "application/pdf" },
      { id: "f2", name: "KRA PIN.pdf", mimeType: "application/pdf" },
    ],
  });
}
