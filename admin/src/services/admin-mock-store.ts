import type {
  AdminNavCounts,
  AdminSettingsState,
  AdminStats,
  ApprovalStatus,
  AuditEntry,
  ChamaDetail,
  ChamaListItem,
  ComplianceSourceRow,
  DealReviewDetail,
  DealReviewListItem,
  MemberDetail,
  MemberListItem,
  MemberRole,
  RecheckListItem,
  ReportedMemberRow,
  ReportedMessageRow,
  RiskLevel,
  VerificationDetail,
  VerificationQueueItem,
  VettingCheck,
  VettingDecisionRecord,
} from "@/types";

const ADMIN_SETTINGS: AdminSettingsState = {
  twoFactorEnabled: true,
  twoFactorSecret: "JBSWY3DPEHPK3PXP",
};

let auditLog: AuditEntry[] = [];

function pushAudit(action: string, targetMember: string, reason: string) {
  auditLog = [
    {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      action,
      targetMember,
      reason,
    },
    ...auditLog,
  ];
}

function riskSort(a: VerificationQueueItem, b: VerificationQueueItem): number {
  const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
  return order[a.riskLevel] - order[b.riskLevel];
}

interface StoredMember {
  list: MemberListItem;
  detail: MemberDetail;
  verification: VerificationDetail;
}

