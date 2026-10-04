# FoundersLink: final verification

**Run on 4 October 2026, 07:45 to 08:25, against commit `b9e721b`.**

Six testers went through the product. Five used the real screens as a person with a goal (a new founder, a new investor, a founder and investor doing a deal, three founders running a chama, a new staff member). One compared every claim in the team's documents with the code. None of them changed any code. Each created its own accounts, and all of that test data has since been removed.

**What this is and is not.** Everything was run in a browser at phone width (390 x 844) on one laptop. Nothing was run on a physical phone. The AI service running on that laptop was the older build, so every AI feature that arrived in Winfry's push this morning was tested as "falls back to the backend's rules". Items marked "not tried" at the end were not tried.

Ids such as `Q3-02` point to the tester (1 founder, 2 investor, 3 deal, 4 chama, 5 staff, 6 documents) and its finding number.

---

## 1. The verdict

- **A founder can go from sign-up to a closed deal through the screens.** Sign-up, onboarding, matches, readiness, verification, staff approval, connecting, chat, the deal room, real document uploads, staff review of documents, agreeing terms and closing all work on the clean path.
- **An investor can too,** but several shared screens drop him into the founder's app (section 3, item 1).
- **Staff can do their core job:** sign in, work the risk-sorted queue, decide with a written reason, review deal documents, suspend and reinstate.
- **Access control held everywhere it was tried:** strangers, unverified and signed-out people saw nothing of a deal, a chat or a document.
- **Nothing on screen claims what the product does not do:** no wallet, deposit, escrow, KYC, "AI-verified" or score wording in either app.
- **Three parts of the demo story cannot be shown as written:** the track record before she verifies (step 3), "Verified on FoundersLink" after closing (step 7), and the chama scene (step 8).

## 2. The demo story, step by step (PRODUCT.md section 11)

| Step | Result | What happens today |
|---|---|---|
| 1. Amina joins and describes her business in Sheng; the form fills itself in | Works with a change | Sign-up and onboarding work. The Sheng sentence fills only the sector; a clear English one fills two fields. The AI is never asked at this point (Q6-04, Q1-04). She fills the rest herself. |
| 2. Three lists: Savanna under Pitch, another for a missing KRA PIN, a VC under Don't pitch | Works with a change | The three lists are exactly right. Savanna shows without its name until she is verified, and as "Good fit", not "Strong" (Q6-05, Q1-11). |
| 3. She opens Savanna's profile: fit breakdown and track record | Only after step 4 | The person and track record are hidden until she is approved. After approval the entries show with their labels; the summary sentence ("Has backed 2 health businesses…") is never shown. |
| 4. Connect asks her to verify; staff approve her and reject a flagged investor | Works | The app unlocks without a reload. Say "risk check", not "AI": on this machine the flag comes from the backend's rules. |
| 5. Chat; a "tuma processing fee" message carries a warning | Works | Live in about 0.2 seconds. The sender must be an approved, connected member. |
| 6. Deal, due diligence, uploads, AI pre-checks and the pack | Works with a change | Uploads and staff review work. Documents read "Uploaded", not "AI pre-checked", and the pack is not shown on the screen (Q3-05, Q6-02). |
| 7. Both confirm, the deal closes, it appears as Verified on the investor's track record | Last part cannot be shown | Closing works and the bank sentence shows. The new entry stays hidden: it needs both parties to agree to share it, and no screen offers that (Q3-02, Q6-01). Grace's seeded entry can be shown instead. |
| 8. The chama: three founders, a statement showing who owes, a vote | Cannot be shown | The app can start a chama and record a contribution. Invites, the statement and votes exist only in the backend (section 5). |

---

## 3. Bugs: things that are built and behave wrongly

Ordered by how much they hurt. "Size" is a rough guess at the fix: S under 15 minutes, M up to an hour, L more.

