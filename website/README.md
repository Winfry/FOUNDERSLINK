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
| Get started, Join as a founder / investor / expert | `https://app.founderslink.co.ke/auth/signup` |
| Log in | `https://app.founderslink.co.ke/auth/login` |
| How it works, Trust, Features | Sections on this page |
| Privacy, Terms | `#` for now: replace with the real pages before launch |

## Rules for the copy

- No statistics, member counts, money totals, testimonials or partner logos until they are real.
- No bank names: money moves "through your own bank".
- The examples in "What you get" are illustrations and say so on the page.