const members: StoredMember[] = [
  {
    list: {
      id: "u-amina",
      fullName: "Amina Wanjiru",
      email: "amina@healthlink.demo",
      role: "founder",
      organisationOrBusiness: "ClinicBook Health",
      memberStatus: "active",
      joinedAt: "2026-02-10T08:00:00.000Z",
      approvalStatus: "in_review",
    },
    detail: {
      id: "u-amina",
      fullName: "Amina Wanjiru",
      email: "amina@healthlink.demo",
      role: "founder",
      phone: "+254712000111",
      county: "Nairobi",
      organisationOrBusiness: "ClinicBook Health",
      memberStatus: "active",
      joinedAt: "2026-02-10T08:00:00.000Z",
      approvalStatus: "in_review",
      verificationSummary: "Phone and statement submitted; health-tech startup in Nairobi.",
      consents: [
        { purpose: "profile_visibility", label: "Profile visibility", granted: true, updatedAt: "2026-02-10T09:00:00.000Z" },
        { purpose: "ai_matching", label: "AI matching", granted: true, updatedAt: "2026-02-10T09:00:00.000Z" },
        { purpose: "contact", label: "SMS or WhatsApp contact", granted: true, updatedAt: "2026-02-10T09:00:00.000Z" },
      ],
      reportsAgainst: [],
      timeline: [
        { id: "tl-a1", title: "Joined FoundersLink", at: "2026-02-10T08:00:00.000Z" },
        { id: "tl-a2", title: "Submitted verification", at: "2026-02-12T14:30:00.000Z" },
      ],
    },
    verification: {
      id: "vet-u-amina",
      memberId: "u-amina",
      fullName: "Amina Wanjiru",
      email: "amina@healthlink.demo",
      role: "founder",
      phone: "+254712000111",
      statement:
        "We build ClinicBook — an app for booking clinic visits and follow-up reminders across Nairobi.",
      organisationName: "ClinicBook Health",
      website: "https://clinicbook.demo",
      references: [
        { name: "Dr. Njoki Muriuki", relationship: "Clinical adviser", phone: "+254722000444" },
      ],
      professionalRegister: null,
      registerNumber: null,
      riskLevel: "low",
      riskSignals: [
        {
          id: "rs-a1",
          text: "Business description matches health sector profile",
          explanation: "Statement aligns with onboarding sector and county.",
        },
      ],
      approvalStatus: "in_review",
      submittedAt: "2026-02-12T14:30:00.000Z",
      decisions: [],
      checks: [],
    },
  },
  {
    list: {
      id: "u-fake-inv",
      fullName: "Daniel Omondi",
      email: "daniel.omondi@kiberacapital.demo",
      role: "investor",
      organisationOrBusiness: "Kibera Capital Partners",
      memberStatus: "active",
      joinedAt: "2026-02-11T10:00:00.000Z",
      approvalStatus: "in_review",
    },
    detail: {
      id: "u-fake-inv",
      fullName: "Daniel Omondi",
      email: "daniel.omondi@kiberacapital.demo",
      role: "investor",
      phone: "+254799000888",
      county: "Nairobi",
      organisationOrBusiness: "Kibera Capital Partners",
      memberStatus: "active",
      joinedAt: "2026-02-11T10:00:00.000Z",
      approvalStatus: "in_review",
      verificationSummary: "Organisation and website submitted; flagged for upfront fee language.",
      consents: [
        { purpose: "profile_visibility", label: "Profile visibility", granted: true, updatedAt: "2026-02-11T11:00:00.000Z" },
        { purpose: "ai_matching", label: "AI matching", granted: false, updatedAt: null },
        { purpose: "contact", label: "SMS or WhatsApp contact", granted: false, updatedAt: null },
      ],
      reportsAgainst: [],
      timeline: [
        { id: "tl-f1", title: "Joined FoundersLink", at: "2026-02-11T10:00:00.000Z" },
        { id: "tl-f2", title: "Submitted verification", at: "2026-02-13T09:15:00.000Z" },
      ],
    },
    verification: {
      id: "vet-u-fake-inv",
      memberId: "u-fake-inv",
      fullName: "Daniel Omondi",
      email: "daniel.omondi@kiberacapital.demo",
      role: "investor",
      phone: "+254799000888",
      statement: "We fund early startups across Nairobi and offer fast-track capital.",
      organisationName: "Kibera Capital Partners",
      website: "https://kiberacapital.demo",
      references: [{ name: "James Otieno", relationship: "Associate", phone: "+254711000555" }],
      professionalRegister: null,
      registerNumber: null,
      riskLevel: "high",
      riskSignals: [
        {
          id: "rs-f1",
          text: "Mentions a processing fee before diligence",
          explanation: "Statement and public posts ask founders to pay a fee upfront — common scam pattern.",
        },
        {
          id: "rs-f2",
          text: "Organisation website lacks verifiable track record",
          explanation: "Site has no named partners or verified deals on FoundersLink.",
        },
      ],
      approvalStatus: "in_review",
      submittedAt: "2026-02-13T09:15:00.000Z",
      decisions: [],
      checks: [],
    },
  },
  {
    list: {
      id: "inv-savanna",
      fullName: "Savanna Angels",
      email: "team@savannaangels.demo",
      role: "investor",
      organisationOrBusiness: "Savanna Angels",
      memberStatus: "active",
      joinedAt: "2025-11-01T08:00:00.000Z",
      approvalStatus: "approved",
    },
    detail: {
      id: "inv-savanna",
      fullName: "Savanna Angels",
      email: "team@savannaangels.demo",
      role: "investor",
      phone: "+254700100200",
      county: "Nairobi",
      organisationOrBusiness: "Savanna Angels",
      memberStatus: "active",
      joinedAt: "2025-11-01T08:00:00.000Z",
      approvalStatus: "approved",
      verificationSummary: "Approved angel group; health and fintech mandate.",
      consents: [
        { purpose: "profile_visibility", label: "Profile visibility", granted: true, updatedAt: "2025-11-02T10:00:00.000Z" },
        { purpose: "ai_matching", label: "AI matching", granted: true, updatedAt: "2025-11-02T10:00:00.000Z" },
        { purpose: "contact", label: "SMS or WhatsApp contact", granted: true, updatedAt: "2025-11-02T10:00:00.000Z" },
      ],
      reportsAgainst: [],
      timeline: [
        { id: "tl-s1", title: "Verification approved", at: "2025-11-05T12:00:00.000Z", description: "Organisation and website confirmed." },
        { id: "tl-s2", title: "Opened deal with ClinicBook", at: "2026-02-14T16:00:00.000Z" },
      ],
    },
    verification: {
      id: "vet-inv-savanna",
      memberId: "inv-savanna",
      fullName: "Savanna Angels",
      email: "team@savannaangels.demo",
      role: "investor",
      phone: "+254700100200",
      statement: "Angel syndicate backing health, fintech and climate startups at MVP to early revenue.",
      organisationName: "Savanna Angels",
      website: "https://savannaangels.demo",
      references: [{ name: "Wanjiku Kamau", relationship: "Lead partner", phone: "+254722100300" }],
      professionalRegister: null,
      registerNumber: null,
      riskLevel: "low",
      riskSignals: [],
      approvalStatus: "approved",
      submittedAt: "2025-11-02T09:00:00.000Z",
      decisions: [
        {
          id: "dec-s1",
          decision: "approved",
          reason: "Organisation website and references checked; fits investor verification requirements.",
          decidedAt: "2025-11-05T12:00:00.000Z",
          checks: [
            {
              id: "chk-s1",
              checkType: "Organisation website",
              result: "passed",
              method: "manual",
              recordedAt: "2025-11-05T11:50:00.000Z",
            },
          ],
        },
      ],
      checks: [
        {
          id: "chk-s1",
          checkType: "Organisation website",
          result: "passed",
          method: "manual",
          recordedAt: "2025-11-05T11:50:00.000Z",
        },
      ],
    },
  },
  {
    list: {
      id: "u-expert",
      fullName: "Faith Akinyi",
      email: "faith.akinyi@legal.demo",
      role: "expert",
      organisationOrBusiness: "Akinyi & Associates Advocates",
      memberStatus: "active",
      joinedAt: "2025-12-15T08:00:00.000Z",
      approvalStatus: "approved",
    },
    detail: {
      id: "u-expert",
      fullName: "Faith Akinyi",
      email: "faith.akinyi@legal.demo",
      role: "expert",
      phone: "+254733200400",
      county: "Nairobi",
      organisationOrBusiness: "Akinyi & Associates Advocates",
      memberStatus: "active",
      joinedAt: "2025-12-15T08:00:00.000Z",
      approvalStatus: "approved",
      verificationSummary: "LSK register confirmed.",
      consents: [
        { purpose: "profile_visibility", label: "Profile visibility", granted: true, updatedAt: "2025-12-16T09:00:00.000Z" },
        { purpose: "ai_matching", label: "AI matching", granted: false, updatedAt: null },
        { purpose: "contact", label: "SMS or WhatsApp contact", granted: true, updatedAt: "2025-12-16T09:00:00.000Z" },
      ],
      reportsAgainst: [],
      timeline: [{ id: "tl-e1", title: "Verification approved", at: "2025-12-18T10:00:00.000Z" }],
    },
    verification: {
      id: "vet-u-expert",
      memberId: "u-expert",
      fullName: "Faith Akinyi",
      email: "faith.akinyi@legal.demo",
      role: "expert",
      phone: "+254733200400",
      statement: "Corporate and startup legal counsel; monthly office hours on FoundersLink.",
      organisationName: "Akinyi & Associates Advocates",
      website: "https://akinyilegal.demo",
      references: [],
      professionalRegister: "Law Society of Kenya (LSK)",
      registerNumber: "LSK-P-88421",
      riskLevel: "low",
      riskSignals: [],
      approvalStatus: "approved",
      submittedAt: "2025-12-16T08:00:00.000Z",
      decisions: [
        {
          id: "dec-e1",
          decision: "approved",
          reason: "LSK register number verified manually.",
          decidedAt: "2025-12-18T10:00:00.000Z",
        },
      ],
      checks: [
        {
          id: "chk-e1",
          checkType: "Professional register",
          result: "passed",
          method: "provider",
          recordedAt: "2025-12-18T09:55:00.000Z",
        },
      ],
    },
  },
  {
    list: {
      id: "u-info",
      fullName: "Peter Kamau",
      email: "needsinfo@founder.demo",
      role: "founder",
      organisationOrBusiness: "PesaLink Solutions",
      memberStatus: "active",
      joinedAt: "2026-01-20T08:00:00.000Z",
      approvalStatus: "needs_info",
    },
    detail: {
      id: "u-info",
      fullName: "Peter Kamau",
      email: "needsinfo@founder.demo",
      role: "founder",
      phone: "+254711000333",
      county: "Nairobi",
      organisationOrBusiness: "PesaLink Solutions",
      memberStatus: "active",
      joinedAt: "2026-01-20T08:00:00.000Z",
      approvalStatus: "needs_info",
      verificationSummary: "Awaiting updated registration details.",
      consents: [
        { purpose: "profile_visibility", label: "Profile visibility", granted: true, updatedAt: "2026-01-21T09:00:00.000Z" },
        { purpose: "ai_matching", label: "AI matching", granted: false, updatedAt: null },
        { purpose: "contact", label: "SMS or WhatsApp contact", granted: true, updatedAt: "2026-01-21T09:00:00.000Z" },
      ],
      reportsAgainst: [],
      timeline: [
        { id: "tl-p1", title: "Needs more info requested", at: "2026-01-25T11:00:00.000Z", description: "Clarify business registration status." },
      ],
    },
    verification: {
      id: "vet-u-info",
      memberId: "u-info",
      fullName: "Peter Kamau",
      email: "needsinfo@founder.demo",
      role: "founder",
      phone: "+254711000333",
      statement: "Payments API for chamas and savings groups.",
      organisationName: "PesaLink Solutions",
      website: null,
      references: [],
      professionalRegister: null,
      registerNumber: null,
      riskLevel: "medium",
      riskSignals: [
        {
          id: "rs-p1",
          text: "Registration status unclear",
          explanation: "Statement does not match business status selected at onboarding.",
        },
      ],
      approvalStatus: "needs_info",
      submittedAt: "2026-01-22T10:00:00.000Z",
      decisions: [
        {
          id: "dec-p1",
          decision: "needs_info",
          reason: "Please clarify your business registration status and resubmit.",
          decidedAt: "2026-01-25T11:00:00.000Z",
        },
      ],
      checks: [],
    },
  },
];

