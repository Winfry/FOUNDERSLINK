# FoundersLink: final verification

**Run on 4 October 2026, 07:45 to 08:25, against commit `b9e721b`. Updated at 08:50 with what was fixed afterwards (up to commit `8255aa7`), and again at about 09:55 with everything fixed since (up to commit `7bbcc1d`).**

Six testers went through the product. Five used the real screens as a person with a goal (a new founder, a new investor, a founder and investor doing a deal, three founders running a chama, a new staff member). One compared every claim in the team's documents with the code. None of them changed any code. Each created its own accounts, and all of that test data has since been removed.

**What this is and is not.** Everything was run in a browser at phone width (390 x 844) on one laptop. Nothing was run on a physical phone. During the run the AI service on that laptop was the older build, so every AI feature that arrived in Winfry's push this morning was tested as "falls back to the backend's rules". The AI service was restarted on the newer code at about 09:35; section 6 says what was checked on it since. The six journeys were not re-run after the fixes. Each State column says how a fix was checked, and section 10 lists what was only typechecked or not tried.

Ids such as `Q3-02` point to the tester (1 founder, 2 investor, 3 deal, 4 chama, 5 staff, 6 documents) and its finding number.

---

## 1. The verdict

- **A founder could go from sign-up to a closed deal through the screens at the time of the run.** Sign-up, onboarding, matches, readiness, verification, staff approval, connecting, chat, the deal room, real document uploads, staff review of documents, agreeing terms and closing all worked on the clean path. Two things on that path have changed since: accepting a request now only connects the two people and then offers the deal, and terms can be agreed only after staff have confirmed every document. The backend tests cover both rules. The whole path was not walked again in the app after these changes.
- **An investor can too.** At the time of the run several shared screens dropped him into the founder's app; that is fixed (section 3, item 1). Investors no longer have chamas, and an investor who opens the chamas address is sent to Discover.
- **Staff can do their core job:** sign in, work the risk-sorted queue, decide with a written reason, review deal documents, suspend and reinstate. The review page now shows the applicant's profile and earlier decisions, and the audit log shows who acted.
- **Access control held everywhere it was tried:** strangers, unverified and signed-out people saw nothing of a deal, a chat or a document.
- **Nothing on screen claims what the product does not do:** no wallet, deposit, escrow, KYC, "AI-verified" or score wording in either app.
- **Three parts of the demo story still cannot be shown as written:** the track record before she verifies (step 3), "Verified on FoundersLink" after closing (step 7), and the chama scene (step 8).
- **Most of the bugs are fixed:** 23 of the 25 in section 3. The two left open are left on purpose. Many of the fixes were typechecked and not seen working; section 10 lists them.

## 2. The demo story, step by step (PRODUCT.md section 11)

