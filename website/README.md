# FoundersLink website

The public landing page for FoundersLink: one static page that says what FoundersLink is and sends people to the app to join or log in.

## What is here

- `index.html`: the whole page, with its CSS inline. No build step and no JavaScript.
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