| # | What | Found by | Owner | Size |
|---|---|---|---|---|
| 1 | **An investor is dropped into the founder's app.** After submitting verification, "Keep exploring" and "See your matches" open the founder's Matches ("Your account cannot do this"). Tapping "You are approved" or "Connection accepted", or reloading on Profile or Notifications, shows founder screens and tabs. Founder routes are not refused for investors. | Q2-01, Q2-02, Q3-03 | Mobile | M |
| 2 | **Verification cannot be resumed.** Once the phone is confirmed, leaving and returning restarts at the phone step, and the same number is refused as "already verified", with no way forward. Only a different number gets through. Both roles. | Q1-01, Q2-04 | Mobile | S |
| 3 | **Skipping the email code cannot be undone.** "Continue exploring" skips it; nothing offers it again; verification then refuses at the last step with no link. | Q1-02 | Mobile | S |
| 4 | **Search reveals hidden business names to an unverified investor.** Cards are anonymised, but searching "Afya Booking" narrows five cards to one. | Q2-03 | Backend | S |
| 5 | **A list of every investor, with names, is open to any signed-in member** (`GET /funders`), including unverified ones. | Q6-13 | Backend | S |
| 6 | **Signed-out links do not go to the login screen.** They show "We couldn't load this. Sign in to continue" with no button. `/profile` shows an empty profile; `/settings` opens fully. No data leaks. | Q1-08, Q2-12, Q3-24, Q4-24 | Mobile | S |
| 7 | **Password reset shows no demo code,** unlike sign-up and phone, so it cannot be finished from the screens. | Q1-03 | Mobile | S |
| 8 | **"Report a member" in Settings sends nothing.** It shows "Report received" and stops; staff never see it. (Reporting a message from a chat does reach staff.) | Q5-09, Q3-10 | Mobile | S |
| 9 | **The deal screen and the Requests list never refresh.** After the other party or staff act, the screen is stale until reload; Withdraw on an already accepted request then fails silently. Chat is live; these are not. | Q3-13, Q3-20, Q2-10, Q4-23 | Mobile | S |
| 10 | **Search boxes in the dashboard do nothing** (Verification, Members, Audit log). | Q5-04 | Admin | S |
| 11 | **A suspended member is shown the wrong reason:** his status screen quotes the admin's earlier approval note, and he gets no notification. Suspended and rejected members are also told to "Start verification". | Q5-10, Q5-11 | Backend + Mobile | M |
| 12 | **Checks staff type are recorded wrongly.** "BRS lookup" is saved as an identity check; any unrecognised text silently becomes "Identity". | Q5-05 | Admin | S |
| 13 | **A "fix this first" investor's page says "Good fit, 6 of 6 match"** with no mention of the gap that put it there, and no demo-record note. | Q1-10 | Mobile | S |
| 14 | **A false money warning in chama chat.** "Contributions are due, Paybill 522533" is flagged; "Please send me 5000 by M-Pesa to my number urgently" is not. | Q4-16 | Backend rules / AI | M |
| 15 | **M-Pesa statement dates are read the wrong way round:** `04-10-2026` is imported as 10 April. | Q4-17 | Backend | S |
| 16 | **A document the AI could not read would still be labelled "AI pre-checked"** once the new AI service runs. | Q6-12 | Backend | S |
| 17 | **"Replace" on a deal document adds a duplicate** instead of replacing; the rejected row stays with "share a corrected copy". | Q3-16 | Mobile | S |
| 18 | **Decision history is lost on resubmission,** and a re-check cannot be decided: the page refuses with a false "server did not answer". | Q5-13, Q5-01 | Admin | M |
| 19 | **Deal document decisions are not in the audit log,** though the dashboard says every decision is recorded. The log also has no "who" column. | Q5-02, Q5-03, Q3-12 | Backend + Admin | M |
| 20 | **Vetting can be submitted without the phone being confirmed by code.** The phone typed on the application and the account's phone are two separate fields. | Q5-15, Q4-36, Q3-28 | Backend | S |
| 21 | **Changing a consent means redoing onboarding from blank.** The link reopens the form with nothing filled in. | Q1-05 | Mobile | M |
| 22 | The phone field refuses `07…` numbers and insists on `+254`. | Q1-13 | Mobile | S |
| 23 | An amount of 0 is accepted on a join request; a repeated request shows the backend's sentence twice. | Q2-19 | Mobile | S |
| 24 | Outside production, "Forgot password" returns the working reset code for any account, the admin's included. It is how the demo shows codes; a judge may ask. | Q6-14 | Backend | S |
| 25 | "Open reports" and its badge count every report ever made; "Chamas" on the overview counts learning circles; "Deals in due diligence 3" links to a list of 2. | Q5-19, Q4-15 | Admin | S |