| Step | Result | What happens today |
|---|---|---|
| 1. Amina joins and describes her business in Sheng; the form fills itself in | Works with a change | Sign-up and onboarding work. The description box now offers "Let AI read this to fill in my form". With it on and the AI service running, the description goes to the AI service. Asked through the backend, the AI service fills the sector, the county and the amount (KSh 1,000,000) from the Sheng sentence. With the switch off, simple rules fill what they can, as before (the sector only, for the Sheng sentence). The switch was typechecked; it was not walked through on a new sign-up. |
| 2. Three lists: Savanna under Pitch, another for a missing KRA PIN, a VC under Don't pitch | Works with a change | On the product owner's instruction, her home now shows one list: the investors who fit her today. "Fix first" and "Don't pitch" are no longer shown there. Savanna Angels now reads "Strong fit" (seen in the browser as Amina, with the AI service running). At the time of the run Savanna showed without its name until she was verified; that was not looked at again. |
| 3. She opens Savanna's profile: fit breakdown and track record | Only after step 4 | Unchanged. The person and track record are hidden until she is approved. After approval the entries show with their labels; the summary sentence ("Has backed 2 health businesses…") is never shown. |
| 4. Connect asks her to verify; staff approve her and reject a flagged investor | Works | The app unlocks without a reload. Keep saying "risk check", not "AI": the risk signals on the new AI code were not tried. The review page now shows her business, whether her email and phone were confirmed, and earlier decisions. An application can no longer be submitted until the phone is confirmed by code. |
| 5. Chat; a "tuma processing fee" message carries a warning | Works | Unchanged. Live in about 0.2 seconds at the time of the run. The sender must be an approved, connected member. The money check on the new AI code was not tried. |
| 6. Deal, due diligence, uploads, AI pre-checks and the pack | Works with a change | Accepting the request now only connects the two; the app then offers to start an investment deal with the amount the investor proposed, and she chooses the instrument (typechecked, not walked through). Staff must confirm every document before terms can be agreed, so the demo visits the dashboard a second time (covered by a backend test, not walked in the app). Documents still read "Uploaded" unless the AI pre-check runs, which was not tried. The pack is not shown on the screen (Q3-05, Q6-02). |
| 7. Both confirm, the deal closes, it appears as Verified on the investor's track record | Last part cannot be shown | Unchanged; no commit touched it. Closing works. The bank sentence now shows on the deal screen at every stage, not only once closed. The new entry stays hidden: it needs both parties to agree to share it, and no screen offers that (Q3-02, Q6-01). Grace's seeded entry can be shown instead. |
| 8. The chama: three founders, a statement showing who owes, a vote | Cannot be shown | Unchanged for founders. The app can start a chama and record a contribution. Invites, the statement and votes exist only in the backend (section 5). Investors can no longer start, join or see a chama. |

---

## 3. Bugs: things that were built and behaved wrongly

**23 of 25 are fixed. 2 are still open, both on purpose.** The testers did not re-run after the fixes, so each fixed row says how the fix was checked: seen in the app, covered by a backend test, or only typechecked.

### Still open

| # | What | Found by | Why it is open |
|---|---|---|---|
| 14 | **A false money warning in chama chat.** "Contributions are due, Paybill 522533" is flagged; "Please send me 5000 by M-Pesa to my number urgently" is not. | Q4-16 | The warning rules belong to the AI rules. |
| 24 | Outside production, "Forgot password" returns the working reset code for any account, the admin's included. It is how the demo shows codes; a judge may ask. | Q6-14 | A deliberate demo decision: it is how the demo shows codes. |

### Fixed since the run

