// What members see of each other: an investor's matching founders, and
// profile pages. Founders reach investors through the funder record the
// investor maintains, so matching always runs on records.

import { explainFit, matchFunders } from "../../ai/client.js";
import { prisma } from "../../shared/db.js";
import { consented, hasConsent } from "../account/consents.js";
import { completedItemIds } from "../compliance/status.js";
import { conflict, notFound } from "../../shared/errors.js";
import { listComplianceItems, toMatchFunder, toMatchProfile } from "../funding/funding.service.js";
import { assessReadiness } from "../funding/readiness.js";
import { connectionBetween, contactOf } from "./connections.js";
import { publicPortfolio, publicVentures } from "./track-record.js";

// The record an investor's matches are run on: the one she maintains,
// or, before approval, the one she has asked to take over.
async function mandateOf(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { approval_status: true, funder: true, vetting_application: { select: { claims_funder_id: true } } },
  });
  const claimId = user.vetting_application?.claims_funder_id;
  const funder = user.funder ?? (claimId ? await prisma.funder.findUnique({ where: { id: claimId } }) : null);
  return { approved: user.approval_status === "approved", funder };
}

// Founders that fit an investor's record. An investor who is not
// approved yet gets the number only, never the people.
export async function getInvestorMatches(userId: string) {
  const { approved, funder } = await mandateOf(userId);
  if (!funder) throw conflict("FUNDER_REQUIRED", "Describe what you fund to see matching businesses");

  const [approvedFounders, itemRows] = await Promise.all([
    // Matching only ever returns approved members.
    prisma.founderProfile.findMany({
      where: { user: { approval_status: "approved", role: "founder" } },
      include: { user: { select: { id: true, full_name: true } } },
    }),
    listComplianceItems(),
  ]);
  // And only founders who have agreed to be seen by other members.
  const founderIds = approvedFounders.map((p) => p.user_id);
  const visible = await consented(founderIds, "profile_visibility");
  const allowAi = await consented(founderIds, "ai_matching");
  const founders = approvedFounders.filter((p) => visible.has(p.user_id));
  const items = new Map(itemRows.map((i) => [i.id, i]));
  const completed = await completedItemIds(founders.map((p) => p.user_id));
  const candidate = toMatchFunder(funder);

  const assessed = await Promise.all(
    founders.map(async (profile) => {
      const { results } = await matchFunders(toMatchProfile(profile), [candidate], allowAi.has(profile.user_id));
      const match = results[0]!;
      const already_have = completed.get(profile.user_id)!;
      return { profile, match, readiness: assessReadiness({ ...profile, already_have }, funder, items, match) };
    }),
  );

  const fitting = assessed
    .filter((a) => a.readiness.group !== "not_for_you")
    .sort((a, b) => a.readiness.gaps.length - b.readiness.gaps.length || b.match.score - a.match.score);

  const count = fitting.length;
  const summary = `${count} ${count === 1 ? "business matches" : "businesses match"} your fund`;

  if (!approved) {
    return { approved: false, count, founders: [], message: `${summary}. Get approved to see them.` };
  }

  return {
    approved: true,
    count,
    message: `${summary}.`,
    founders: fitting.map(({ profile, match, readiness }) => ({
      user_id: profile.user.id,
      full_name: profile.user.full_name,
      business_name: profile.business_name,
      journey_type: profile.journey_type,
      sector: profile.sector,
      stage: profile.stage,
      county: profile.county,
      description: profile.description,
      funding_amount_kes: profile.funding_amount_kes,
      use_of_funds: profile.use_of_funds,
      band: match.band,
      signals: match.reasons.map((r) => ({ signal: r.signal, fits: r.fits })),
      // Whether she already meets everything this funder requires.
      ready: readiness.gaps.length === 0,
    })),
  };
}

// A member's profile page, as another approved member sees it. Contact
// details are never included.
export async function getProfile(viewerId: string, targetId: string) {
  const [viewer, target] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: viewerId }, select: { role: true, preferred_language: true, founder_profile: true } }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        full_name: true,
        role: true,
        approval_status: true,
        email: true,
        phone: true,
        phone_verified_at: true,
        share_contact: true,
        founder_profile: true,
        investor_profile: true,
        expert_profile: true,
        funder: true,
        portfolio: { orderBy: { year: "desc" } },
        ventures: { orderBy: { created_at: "desc" } },
      },
    }),
  ]);
  // Someone who is not approved does not exist as far as other members can tell.
  if (!target || target.approval_status !== "approved" || target.role === "admin") {
    throw notFound("No such member");
  }
  // The same answer for someone who has not agreed to be seen, so the
  // response does not reveal that she is here.
  if (!(await hasConsent(targetId, "profile_visibility"))) throw notFound("No such member");

  const connection = await connectionBetween(viewerId, targetId);
  const base = {
    id: target.id,
    full_name: target.full_name,
    role: target.role,
    badges: ["Checked by FounderLink"],
    // none | pending | accepted | declined: drives the Connect button.
    connection: connection ? { id: connection.id, status: connection.status } : { id: null, status: "none" },
    // Email and phone, only once both have accepted the connection.
    contact: contactOf(target, connection?.status === "accepted"),
  };

  if (target.role === "investor") {
    const funder = target.funder;
    // The fit is explained only to a founder, and only if the investor has said what she funds.
    const fit =
      viewer.role === "founder" && viewer.founder_profile && funder
        ? await explainFit(
            toMatchProfile(viewer.founder_profile),
            toMatchFunder(funder),
            target.portfolio
              .filter((e) => e.visibility === "public")
              .map((e) => ({ sector: e.sector, stage: e.stage, source: e.source })),
            viewer.preferred_language,
            await hasConsent(viewerId, "ai_matching"),
          )
        : null;

    return {
      ...base,
      investor: {
        organisation_name: target.investor_profile?.organisation_name ?? null,
        job_title: target.investor_profile?.job_title ?? null,
        organisation_website: target.investor_profile?.organisation_website ?? null,
        bio: target.investor_profile?.bio ?? null,
      },
      funder: funder && {
        id: funder.id,
        name: funder.name,
        kind: funder.kind,
        mandate_text: funder.mandate_text,
        journey_types: funder.journey_types,
        sectors: funder.sectors,
        stages: funder.stages,
        counties: funder.counties,
        instruments: funder.instruments,
        ticket_min_kes: funder.ticket_min_kes,
        ticket_max_kes: funder.ticket_max_kes,
      },
      fit,
      track_record: publicPortfolio(target.portfolio),
    };
  }

  if (target.role === "founder") {
    const p = target.founder_profile;
    return {
      ...base,
      founder: p && {
        business_name: p.business_name,
        journey_type: p.journey_type,
        sector: p.sector,
        stage: p.stage,
        county: p.county,
        description: p.description,
        funding_amount_kes: p.funding_amount_kes,
        use_of_funds: p.use_of_funds,
        year_started: p.year_started,
        website: p.website,
        social_links: p.social_links,
      },
      track_record: publicVentures(target.ventures),
    };
  }

  const e = target.expert_profile;
  return {
    ...base,
    expert: e && {
      profession: e.profession,
      organisation_name: e.organisation_name,
      register_body: e.register_body,
      bio: e.bio,
      sectors: e.sectors,
      counties: e.counties,
      services: e.services,
      office_hours_per_month: e.office_hours_per_month,
    },
  };
}