## 4. Where the product differs from what the team decided

These need a decision, not only a fix: change the product, or change the document.

| # | The document says | The product does | Found by |
|---|---|---|---|
| 1 | **D13:** accepting a join request creates a connection only; the app then offers "Start an investment deal with these terms?" | Accept opens a deal at once, titled "Investment deal", with "equity" filled in that nobody chose. Decline sends the fixed reason "Not the right time". | Q3-01, Q6-07 |
| 2 | **D13:** investors are not chama members | Investors have a Chamas tab and can start and join one, in the app and the backend. | Q4-13, Q2-08, Q6-08 |
| 3 | **D12:** every party's documents *and checks* before terms; a person decides | Terms can be agreed once documents are uploaded, before staff have looked at them. A deal closed with its checklist at 0 of 6. | Q3-04, Q6-11 |
| 4 | **D12 level 2:** organisation *and website* for investors; phone confirmed by code | The app never asks an investor for a website, so every investor is flagged for having none. The phone need not be confirmed. | Q2-05, Q6-10 |
| 5 | **D12:** "Verify now" offered from sign-up | Offered after onboarding (Matches banner, Profile), not at sign-up. | Q1 step 7 |
| 6 | **D11:** no grants or loan products | "Loan" and "Grant" are offered under "How you invest"; the backend still serves grant, revenue bands and eligibility flags. | Q2-13, Q6-21 |
| 7 | **PRODUCT, D1, D11:** experts are members | The app offers Founder and Investor only. The backend still accepts experts. No decision records the cut. | Q6-15 |
| 8 | **PRODUCT section 5:** four consents, export, delete | The app asks a founder three, an investor none, and never the documents one. There is no screen to change a consent or export data. The privacy page says each can be withdrawn at any time. | Q1-06, Q1-07, Q2-06, Q6-18 |
| 9 | **D7:** documents are encrypted; judges were told object storage | Files are on the server's local disk, not encrypted. The app's privacy page says so honestly. | Q6-16 |
| 10 | **D7:** admins have two-step sign-in; investors need two admins | Two-step is off for the demo admin and cannot be turned on from the dashboard. One admin approves an investor, and nothing says the demo uses one. | Q5-07, Q5-08 |
| 11 | **D11:** the deal says money moves through the parties' bank | The backend sends the notice; the deal screen shows the sentence only once closed. Terms are not labelled "self-reported, not a legal document". | Q2-11, Q3-08 |
| 12 | The rejection reason is "saved in the audit log" | It is also sent word for word to the applicant, with the risk signals. A scammer is told which rule caught him. | Q5-14 |
| 13 | One name | "FounderLink" remains in the docs (64 lines), the AI service's on-screen strings, the READMEs and the browser tab title. | Q6-17 |

## 5. Promised in the documents, with no screen for it

| Area | Missing in the app | Backend has it? | Found by |
|---|---|---|---|
| **Track record** | An investor cannot add or see his own past investments. Neither party can agree to show a closed deal. The summary sentence is never shown. | Yes | Q2-07, Q3-02, Q6-05 |
| **Chamas** | Invite or join (the invite link opens "Unmatched Route"); set the Paybill, amount and frequency; roles, remove, leave; create goals or assign a contribution to one; notes and minutes; decisions and votes; upload a statement; suggested learning circles; a link to the chama's chat. "Who still owes" never appears unless the amount is set through the backend. | Yes, and its rules passed every check | Q4-01 to Q4-12, Q4-22 |
| **Deal room** | Change the terms; open a shared document; tick the deal checklist; pause or decline; milestones and check-ins; move to Active; the due-diligence pack; a founder's list of her deals; a link between a deal and its chat. | Yes | Q3-05 to Q3-09, Q3-18 |
| **Connections** | Write a message when asking to connect; withdraw a sent request; a "pending" or "connected" state on the Connect button. | Yes | Q1-12, Q3-19 |
| **A founder's page as an investor sees it** | Fit band, reasons, "Checked by FoundersLink" badge, ready badge, sorting in Discover. | Yes | Q2-09, Q2-16 |
| **Chat** | Unblock; a visible blocked state; a reason when reporting (it always sends "Asks for money"); a notification for a new message. | Partly | Q3-11, Q3-23, Q3-21 |
| **Her own data** | Edit the business after onboarding; change a consent; export; change password; language. | Yes, except change password | Q1-06, Q1-14 |
| **Ask Compliance** | A "last verified" date on sources, a way to bring in an expert, feedback on an answer, setting a deadline. | Yes | Q6-24, Q1-09 |
| **Staff dashboard** | Decide a re-check; turn on two-step sign-in; create an admin; see application documents; see a deal once its documents are decided; the applicant's business profile on the review page; chamas. | Yes, except chamas | Q5-01, Q5-06, Q5-08, Q5-16, Q4-14 |
| **Notifications** | Nothing is sent for a chama, for a suspension, or for the other party sharing a document. | No | Q4-29, Q5-10, Q3-21 |