const dealReviews: DealReviewDetail[] = [
  {
    id: "deal-1",
    title: "ClinicBook — seed with Savanna Angels",
    dealType: "investment",
    stage: "due_diligence",
    terms: {
      amountKes: 1_000_000,
      instrument: "equity",
      equityPercent: 12,
      notes: "Board observer seat for Savanna Angels.",
    },
    partySummaries: [
      { memberId: "u-amina", name: "Amina Wanjiru", role: "founder", verifiedCount: 1, selfReportedCount: 2, missingCount: 1 },
      { memberId: "inv-savanna", name: "Savanna Angels", role: "investor", verifiedCount: 2, selfReportedCount: 1, missingCount: 0 },
    ],
    documents: [
      {
        id: "doc-a1",
        partyMemberId: "u-amina",
        partyName: "Amina Wanjiru",
        fileName: "clinicbook-registration.pdf",
        mimeType: "application/pdf",
        previewUrl: "/demo/clinicbook-registration.pdf",
        aiPrechecked: true,
        precheckFlags: [
          { label: "Business name", passed: true, detail: "Matches founder profile ClinicBook Health." },
          { label: "Registration date", passed: true, detail: "Within expected range for year started." },
          { label: "Signatory name", passed: false, detail: "Signatory not listed on submitted statement — review manually." },
        ],
        adminStatus: "uploaded",
        rejectionReason: null,
      },
      {
        id: "doc-a2",
        partyMemberId: "u-amina",
        partyName: "Amina Wanjiru",
        fileName: "clinicbook-pitch-deck.png",
        mimeType: "image/png",
        previewUrl: "https://placehold.co/600x800/EFF6FF/1D4ED8?text=Pitch+deck",
        aiPrechecked: true,
        precheckFlags: [
          { label: "Sector alignment", passed: true, detail: "Health-tech focus consistent with profile." },
        ],
        adminStatus: "uploaded",
        rejectionReason: null,
      },
      {
        id: "doc-s1",
        partyMemberId: "inv-savanna",
        partyName: "Savanna Angels",
        fileName: "savanna-mandate-letter.pdf",
        mimeType: "application/pdf",
        previewUrl: "/demo/savanna-mandate.pdf",
        aiPrechecked: true,
        precheckFlags: [
          { label: "Organisation name", passed: true, detail: "Matches verified investor profile." },
        ],
        adminStatus: "confirmed",
        rejectionReason: null,
      },
    ],
  },
];

