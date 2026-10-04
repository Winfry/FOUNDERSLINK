// Loads the people the demo story needs (docs/PRODUCT.md, section 11).
//
//   npm run db:seed                      the funders and compliance items, first
//   npm run db:demo -- <password>        every demo account gets this password
//
// It can be run again: the demo accounts are removed and made afresh, so
// the story always starts from the same place. Every account is under
// @founderlink.example, an address nobody owns, so no email reaches a
// real person.
//
//   admin@     an admin, to review the queue
//   grace@     an approved investor who maintains Savanna Angels Network,
//              with a track record that includes a deal closed here
//   wanjiru@   the approved founder on the other side of that deal
//   amina@     the founder in the story, waiting in the queue. The story
//              has her join live; this is the same person, ready-made
//   brian@     an investor application the risk check flags, to reject

import bcrypt from "bcrypt";
import { submitApplication } from "../src/modules/vetting/vetting.service.js";
import { prisma } from "../src/shared/db.js";

const [password] = process.argv.slice(2);
if (!password || password.length < 8) {
  console.error("Usage: npm run db:demo -- <password of 8+ characters>");
  process.exit(1);
}

const address = (name: string) => `${name}@founderlink.example`;
const NAMES = ["admin", "grace", "wanjiru", "amina", "brian"];
const SAVANNA = "Savanna Angels Network (demo)";

const savanna = await prisma.funder.findUnique({ where: { name: SAVANNA } });
if (!savanna) {
  console.error(`"${SAVANNA}" is not loaded. Run npm run db:seed first.`);
  process.exit(1);
}

// Start again. A deal is not removed with its parties, so it goes first.
const old = await prisma.user.findMany({ where: { email: { in: NAMES.map(address) } }, select: { id: true } });
await prisma.deal.deleteMany({ where: { created_by: { in: old.map((u) => u.id) } } });
await prisma.user.deleteMany({ where: { id: { in: old.map((u) => u.id) } } });

const password_hash = await bcrypt.hash(password, 10);
const now = new Date();
const agreed = (...purposes: string[]) => ({
  create: purposes.map((purpose) => ({ purpose, granted: true, granted_at: now })),
});

const admin = await prisma.user.create({
  data: { email: address("admin"), full_name: "Demo Admin", role: "admin", approval_status: "approved", password_hash, email_verified_at: now },
});

// --- Grace, the investor behind Savanna Angels ---

const grace = await prisma.user.create({
  data: {
    email: address("grace"),
    full_name: "Grace Otieno",
    role: "investor",
    approval_status: "approved",
    password_hash,
    email_verified_at: now,
    phone: "+254700000101",
    phone_verified_at: now,
    consents: agreed("profile_visibility", "ai_matching", "contact"),
    investor_profile: {
      create: {
        organisation_name: "Savanna Angels Network",
        job_title: "Managing Partner",
        bio: "A network of Kenyan angels backing early health and fintech startups, from MVP to first revenue.",
      },
    },
    vetting_application: {
      create: {
        phone: "+254700000101",
        organisation_name: "Savanna Angels Network",
        statement: "I lead Savanna Angels Network. We invest KSh 500,000 to 5 million in early Kenyan startups.",
        claims_funder_id: savanna.id,
        risk_level: "low",
        submitted_at: now,
        decided_at: now,
        decided_by: admin.id,
        decision_reason: "Demo account",
      },
    },
    portfolio: {
      create: {
        company_name: "TibaPay",
        sector: "health",
        stage: "mvp",
        year: 2025,
        instrument: "equity",
        amount_range: "KSh 1M to 2M",
        source: "self_reported",
        company_consented: true,
      },
    },
  },
});
await prisma.funder.update({ where: { id: savanna.id }, data: { claimed_by_user_id: grace.id } });

// --- Wanjiru, and the deal she closed with Grace ---