| # | What it was | Owner | Fixed, and how it was checked |
|---|---|---|---|
| 1 | An investor is dropped into the founder's app | Mobile | In `806813e` (checked in the app) |
| 2 | Verification cannot be resumed | Mobile | In `806813e` (checked in the app) |
| 3 | Skipping the email code cannot be undone | Mobile | In `806813e` (checked in the app) |
| 4 | Search reveals hidden business names to an unverified investor | Backend | In `b4263a1` (checked against the backend) |
| 5 | A list of every investor, with names, is open to any signed-in member | Backend | In `b4263a1` (checked against the backend) |
| 6 | Signed-out links do not go to the login screen | Mobile | In `806813e` (checked in the app) |
| 7 | Password reset shows no demo code | Mobile | In `806813e` (request succeeds; the alert itself was not read back, and still has not been) |
| 8 | "Report a member" in Settings sends nothing | Mobile | In `806813e` (still not sent for real) |
| 9 | The deal screen and the Requests list never refresh | Mobile | In `806813e` (by reading the code only; still not seen while the other party acts) |
| 10 | Search boxes in the dashboard do nothing | Admin | In `8255aa7` (checked in the dashboard) |
| 11 | A suspended member is shown the wrong reason | Backend + Mobile | In `f27226d` (backend) and `eb10e86` (app). The backend now sends the reason and a notification on suspension and on reinstatement. The reason and the notification in the app were only typechecked, not seen. |
| 12 | Checks staff type are recorded wrongly | Admin | In `dde76e9`. Checks are chosen from the kinds the backend keeps and saved as chosen. The review page was seen loading; recording a check was not walked through. |
| 13 | A "fix this first" investor's page says "Good fit, 6 of 6 match" | Mobile | In `eb10e86`. The page says "Fix this first" with what to fix and a way to the checklist. Typechecked and read in the code; the page was not opened for such an investor. |
| 15 | M-Pesa statement dates are read the wrong way round | Backend | In `f27226d` (backend tests: day-first dates are read the Kenyan way, and an unclear date is refused) |
| 16 | A document the AI could not read would still be labelled "AI pre-checked" | Backend | In `f27226d`. Not seen: the document pre-check on the new AI code was not tried. |
| 17 | "Replace" on a deal document adds a duplicate | Mobile | In `eb10e86` (typechecked only; replacing a document was not walked through) |
| 18 | Decision history is lost on resubmission | Admin | In `dde76e9` (earlier decisions listed on the review page; the page was seen loading with the applicant's profile) and `0ecbe68` (deciding a re-check). The re-check dialog was only typechecked: no re-check is due in the demo data. |
| 19 | Deal document decisions are not in the audit log | Backend + Admin | In `f27226d` (backend) and `0ecbe68` (dashboard). The "By" column and document actions in words were seen in the audit log. |
| 20 | Vetting can be submitted without the phone being confirmed by code | Backend | In `f27226d` (backend tests). The application carries the confirmed number. |
| 21 | Changing a consent means redoing onboarding from blank | Mobile | In `eb10e86` and `8d28262`. The "edit my business" screen was seen opening pre-filled, and the consents page was seen loading. Changing a consent was not walked through. |
| 22 | The phone field refuses `07…` numbers and insists on `+254` | Mobile | In `806813e` (checked in the app) |
| 23 | An amount of 0 is accepted on a join request; a repeated request shows the backend's sentence twice | Mobile | In `eb10e86` (typechecked only) |
| 25 | "Open reports" and its badge count every report ever made; "Chamas" on the overview counts learning circles; "Deals in due diligence 3" links to a list of 2 | Admin | In `f27226d` (backend counts) and `0ecbe68` (dashboard). The overview's counts were seen on screen. |

## 4. Where the product differed from what the team decided

**All 13 have been dealt with: 8 were fixed in the product, 3 are settled by a dated note in the documents, and 2 still differ in a small way (one of them only in a detail that was not checked).**

### Still differs in a small way

| # | The document says | Where it stands |
|---|---|---|
| 5 | **D12:** "Verify now" offered from sign-up | `8d28262`: both setups now end with the choice to verify straight away. It is still not on the sign-up screen itself. Typechecked. |
| 6 | **D11:** no grants or loan products | Grants were removed in `7bbcc1d` and loans in the commit after this note: equity and convertible note are the only instruments offered, in the app and the backend (backend tests). Whether the backend still serves revenue bands and eligibility flags was not checked. |

### Settled by a note in the documents, not by changing the product

| # | The document said | What the note now says |
|---|---|---|
| 9 | **D7:** documents are encrypted; judges were told object storage | `89cd1ba`: a note dated 4 October under D7 says files are on local disk and not encrypted in the demo. The files are still not encrypted. |
| 10 | **D7:** admins have two-step sign-in; investors need two admins | : a dated note under D7 (`89cd1ba`), and the dashboard's Settings now says the same (`0ecbe68`, seen on screen). The demo still runs with one approval and two-step sign-in off. |
| 13 | One name | `89cd1ba`: the name is FoundersLink throughout `docs/`. One line in `ai/README.md` still says "FounderLink". The AI service's on-screen strings were not checked again. |

### Fixed in the product

| # | The document says | What the product did | Fixed, and how it was checked |
|---|---|---|---|
| 1 | **D13:** accepting a join request creates a connection only; the app then offers "Start an investment deal with these terms?" | Accept opened a deal at once, titled "Investment deal", with "equity" filled in that nobody chose. Decline sent the fixed reason "Not the right time". | `27edbb4`. Accepting connects; the app then offers the deal with the amount the investor proposed, and she chooses the instrument. Declining asks for a reason in her own words, or none. Typechecked only; accepting followed by the offer was not walked through. |
| 2 | **D13:** investors are not chama members | Investors had a Chamas tab and could start and join one, in the app and the backend. | `27edbb4` (app) and `7bbcc1d` (backend, with a test). Seen: an investor who opens the chamas address is sent to Discover. |
| 3 | **D12:** every party's documents *and checks* before terms; a person decides | Terms could be agreed once documents were uploaded, before staff had looked at them. A deal closed with its checklist at 0 of 6. | `7bbcc1d`. Terms are refused until staff have confirmed every document; the refusal says what is still to be shared and what is waiting to be confirmed. Covered by a backend test, not walked in the app. The deal checklist is still not ticked from any screen (section 5). |
| 4 | **D12 level 2:** organisation *and website* for investors; phone confirmed by code | The app never asked an investor for a website, so every investor was flagged for having none. The phone need not be confirmed. | The website in `8d28262` (typechecked), the confirmed phone in `f27226d` (backend tests). |
| 7 | **PRODUCT, D1, D11:** experts are members | The app offered Founder and Investor only. The backend still accepted experts. No decision recorded the cut. | `7bbcc1d`: the backend now refuses an expert at sign-up too (backend test). `89cd1ba` added a dated note to `PRODUCT.md` that the app offers founders and investors only. |
| 8 | **PRODUCT section 5:** four consents, export, delete | The app asked a founder three, an investor none, and never the documents one. There was no screen to change a consent or export data. The privacy page says each can be withdrawn at any time. | `8d28262`. A member can see and change each consent in Settings, and an investor's setup has a third step, "What is shared" (both seen loading). She can download her data from the same page (typechecked; the download was not tried). Whether the documents consent is among those listed was not checked. |
| 11 | **D11:** the deal says money moves through the parties' bank | The backend sent the notice; the deal screen showed the sentence only once closed. Terms were not labelled "self-reported, not a legal document". | `eb10e86`: the deal screen shows, at every stage, that the money moves through the parties' bank and that the terms are their own record. Typechecked; the deal screen was not among those opened afterwards. |
| 12 | The rejection reason is "saved in the audit log" | It was also sent word for word to the applicant, with the risk signals. A scammer was told which rule caught him. | `7bbcc1d`: the applicant is no longer sent the risk level or the signals (backend test). The written reason still goes to the applicant, and the review page now says so (`dde76e9`). |

## 5. Promised in the documents, with no screen for it

**Updated at about 09:55.** Where a screen now exists, the row says so in bold, with the commit and how it was checked. Everything else in a row is still missing.

| Area | Missing in the app | Backend has it? | Found by |
|---|---|---|---|
| **Track record** | An investor cannot add or see his own past investments. Neither party can agree to show a closed deal. The summary sentence is never shown. | Yes | Q2-07, Q3-02, Q6-05 |
| **Chamas** | Invite or join (the invite link has no screen); set the Paybill, amount and frequency; roles, remove, leave; create goals or assign a contribution to one; notes and minutes; decisions and votes; upload a statement; suggested learning circles; a link to the chama's chat. "Who still owes" never appears unless the amount is set through the backend. | Yes, and its rules passed every check | Q4-01 to Q4-12, Q4-22 |
| **Deal room** | Change the terms; open a shared document; tick the deal checklist; pause or decline; milestones and check-ins; move to Active; the due-diligence pack; a founder's list of her deals; a link between a deal and its chat. | Yes | Q3-05 to Q3-09, Q3-18 |
| **Connections** | Write a message when asking to connect; withdraw a sent request; a "pending" or "connected" state on the Connect button. **Now exists:** declining a request with a reason in her own words, or none (`27edbb4`, typechecked only). | Yes | Q1-12, Q3-19 |
| **An investor's page as a founder sees it** | **Now exists:** when something stands between her and pitching an investor, the page says "Fix this first", names it and links to the checklist (`eb10e86`, typechecked and read in the code, not opened for such an investor). | Yes | Q1-10 |
| **A founder's page as an investor sees it** | Fit band, reasons, "Checked by FoundersLink" badge, ready badge, sorting in Discover. | Yes | Q2-09, Q2-16 |
| **Chat** | Unblock; a visible blocked state; a reason when reporting (it always sends "Asks for money"); a notification for a new message. | Partly | Q3-11, Q3-23, Q3-21 |
| **Her own data** | Change password; language. **Now exist:** editing the business after onboarding (`eb10e86`; seen opening pre-filled); changing a consent in Settings (`8d28262`; the page was seen loading, a change was not walked through); downloading her data (`8d28262`; typechecked only, the download was not tried). | Yes, except change password | Q1-06, Q1-14 |
| **Ask Compliance** | A "last verified" date on sources, a way to bring in an expert, feedback on an answer, setting a deadline. | Yes | Q6-24, Q1-09 |
| **Staff dashboard** | Turn on two-step sign-in; create an admin; see application documents; see a deal once its documents are decided; chamas. **Now exist:** deciding a re-check, as still fine or as a suspension, each with a written reason (`0ecbe68`; typechecked only, because no re-check is due in the demo data); the applicant's profile on the review page, a founder's business or an investor's organisation, with a link to her member page (`dde76e9`; the profile was seen on the page). The member page's link to her own application was only typechecked. | Yes, except chamas | Q5-01, Q5-06, Q5-08, Q5-16, Q4-14 |
| **Notifications** | Nothing is sent for a chama, or for the other party sharing a document. **Now exists:** a notification when a member is suspended and when she is reinstated (`f27226d`, backend; not seen in the app). | No | Q4-29, Q5-10, Q3-21 |

## 6. The AI service (AI/ML 1 and 2)

All nine endpoints the backend calls now exist in the code, and their request and answer shapes match the backend's on every one (Q6, contract table). The gaps are in setup, not in the contract. **Updated at about 09:55:** the AI service on the demo laptop was restarted on the newer code at about 09:35, and the rows below say what was checked through the backend since.

| What | State |
|---|---|
| Running build on the demo laptop | The newer code, since about 09:35. Checked through the backend: matching and fit explanations answer from the AI service, and profile extraction reads the Sheng sentence. Ask Compliance still falls back to the backend's rules. Document pre-check, risk signals and the chat money check on the new code were not tried. |
| Document pre-check | Not tried on the new code. At the time of the run it would have failed on a PDF: `pypdf` was not installed, and the import sat outside its error handling. Photos and scans could not be read at all (`pytesseract` is not a dependency). Whether that still holds was not checked. A document the AI could not read is no longer labelled "AI pre-checked" (`f27226d`). |
| Ask Compliance | Still cannot give a cited answer. The AI service answers 503: there is no index, `chromadb` is not installed, and there is no LLM key. The backend falls back to its own rules. The answer is honest and never guesses. |
| Sheng extraction | When the AI is asked, the Sheng demo sentence fills the sector, the county and the amount (KSh 1,000,000). Checked through the backend. The app now asks the AI only when "Let AI read this to fill in my form" is on (`8d28262`); that switch was typechecked and not walked through on a new sign-up. With it off, the backend's stand-in still does not read "milioni moja" as an amount. |
| Fit bands | Savanna Angels is now a "Strong" fit, checked through the backend and seen in the browser as Amina. |
| Name | Strings from the AI service that reach a screen said "FounderLink" at the time of the run. Not checked again. |

## 7. Smaller findings

**Wording and consistency**
- Copy assumes every founder is a woman and every reader a founder: "her name shows once you are verified", "see her business", "you cannot connect with investors" shown to an investor, "I found funding elsewhere" as an investor's reason to leave, "the money moves between you and the investor" shown to the investor (Q2-18, Q2-21, Q3-17, Q5-28).
- Chama screens say "circle" and "by the treasurer" in the backend's notice; a learning circle is created under "Start a chama" (Q4-31, Q4-32).
- The tab is "Network" and its page is "Connections"; the list was "Fix first" where the docs say "Pitch after you fix this" (Q1-25). That list is no longer shown on her home (`8d28262`).
- The overview said members "cannot be matched until someone decides"; they can, anonymised (Q5-20, Q1-19, Q2-24). Fixed in `0ecbe68`; the corrected sentence was seen on screen.
- The privacy page and the delete page mention "documents you uploaded for verification"; verification asks for none (Q1-16).
- Timeline entries show raw `document_shared`; audit actions showed raw `approve`, `needs info` (Q3-15, Q5-21). The audit log now names each action in words (`0ecbe68`, seen on screen). The deal timeline was not changed.
- A rejected-document notice ends with a double full stop (Q3-21, Q5-29).
- The browser tab title was "FounderLink" at the time of the run (the dashboard's title now reads "FoundersLink Admin"; the mobile app's was not checked again); the support address is `support@founderlink.co.ke`, a mailbox nobody has confirmed exists.

**Usability**
- Approve, reject and needs-more-info acted at once with no confirm step, and stayed active after a final decision (Q5-17). Fixed in `dde76e9`: each decision asks for a confirmation, and the form gives way to the outcome after a final decision. Not walked through.
- "Needs more info" makes the applicant start the form again with her statement blank and the reviewer's request not shown (Q5-12).
- Closing a deal: the proposer sees no change, and the other party sees a plain "Close the deal" instead of "confirm" (Q3-14).
- Block is one tap with no confirmation (Q3-11).
- Reloading investor onboarding on step 2 loses the answers; "Edit what I fund" returns to Discover, not Profile (Q2-14, Q2-23).
- Unknown addresses showed the framework's default "Unmatched Route" page with a Sitemap link (Q1-20, Q4-02). Fixed in `eb10e86`: they now show a "This page is not here" screen with a way home (seen in the browser).
- A chama's record form has no date or note; a wrong contribution cannot be corrected (Q4-20, Q4-21).
- The sign-up terms checkbox has no link to the terms (Q1-23).
- An SMS notification choice is accepted without the contact consent (Q1-15).
- The dashboard's audit filters offer kinds that are never logged; the members CSV has no email or phone and uses raw values (Q5-21, Q5-22).

## 8. Documents that are out of date

**Updated at about 09:55:** the documents were brought up to date in commit `89cd1ba` (and `backend/README.md` in `7bbcc1d`). Each row says what that pass did and what it left stale.

| Document | What was stale at the time of the run | Now |
|---|---|---|
| `docs/PRODUCT.md` | Said "after D1–D12" while citing D13. Status column said "frontend to build" on nearly every row; the screens exist. Listed five AI endpoints as "to build" that now have code. Still had the expert journey. | Updated in `89cd1ba`: it says D1–D13, and the status column describes what is built, what is partly there and what has no screen. The expert journey is still in the text, under a dated note that it is not in the app. It was written before the later fixes of this morning, so rows about consents, export and the accept flow may be behind. |
| `docs/FRONTEND_INTEGRATION.md` | "Both apps run on mock data today"; consent list lacked the documents one. | Updated in `89cd1ba`. |
| `docs/COMPLIANCE_SOURCES.md` | Said `sources.json` is empty; it has 27. | Updated in `89cd1ba`. |
| `docs/FUNDING_FLOW.md` | The contract everyone points to had no pre-check or pack and still showed an SME example. | Partly updated in `89cd1ba`: dated notes at the top and in section 4 name the new endpoints and say the SME and grant parts no longer apply. **Still stale:** section 7 (the build status table) is dated 3 October, 23:52 and still describes experts, the SME path and the old rules. |
| `docs/E2E-TESTING.md` | Described the removed flow (user id, temporary password, group deposit). | Marked out of date at the top in `89cd1ba`. **Still stale:** the body was not rewritten. |
| `docs/DEMO_SCRIPT.md` | Empty. | Written in `89cd1ba` from what this verification found to work, and corrected at about 09:55 for the single list of matches, the "Let AI read this" switch, and the second visit to the dashboard to confirm documents. |
| `docs/TEAM_DECISIONS.md` D7 | Said documents are encrypted. | A note dated 4 October in `89cd1ba` records that in the demo files are on local disk and not encrypted, and that the demo runs with one approval and without two-step sign-in. The decision itself was not rewritten. |
| `docs/KENYA_AMENDMENTS.md` | Not listed at the time of the run. | A status note at the top was added in `89cd1ba`. **Still stale:** the body is history and was not rewritten. |
| `ai/README.md`, `backend/README.md` | Lacked the new AI endpoints and settings. | `backend/README.md` was updated in `7bbcc1d`. **Still stale:** `ai/README.md` was not touched by either commit, and one line still says "FounderLink". |
| Root `README.md` | Not listed at the time of the run. | One line changed in `89cd1ba`. **Still stale:** the folder list names `frontend/` with "stack to be confirmed" and leaves out `mobile/`, `admin/` and `shared/`. |

## 9. What was verified to work

This is what the testers saw during the run. Three lines describe things that have changed since: the founder's home now shows one list, not three; terms now also wait for staff to confirm the documents; and the dashboard's Settings now states the demo's limits.

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

**Rewritten at about 09:55.** This is the current list.

Not re-run:
- The six journeys were not re-run after any of the fixes. After everything landed, the changed screens were opened in a browser at phone width as Amina and as Grace, with no page errors, and all the dashboard pages were loaded. That shows the screens open; it is not a walk through the journeys.

Fixed, but only typechecked and never walked through:
- Accepting a join request followed by the offer of a deal.
- The "Let AI read this to fill in my form" switch on a brand-new sign-up.
- Downloading her data.
- A deal refused at terms until staff confirm the documents. The backend tests cover it; it was not walked in the app.
- The reset code alert (bug 7).
- Sending "Report someone" for real (bug 8).
- A deal screen updating while the other party acts (bug 9).
- Replacing a deal document (bug 17).
- The suspended member's reason and notification in the app (bug 11).
- The re-check dialog in the dashboard (no re-check is due in the demo data), and the member page's link to her own application.
- Recording a check on the review page, the confirmation step on a decision, changing a consent, declining a request with a reason, the investor's website field, the "Fix this first" note on an investor's page, the bank sentence on the deal screen before closing, and the zero-amount check on a join request.

Not tried on the new AI service:
- Document pre-check, risk signals and the chat money check. Only matching, fit and the Sheng extraction were checked, through the backend. Ask Compliance was checked and still falls back.

Not tried at all, as before:
- Anything on a physical phone, or below a tablet width in the dashboard.
- Actually deleting an account; suspending from a report mid-deal.
- The two-step sign-in flow with it turned on; the two-admin rule for investors (both need a settings change).
- A real M-Pesa statement in any format, and the Safaricom confirmation callback. The statement test used a made-up file in the format the code already expects, so it shows only that the code agrees with itself. A real statement is a password-protected PDF, which the parser cannot read.
- A file over 5 MB; chat with long histories; Swahili (no language switch is reachable).
- Delivering an email or an SMS. Neither can be delivered: the email service sends from a test address that delivers only to the account owner, and no SMS provider is configured. Codes appear in a "Demo code" alert. This is still open.
- The yearly re-check; automatic suspension after three reports.

## 11. For the questions after the presentation

Things a judge may ask that no document covers (Q6-27):
- In development the backend logs one line per request with its address, never its body.
- Email and SMS codes cannot be delivered (no SMS provider; the email service delivers only to its owner), so outside production the code is shown on screen in an alert labelled as a demo.
- The reason a member gives for deleting her account is written to the server log with her role only, and not stored.
- Uploaded files are deleted 30 days after the decision or after the deal ends.
- One command loads and resets the five demo accounts.