const reportedMessages: ReportedMessageRow[] = [
  {
    id: "rep-msg-1",
    reporterName: "Amina Wanjiru",
    reportedMemberName: "Unknown member",
    reason: "Asked for money outside a deal",
    reportedAt: "2026-02-15T11:20:00.000Z",
    messageText: "Tuma processing fee kwanza via M-Pesa.",
    aiWarning: true,
    status: "open",
  },
];

const reportedMembers: ReportedMemberRow[] = [
  {
    id: "rep-mem-1",
    reporterName: "Grace Mwangi",
    reportedMemberName: "Daniel Omondi",
    reportedMemberId: "u-fake-inv",
    reason: "Suspicious investment offer",
    reportedAt: "2026-02-14T09:00:00.000Z",
    aiWarning: true,
    status: "open",
  },
];

const rechecks: RecheckListItem[] = [
  {
    id: "rc-1",
    memberId: "inv-savanna",
    fullName: "Savanna Angels",
    role: "investor",
    lastCheckedAt: "2025-11-05T12:00:00.000Z",
    dueReason: "Annual investor re-check policy (12 months since approval).",
  },
];

const complianceSources: ComplianceSourceRow[] = [
  {
    id: "cs-kra",
    name: "KRA iTax guidance",
    covers: "PIN registration and filing obligations for startups",
    lastUpdatedAt: "2025-09-01T00:00:00.000Z",
    status: "current",
    lastReviewedAt: "2026-01-10T00:00:00.000Z",
    reviewNote: "Checked against Ask Compliance citations.",
  },
  {
    id: "cs-brs",
    name: "Business Registration Service (BRS)",
    covers: "Company and business name registration steps",
    lastUpdatedAt: "2025-06-15T00:00:00.000Z",
    status: "out_of_date",
    lastReviewedAt: "2025-07-01T00:00:00.000Z",
    reviewNote: "Portal copy changed — needs refresh.",
  },
];

