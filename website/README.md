# FoundersLink website

The public landing page for FoundersLink: one static page that says what FoundersLink is and sends people to the app to join or log in.

## What is here

- `index.html`: the whole page, with its CSS and a small vanilla script inline. No build step and no libraries.

## What moves

- A sticky header that turns deep purple once you scroll, with a menu button on phones.
- The hero headline rises in word by word, "Meet investors / founders / experts who fit." rotates, and the photo zooms in slowly.
- A looping strip of sectors, counties and expert registers (pauses on hover).
- Numbers that count up: they describe how the app works (7 checklist items, 3 lists, 6 deal stages, 47 counties, 17 expert professions from `shared/professions/index.ts`, KES 0 held). They are not member counts.
- How it works: Founder / Investor / Expert tabs, each a 01 / 04 step-through that moves on every few seconds, with a small app beside it.
- Try it: pick a sector, county, stage and amount to see which kinds of investors fit. It uses the same sample investors and the same judging as `mobile/src/services/mocks/demo-investors.ts`; keep the two in step.
- Getting ready: tick the seven papers and the bar fills. Ticking BRS or CR12 moves those investors to Ready in Try it. Nothing is saved.
- Questions: tabs with one answer open at a time.

With reduced motion turned on, nothing moves on its own. With scripts off, all the words still show.
- `assets/welcome-photo.jpg`: the handshake photo that fills the hero (copied from `mobile/assets/images/`).
- `assets/logo.png` and `assets/logo-mark.png`: the logo and the mark (also copied from the app).

The look follows `docs/design/founderslink-hybrid.html`. The only outside resource is the Inter Tight font from Google Fonts; without it the page falls back to the system font.

## How to open it

Open `index.html` in a browser (double-click it), or serve the folder with any static server, for example:

```
npx serve website
```

To host it, upload the folder as it is to any static host.

## Where the links go

| Link | Goes to |
|---|---|
| Get started, Join as a founder / investor / expert | `https://founderslink-demo.netlify.app/auth/signup` |
| Log in | `https://founderslink-demo.netlify.app/auth/login` |
| How it works, Trust, Features | Sections on this page |
| Privacy, Terms | `#` for now: replace with the real pages before launch |

## Rules for the copy

- No statistics, member counts, money totals, testimonials or partner logos until they are real.
- No bank names: money moves "through your own bank".
- The examples in "What you get" are illustrations and say so on the page.

## Photos

In `assets/photos/`, shrunk to 1600 px wide with the camera data removed. All are free to use, including commercially, under their site's licence (no credit required; the footer credits the photographers anyway). The people in them are not FoundersLink members.

| File | What | Source |
|---|---|---|
| founder-market.jpg | A woman at her stall, Nairobi | Pexels, Charles Lichinga: https://www.pexels.com/photo/african-woman-working-in-nairobi-market-stall-33569520/ |
| founder-farm.jpg | A farmer with his cow, Homa Bay | Pexels, Japhet Kweba: https://www.pexels.com/photo/man-with-cow-in-kenyan-farm-field-33567124/ |
| investor-meeting.jpg | Two professionals in a meeting | Pexels, Thirdman: https://www.pexels.com/photo/men-with-laptop-discussing-with-each-other-7993903/ |
| expert-lawyer.jpg | An advocate at his desk | Pexels, Ekaterina Bolovtsova: https://www.pexels.com/photo/a-man-in-a-suit-writing-on-a-notebook-in-his-office-6077964/ |
| scene-market.jpg | A roadside fruit stall, Nairobi | Pexels, Marie Frank: https://www.pexels.com/photo/vibrant-street-market-in-nairobi-kenya-33730494/ |
| scene-skyline.jpg | Nairobi from above (cropped to leave out a branded tower) | Pexels, Ken Mwaura: https://www.pexels.com/photo/skyline-view-of-nairobi-cityscape-at-daytime-29069344/ |
| hero-handshake.jpg | A handshake, Nairobi | Unsplash, Cytonn Photography: https://unsplash.com/photos/two-people-shaking-hands-n95VMLxqM2I |

Replace any of them with FoundersLink's own photos (of people who agreed to be shown) by keeping the same file name.

## Get started and Log in

The buttons open the FoundersLink app, installed as a PWA on Netlify (`https://founderslink-demo.netlify.app`). It is the demo: demo accounts and data, no server, so it works the same from a laptop, a phone, or this page opened as a file. Anyone can try it with the demo accounts listed on its Log in screen.

To publish a new version of the app: `cd mobile`, `pnpm build:pwa`, then drag `mobile/dist` onto the project's Deploys page on Netlify. When FoundersLink has its own address, change the links in `index.html` to it.
