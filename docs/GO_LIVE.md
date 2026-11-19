# Going live: a free pilot

How to run FoundersLink for real people, on free plans, for a small pilot
with people you know. What stays where:

| Piece | Where | Address |
|---|---|---|
| Landing page | Netlify project `founderslink` | https://founderslink.netlify.app |
| Demo app (demo data, no server) | Netlify project `founderslink-demo` | https://founderslink-demo.netlify.app |
| **Live app** | Netlify project `founderslink-app` (new) | https://founderslink-app.netlify.app |
| **Backend** | Render web service `founderslink-api` (`render.yaml`) | https://founderslink-api.onrender.com |
| **Database** | Neon (or Supabase), free plan | given by Neon |
| AI service | Not on the free pilot: the backend's rule-based stand-in answers | |

The demo stays as it is. The live app is a separate Netlify project, so the
article's demo link never shows real members.

## What the free plans mean

- **The backend sleeps** after about 15 minutes with no visitors; the next
  person waits up to a minute while it wakes.
- **Uploaded files are not kept.** Profile photos and vetting documents are
  saved on the server's disk, and Render's free disk is wiped on every
  restart and deploy. Fine for trying the flows; before a real launch, add
  a paid persistent disk (mount it and set `UPLOAD_DIR` to it) or move files
  to object storage.
- **No AI service.** Its embedding model needs more memory than free plans
  give. Matching, the scam check and Ask Compliance fall back to the
  backend's rules (Ask Compliance then says it cannot confirm). Add the AI
  service on a paid plan later and set `AI_SERVICE_URL` and
  `AI_SERVICE_API_KEY`.
- **Email needs a domain.** Sign-up and password codes are emailed through
  Resend. Without a domain of your own, Resend sends only to the address
  the Resend account was made with, so only you can sign up. To invite
  anyone else, buy a domain (a `.co.ke` costs a little each year), verify it
  in Resend, and set `EMAIL_FROM` to an address on it.

Check the providers' pricing pages for the current limits: free plans change.

## Steps

1. **Database (Neon).** Sign up at neon.tech, create a project in the
   region nearest Kenya (Frankfurt), and copy its connection string (it
   starts `postgresql://` and ends `?sslmode=require`).
2. **Email (Resend).** Sign up at resend.com and create an API key. With a
   verified domain, note the address to send from, such as
   `FoundersLink <hello@your-domain>`; without one, use
   `FoundersLink <onboarding@resend.dev>` (it reaches only you).
3. **Backend (Render).** Sign up at render.com with GitHub, then New >
   Blueprint and choose this repository. Render reads `render.yaml` and asks
   for `DATABASE_URL`, `RESEND_API_KEY` and `EMAIL_FROM`. It generates
   `JWT_SECRET` and `UPLOAD_ENCRYPTION_KEY` itself; never change them
   afterwards. The first build takes a few minutes; on each start the
   server applies the database migrations and loads the compliance
   checklist, with no demo accounts and no made-up funders.
4. **Check the backend.** Open `https://founderslink-api.onrender.com/health`:
   it answers `{"status":"ok"}`. Then check that the server sees each
   visitor's own address, which the sign-in pause relies on: in Render, add
   `LOG_REQUESTS` = `true`, open the health address from your phone on
   mobile data and from your laptop on Wi-Fi, and look at Render's logs.
   Each line shows the visitor's address before the browser's name. The
   two must differ, and match what a "what is my IP" site shows on each
   device. If both show the same address, raise `TRUST_PROXY` by one and
   try again; use the smallest number that works, because a larger one lets
   a visitor pretend to be another address. Then delete `LOG_REQUESTS`:
   addresses are personal data and should not pile up in logs.
5. **Staff account.** In Render, open the service's Shell and run
   `npm run admin:create`, so someone can approve new members.
6. **The live app.** On this computer:
   ```bash
   cd mobile
   pnpm build:pwa https://founderslink-api.onrender.com
   ```
   In Netlify, Add new project > Deploy manually, drag `mobile/dist`, and
   name the project `founderslink-app`. If you choose another name, change
   `CORS_ORIGIN` in Render to match, or the app cannot reach the backend.
   Rebuild the demo afterwards with plain `pnpm build:pwa` before you next
   drop it on `founderslink-demo`.
7. **Try it end to end** with your own email: sign up, get the code, fill in
   the profile, approve yourself from the staff account.

## Before real members' data goes in

- Register with the Office of the Data Protection Commissioner (ODPC) as
  a data controller, and publish a real privacy policy and terms (the
  landing page's Privacy and Terms links are still `#`).
- Carry out a data protection impact assessment, and have a breach plan:
  the ODPC must be told within 72 hours.
- Where the data lives is a choice: Neon and Render in Frankfurt are
  outside Kenya, which the Data Protection Act treats as a cross-border
  transfer that needs safeguards.
- Use a paid LLM key when the AI service is added: free tiers may use the
  questions to improve the provider's products.
- Turn on Neon's backups, and keep the demo and the live data apart (they
  already are: the demo runs entirely in the browser).
- Have an advocate review the terms and the privacy policy.