const chamas: ChamaDetail[] = [
  {
    id: "chama-1",
    name: "Nairobi Health Founders Chama",
    type: "money",
    organiserName: "Amina Wanjiru",
    createdAt: "2025-06-01T08:00:00.000Z",
    members: [
      { memberId: "u-amina", name: "Amina Wanjiru", role: "organiser" },
      { memberId: "u-grace", name: "Grace Mwangi", role: "treasurer" },
      { memberId: "u-brian", name: "Brian Otieno", role: "member" },
    ],
    contributionCount: 14,
    goalCount: 2,
  },
];

function syncMemberFromVerification(v: VerificationDetail) {
  const stored = members.find((m) => m.verification.id === v.id || m.list.id === v.memberId);
  if (!stored) return;
  stored.verification = v;
  stored.list.approvalStatus = v.approvalStatus;
  stored.detail.approvalStatus = v.approvalStatus;
}

export function getAdminSettings(): AdminSettingsState {
  return { ...ADMIN_SETTINGS };
}

export function setTwoFactorEnabled(enabled: boolean) {
  ADMIN_SETTINGS.twoFactorEnabled = enabled;
}

export function getNavCounts(): AdminNavCounts {
  const waiting = members.filter((m) =>
    ["submitted", "in_review"].includes(m.list.approvalStatus),
  ).length;
  const deals = dealReviews.filter((d) => d.stage === "due_diligence").length;
  const openReports =
    reportedMessages.filter((r) => r.status === "open").length +
    reportedMembers.filter((r) => r.status === "open").length;
  return {
    verificationWaiting: waiting,
    dealReviews: deals,
    openReports,
    rechecksDue: rechecks.length,
  };
}