const wanjiru = await prisma.user.create({
  data: {
    email: address("wanjiru"),
    full_name: "Wanjiru Kamau",
    role: "founder",
    approval_status: "approved",
    password_hash,
    email_verified_at: now,
    phone: "+254700000102",
    phone_verified_at: now,
    consents: agreed("profile_visibility", "ai_matching"),
    founder_profile: {
      create: {
        journey_type: "startup",
        business_status: "limited_company",
        business_name: "Daktari Mkononi",
        description: "Video consultations with licensed doctors for families outside the big towns.",
        sector: "health",
        county: "Kiambu",
        stage: "mvp",
        instruments: ["equity"],
        funding_amount_kes: 2_000_000,
        use_of_funds: "Hire two more doctors and launch in Nakuru",
      },
    },
  },
});

const closed = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const deal = await prisma.deal.create({
  data: {
    type: "investment",
    title: "Savanna Angels invests in Daktari Mkononi",
    stage: "closed",
    terms: { amount_kes: 2_000_000, instrument: "equity", equity_percent: 8 },
    source_funder_id: savanna.id,
    created_by: grace.id,
    created_at: new Date(closed.getTime() - 45 * 24 * 60 * 60 * 1000),
    closed_at: closed,
    parties: {
      create: [
        { user_id: grace.id, role: "investor", confirmed_stage: "closed", shares_track_record: true },
        { user_id: wanjiru.id, role: "founder", confirmed_stage: "closed", shares_track_record: true },
      ],
    },
    events: {
      create: [
        { actor_id: grace.id, event: "opened", to_stage: "exploring", announced: true },
        { actor_id: wanjiru.id, event: "stage_changed", from_stage: "documents_compliance", to_stage: "closed", announced: true, created_at: closed },
      ],
    },
  },
});
// What closing a deal here leaves on the investor's track record, shown
// because both parties agreed to share it.
await prisma.portfolioEntry.create({
  data: {
    investor_id: grace.id,
    deal_id: deal.id,
    company_name: "Daktari Mkononi",
    sector: "health",
    stage: "mvp",
    year: closed.getFullYear(),
    instrument: "equity",
    source: "platform_deal",
    visibility: "public",
    company_consented: true,
  },
});

// --- Amina, waiting to be approved ---

const amina = await prisma.user.create({
  data: {
    email: address("amina"),
    full_name: "Amina Njeri",
    role: "founder",
    password_hash,
    email_verified_at: now,
    consents: agreed("profile_visibility", "ai_matching"),
    founder_profile: {
      create: {
        journey_type: "startup",
        business_status: "limited_company",
        business_name: "Afya Booking",
        description: "Tunatengeneza app ya kubook clinic visits. Patients book and pay for a clinic visit from their phone, and clinics see their day in one place.",
        sector: "health",
        county: "Nairobi",
        stage: "mvp",
        instruments: ["equity"],
        funding_amount_kes: 1_000_000,
        use_of_funds: "Sign up 20 more clinics in Nairobi",
        has_employees: false,
      },
    },
    vetting_application: {
      create: {
        phone: "+254700000103",
        statement: "I am the founder of Afya Booking. We have 6 clinics in Nairobi using the app and are raising our first round.",
      },
    },
  },
});
// She has registered the business, and has no KRA PIN for it yet: that
// is the gap the story shows on one of her matches.
await prisma.complianceStatus.create({
  data: { entity_type: "business", entity_id: amina.id, item_id: "brs_registration", status: "complete", updated_by: amina.id },
});

// --- Brian, the application to reject ---

const brian = await prisma.user.create({
  data: {
    email: address("brian"),
    full_name: "Brian Mwangi",
    role: "investor",
    password_hash,
    email_verified_at: now,
    investor_profile: {
      create: {
        organisation_name: "Global Capital Partners",
        bio: "Guaranteed returns for every founder. Send the processing fee by M-Pesa today and funds are released within 24 hours.",
      },
    },
    vetting_application: {
      create: {
        phone: "+254700000104",
        organisation_name: "Global Capital Partners",
        statement: "We fund any business, guaranteed approval. A small processing fee is paid upfront by M-Pesa before funds are released.",
      },
    },
  },
});

// Both go through the same submit as a real applicant, so the risk level
// in the queue is whatever the risk check really says about them.
for (const applicant of [amina, brian]) {
  const { application } = await submitApplication(applicant.id);
  console.log(`${applicant.email}: submitted, risk ${application.risk_level}`, application.risk_signals);
}

console.log(`Demo accounts loaded: ${NAMES.map(address).join(", ")}`);
await prisma.$disconnect();