## 6. The AI service (AI/ML 1 and 2)

All nine endpoints the backend calls now exist in the code, and their request and answer shapes match the backend's on every one (Q6, contract table). The gaps are in setup, not in the contract.

| What | State |
|---|---|
| Running build on the demo laptop | The older one: profile extraction, matching and fit explanations only. Everything else falls back to the backend's rules. |
| Document pre-check | Would fail on a PDF: `pypdf` is not installed, and the import sits outside its error handling. Photos and scans cannot be read at all (`pytesseract` is not a dependency). |
| Ask Compliance | Cannot give a cited answer on any machine today. The model's instruction file (`ai/compliance_rag/prompts/answer_with_citations.txt`) is empty; `chromadb` is not in the requirements; 20 of 27 sources are not in the repo and must be fetched; the index must be built; an LLM key is needed. Every question today gets "No official source for this yet". The answer is honest and never guesses. |
| Sheng extraction | "Milioni moja" is not read as an amount by the backend's stand-in. Whether the AI service reads it was not tested, because the app never asks it (bug: the consent is saved two steps after the description). |
| Fit bands | Every match is "Good fit", even with every signal fitting; none is "Strong". |
| Name | Strings from the AI service that reach a screen still say "FounderLink". |

## 7. Smaller findings

**Wording and consistency**
- Copy assumes every founder is a woman and every reader a founder: "her name shows once you are verified", "see her business", "you cannot connect with investors" shown to an investor, "I found funding elsewhere" as an investor's reason to leave, "the money moves between you and the investor" shown to the investor (Q2-18, Q2-21, Q3-17, Q5-28).
- Chama screens say "circle" and "by the treasurer" in the backend's notice; a learning circle is created under "Start a chama" (Q4-31, Q4-32).
- The tab is "Network" and its page is "Connections"; the list is "Fix first" where the docs say "Pitch after you fix this" (Q1-25).
- The overview says members "cannot be matched until someone decides"; they can, anonymised (Q5-20, Q1-19, Q2-24).
- The privacy page and the delete page mention "documents you uploaded for verification"; verification asks for none (Q1-16).
- Timeline entries show raw `document_shared`; audit actions show raw `approve`, `needs info` (Q3-15, Q5-21).
- A rejected-document notice ends with a double full stop (Q3-21, Q5-29).
- The browser tab title is "FounderLink"; the support address is `support@founderlink.co.ke`, a mailbox nobody has confirmed exists.

**Usability**
- Approve, reject and needs-more-info act at once with no confirm step, and stay active after a final decision (Q5-17).
- "Needs more info" makes the applicant start the form again with her statement blank and the reviewer's request not shown (Q5-12).
- Closing a deal: the proposer sees no change, and the other party sees a plain "Close the deal" instead of "confirm" (Q3-14).
- Block is one tap with no confirmation (Q3-11).
- Reloading investor onboarding on step 2 loses the answers; "Edit what I fund" returns to Discover, not Profile (Q2-14, Q2-23).
- Unknown addresses show the framework's default "Unmatched Route" page with a Sitemap link (Q1-20, Q4-02).
- A chama's record form has no date or note; a wrong contribution cannot be corrected (Q4-20, Q4-21).
- The sign-up terms checkbox has no link to the terms (Q1-23).
- An SMS notification choice is accepted without the contact consent (Q1-15).
- The dashboard's audit filters offer kinds that are never logged; the members CSV has no email or phone and uses raw values (Q5-21, Q5-22).