export function getAdminStats(): AdminStats {
  const foundersCount = members.filter((m) => m.list.role === "founder").length;
  const investorsCount = members.filter((m) => m.list.role === "investor").length;
  const expertsCount = members.filter((m) => m.list.role === "expert").length;
  const statusMap = new Map<ApprovalStatus, number>();
  for (const m of members) {
    statusMap.set(m.list.approvalStatus, (statusMap.get(m.list.approvalStatus) ?? 0) + 1);
  }
  const dealsByStage = [{ stage: "due_diligence" as const, count: dealReviews.length }];
  return {
    foundersCount,
    investorsCount,
    expertsCount,
    membersByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    verificationsWaiting: getNavCounts().verificationWaiting,
    rechecksDue: rechecks.length,
    openReports: getNavCounts().openReports,
    dealsByStage,
    chamasCount: chamas.length,
    registrationsByMonth: [
      { month: "2025-09", count: 2 },
      { month: "2025-10", count: 4 },
      { month: "2025-11", count: 6 },
      { month: "2025-12", count: 5 },
      { month: "2026-01", count: 8 },
      { month: "2026-02", count: 11 },
    ],
  };
}

export function listVerificationQueue(tab: string): VerificationQueueItem[] {
  const tabMap: Record<string, ApprovalStatus[]> = {
    waiting: ["submitted", "in_review"],
    needs_info: ["needs_info"],
    approved: ["approved"],
    rejected: ["rejected"],
    suspended: ["suspended"],
  };
  const statuses = tabMap[tab] ?? tabMap.waiting;
  return members
    .filter((m) => statuses.includes(m.list.approvalStatus))
    .map((m) => ({
      id: m.verification.id,
      memberId: m.list.id,
      fullName: m.list.fullName,
      email: m.list.email,
      role: m.list.role,
      riskLevel: m.verification.riskLevel,
      topRiskSignal: m.verification.riskSignals[0]?.text ?? null,
      submittedAt: m.verification.submittedAt,
      approvalStatus: m.list.approvalStatus,
    }))
    .sort(riskSort);
}

export function getVerificationDetail(id: string): VerificationDetail | null {
  const m = members.find((x) => x.verification.id === id);
  return m ? { ...m.verification } : null;
}

export function submitVerificationDecision(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: Omit<VettingCheck, "id" | "recordedAt">[],
) {
  const m = members.find((x) => x.verification.id === id);
  if (!m) return null;
  const statusMap = { approved: "approved", rejected: "rejected", needs_info: "needs_info" } as const;
  const now = new Date().toISOString();
  const newChecks: VettingCheck[] = checks.map((c, i) => ({
    ...c,
    id: `chk-${Date.now()}-${i}`,
    recordedAt: now,
  }));
  const record: VettingDecisionRecord = {
    id: `dec-${Date.now()}`,
    decision,
    reason,
    decidedAt: now,
    checks: newChecks,
  };
  m.verification.approvalStatus = statusMap[decision];
  m.verification.decisions = [record, ...m.verification.decisions];
  m.verification.checks = [...newChecks, ...m.verification.checks];
  syncMemberFromVerification(m.verification);
  const action =
    decision === "approved"
      ? "Verification approved"
      : decision === "rejected"
        ? "Verification rejected"
        : "Verification needs more info";
  pushAudit(action, m.list.fullName, reason);
  return { ...m.verification };
}

export function listMembers(role: MemberRole): MemberListItem[] {
  return members.filter((m) => m.list.role === role).map((m) => ({ ...m.list }));
}

export function getMemberDetail(id: string): MemberDetail | null {
  const m = members.find((x) => x.list.id === id);
  return m ? { ...m.detail } : null;
}

export function suspendMember(id: string, reason: string) {
  const m = members.find((x) => x.list.id === id);
  if (!m) return null;
  m.list.memberStatus = "suspended";
  m.detail.memberStatus = "suspended";
  m.list.approvalStatus = "suspended";
  m.detail.approvalStatus = "suspended";
  m.verification.approvalStatus = "suspended";
  m.detail.timeline = [
    { id: `tl-${Date.now()}`, title: "Member suspended", description: reason, at: new Date().toISOString() },
    ...m.detail.timeline,
  ];
  pushAudit("Member suspended", m.list.fullName, reason);
  return { ...m.detail };
}

