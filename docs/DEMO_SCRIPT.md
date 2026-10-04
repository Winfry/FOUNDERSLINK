# FoundersLink: demo script

**Written 4 October, 09:45.** This script uses only what `docs/FINAL_VERIFICATION.md` section 2 found to work, in the order that works. It follows the demo story in `docs/PRODUCT.md` section 11 with three changes: Amina verifies before she opens the investor's profile, step 7 shows a deal that is already on Grace's track record, and the chama is left out.

## Before you start

- **Reset the story:** in `backend/`, run `npm run db:demo -- <password>`. It removes the demo accounts and loads them again from the beginning. Run it after every rehearsal.
- **Password:** every demo account uses the password you passed to that command.
- **Open three windows:** the mobile app as Amina, the mobile app as Grace (a second browser or a private window), and the admin dashboard.
- **Check the AI service.** If you have not confirmed it is running, say "risk check" and "the app explains the match", not "the AI".

| Sign in as | Who | State after a reset |
|---|---|---|
| `amina@founderlink.example` | Amina Njeri, Afya Booking, founder | In the review queue, low risk. No KRA PIN |
| `grace@founderlink.example` | Grace Otieno, Savanna Angels Network, investor | Approved. Her track record has one "Verified on FoundersLink" deal |
| `wanjiru@founderlink.example` | Wanjiru Kamau, Daktari Mkononi, founder | Approved. The other party to Grace's closed deal |
| `brian@founderlink.example` | Brian Mwangi, Global Capital Partners, investor | In the review queue, flagged high risk |
| `admin@founderlink.example` | Demo Admin | Staff, for the review queue |

## The steps

| # | App | What you do | The one sentence to say |
|---|---|---|---|
| 1 | Mobile | Show the sign-up and onboarding screens. Type a clear English sentence about the business in the description box and let it fill the fields it can; fill the rest by hand. Then sign in as Amina. | "A founder joins in about two minutes and describes her business in her own words." |
| 2 | Mobile, Amina | Open Matches. Show the three lists: an investor under Pitch (shown without its name, as "Good fit"), one held back by the missing KRA PIN, and a VC under Don't pitch. | "She sees at once who fits her, who she could pitch after fixing one thing, and who not to spend time on, each with plain reasons." |
| 3 | Mobile, Amina | Press Connect on the investor under Pitch. The app asks her to verify. Show the verification screen and her status. | "Before anyone can contact anyone, they are checked." |
| 4 | Admin dashboard | Sign in as the admin. Show the queue sorted by risk. Approve Amina with a written reason. Reject Brian with a written reason. | "A person decides, with a reason, and the risk check puts the applications that need the closest look at the top." |
| 5 | Mobile, Amina | Go back to the app without reloading: it has unlocked. Open Savanna Angels' profile. Show the name, the fit breakdown and the track record entries with their labels. | "Now that she is verified she sees who the investor is, why they fit, and where each line of their track record comes from." |
| 6 | Mobile, both | Connect Amina and Grace. In the chat, send a normal message, then send "tuma processing fee" from one side and show the warning on the other side. | "Chat is live, and a message that asks for money carries a warning for the person who receives it." |
| 7 | Mobile, both, then dashboard | Open the deal. Upload a PDF or a photo on each side. In the dashboard, review a document. Back in the app, both agree the terms. | "Both sides share their documents in one place, and our staff review them." |
| 8 | Mobile, both | Both confirm closing. Read the bank sentence on the closed deal. | "The money moves through the bank; FoundersLink records the deal." |
| 9 | Mobile | Open Grace's track record and point to her earlier deal with Wanjiru, labelled "Verified on FoundersLink". | "A deal closed here can appear on the investor's track record as verified, like this earlier one." |

Notes on the steps:

- **Step 1.** The Sheng sentence from the story fills only the sector. A clear English sentence fills two fields. Do not say "the form fills itself in".
- **Step 2.** Every match shows as "Good fit". Do not say "Strong fit". The investor has no name until she is verified; that is by design, so say so.
- **Step 5.** The summary sentence ("Has backed 2 health businesses...") is not shown. Read the entries instead.
- **Step 7.** Documents read "Uploaded", not "AI pre-checked". The due-diligence pack is not on the screen, so do not mention it. A message can only be sent by an approved, connected member.
- **Step 9.** The deal you just closed does not appear on the track record. Do not say it does.

## Not in this demo

- **The chama (step 8 of the story).** The app can start a chama and record a contribution, but invites, the statement that shows who owes, and votes exist only in the backend. If asked, say that plainly.
- **The new deal appearing as "Verified on FoundersLink".** It needs both parties to agree to share it, and no screen offers that yet.
- **AI document pre-checks and the due-diligence pack.**
- **Experts.** The app's sign-up offers founders and investors only.

## What we say, and what we never claim

From `docs/PRODUCT.md` section 12.

**Say:** "Everyone you talk to has been checked." "The AI explains every match." "We measured our matching: X of the top 10 were right." "FoundersLink never touches the money."

Only give the "X of the top 10" line if you have the measured number in front of you.

**Never claim:** "100% scam-free", "AI-verified documents", legal advice, a success percentage, a live bank, M-Pesa or identity integration that is only a demo, or an accuracy figure we didn't measure.

## If something fails

- **"Session ended" or a screen that will not load:** sign in again and carry on from the same step.
- **A code is asked for (email or phone):** the code appears on screen in an alert labelled as a demo, because email and SMS cannot be delivered in the demo. Read it from the alert.
- **You are not sure the AI service is running:** say "risk check", not "AI".
- **A deal or request screen looks stale after the other side acts:** reload the screen.
- **The story is in the wrong state:** run `npm run db:demo -- <password>` in `backend/` and start again.
- **Nothing works:** play the recorded backup.