## 8. Documents that are out of date

| Document | What is stale |
|---|---|
| `docs/PRODUCT.md` | Says "after D1–D12" while citing D13. Status column says "frontend to build" on nearly every row; the screens exist. Lists five AI endpoints as "to build" that now have code. Still has the expert journey. |
| `docs/FRONTEND_INTEGRATION.md` | "Both apps run on mock data today"; consent list lacks the documents one. |
| `docs/COMPLIANCE_SOURCES.md` | Says `sources.json` is empty; it has 27. |
| `docs/FUNDING_FLOW.md` | The contract everyone points to has no pre-check or pack and still shows an SME example. |
| `docs/E2E-TESTING.md` | Describes the removed flow (user id, temporary password, group deposit). |
| `docs/DEMO_SCRIPT.md` | Empty. |
| `docs/TEAM_DECISIONS.md` D7 | Says documents are encrypted. |
| `ai/README.md`, `backend/README.md` | Lack the new AI endpoints and settings. |

## 9. What was verified to work

- **Sign-up and sign-in:** every validation (empty, bad email, short or mismatched password, terms unticked, existing email); wrong, short and expired codes; resend; wrong password; log out with a confirm.
- **Founder onboarding:** missing fields named; all consents off explained; the profile saved.
- **Matches:** three lists with counts that reproduce the demo's logic; anonymised investor-kept records and named public ones, as D12 says; marking the KRA PIN done moved an investor from "Fix first" to "Pitch".
- **Verification:** bad numbers and wrong codes refused; a 20-character minimum on the statement; one application even when Submit is pressed twice; staff approval reaching the app with no reload.
- **Investor:** every validation on the mandate form; a duplicate fund name refused; anonymised cards carry no name, description or id on screen or in the data; join request, withdraw, resend, duplicate refused.
- **Chat:** live both ways in about 0.2 seconds; the money warning shown to the recipient only; a reported message reaching staff with its text; unread counts and mark-as-read.
- **Deals:** real uploads of PDF and PNG; a wrong file type refused; agreeing terms refused with each missing document and its owner named; staff reject with a reason reaching both parties; replacement and confirmation; both-party confirmation of terms and of closing; terms locked by the backend after agreement.
- **Chamas (backend):** role permissions, single-use invites, duplicate receipts, future dates, the who-owes arithmetic, and privacy of unmatched payers all held.
- **Staff dashboard:** wrong password, unknown email and a member account get the same refusal; signing out, Back and deep links are closed; document files are refused when signed out; the queue is sorted by risk then wait; reasons are required; suspend and reinstate work and are logged; an image document shows inline and a PDF opens in a new tab.
- **Honesty of the product:** documents read "Uploaded" and never "AI pre-checked"; the dashboard says "automatic rules", never "AI"; Settings, Chamas, Reports and Compliance sources in the dashboard each say what is not available instead of offering dead buttons; the terms and privacy pages state the demo's limits.
- **The API documentation** covers every route.

## 10. Not tried

- Anything on a physical phone, or below a tablet width in the dashboard.
- Any AI feature on the new AI service build.
- Actually deleting an account; sending a "report a member"; suspending from a report mid-deal.
- The two-step sign-in flow with it turned on; the two-admin rule for investors (both need a settings change).
- A real M-Pesa statement in any format, and the Safaricom confirmation callback. The statement test used a made-up file in the format the code already expects, so it shows only that the code agrees with itself. A real statement is a password-protected PDF, which the parser cannot read.
- Declining a join request; a file over 5 MB; chat with long histories; Swahili (no language switch is reachable).
- Whether email is sent on a staff decision (all notifications came back as in-app).
- The yearly re-check; automatic suspension after three reports.

## 11. For the questions after the presentation

Things a judge may ask that no document covers (Q6-27):
- In development the backend logs one line per request with its address, never its body.
- Email and SMS codes cannot be delivered (no SMS provider; the email service delivers only to its owner), so outside production the code is shown on screen in an alert labelled as a demo.
- The reason a member gives for deleting her account is written to the server log with her role only, and not stored.
- Uploaded files are deleted 30 days after the decision or after the deal ends.
- One command loads and resets the five demo accounts.