export function reinstateMember(id: string, reason: string) {
  const m = members.find((x) => x.list.id === id);
  if (!m) return null;
  m.list.memberStatus = "active";
  m.detail.memberStatus = "active";
  m.list.approvalStatus = "approved";
  m.detail.approvalStatus = "approved";
  m.verification.approvalStatus = "approved";
  m.detail.timeline = [
    { id: `tl-${Date.now()}`, title: "Member reinstated", description: reason, at: new Date().toISOString() },
    ...m.detail.timeline,
  ];
  pushAudit("Member reinstated", m.list.fullName, reason);
  return { ...m.detail };
}

export function listDealReviews(): DealReviewListItem[] {
  return dealReviews.map((d) => ({
    id: d.id,
    title: d.title,
    dealType: d.dealType,
    stage: d.stage,
    parties: d.partySummaries.map((p) => p.name),
    documentsWaiting: d.documents.filter((doc) => doc.adminStatus === "uploaded").length,
  }));
}

export function getDealReview(id: string): DealReviewDetail | null {
  const d = dealReviews.find((x) => x.id === id);
  return d ? { ...d, documents: d.documents.map((doc) => ({ ...doc })) } : null;
}

export function confirmDealDocument(dealId: string, documentId: string) {
  const deal = dealReviews.find((d) => d.id === dealId);
  if (!deal) return null;
  const doc = deal.documents.find((d) => d.id === documentId);
  if (!doc) return null;
  doc.adminStatus = "confirmed";
  pushAudit("Document confirmed", doc.partyName, `Confirmed ${doc.fileName} on deal ${deal.title}`);
  return doc;
}

export function rejectDealDocument(dealId: string, documentId: string, reason: string) {
  const deal = dealReviews.find((d) => d.id === dealId);
  if (!deal) return null;
  const doc = deal.documents.find((d) => d.id === documentId);
  if (!doc) return null;
  doc.adminStatus = "rejected";
  doc.rejectionReason = reason;
  pushAudit("Document rejected", doc.partyName, reason);
  return doc;
}

export function getReports() {
  return {
    messages: reportedMessages.map((r) => ({ ...r })),
    members: reportedMembers.map((r) => ({ ...r })),
  };
}

export function handleReportMessage(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  const row = reportedMessages.find((r) => r.id === id);
  if (!row) return null;
  row.status = "handled";
  const label =
    action === "dismiss" ? "Report dismissed" : action === "warn" ? "Member warned" : "Member suspended";
  if (action === "suspend") {
    const m = members.find((x) => x.list.fullName === row.reportedMemberName);
    if (m) suspendMember(m.list.id, reason);
  }
  pushAudit(label, row.reportedMemberName, reason);
  return row;
}

export function handleReportMember(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  const row = reportedMembers.find((r) => r.id === id);
  if (!row) return null;
  row.status = "handled";
  const label =
    action === "dismiss" ? "Report dismissed" : action === "warn" ? "Member warned" : "Member suspended";
  if (action === "suspend") suspendMember(row.reportedMemberId, reason);
  pushAudit(label, row.reportedMemberName, reason);
  return row;
}

export function listRechecks(): RecheckListItem[] {
  return rechecks.map((r) => ({ ...r }));
}

export function listComplianceSources(): ComplianceSourceRow[] {
  return complianceSources.map((s) => ({ ...s }));
}

export function markComplianceReviewed(id: string, note: string) {
  const row = complianceSources.find((s) => s.id === id);
  if (!row) return null;
  const now = new Date().toISOString();
  row.lastReviewedAt = now;
  row.reviewNote = note;
  row.status = "current";
  pushAudit("Compliance source reviewed", row.name, note);
  return row;
}

export function listChamas(): ChamaListItem[] {
  return chamas.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    memberCount: c.members.length,
    organiserName: c.organiserName,
    createdAt: c.createdAt,
  }));
}

export function getChama(id: string): ChamaDetail | null {
  const c = chamas.find((x) => x.id === id);
  return c ? { ...c, members: [...c.members] } : null;
}

export function listAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export function addRecheckAudit(memberName: string, reason: string) {
  pushAudit("Re-check recorded", memberName, reason);
}
