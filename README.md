# the-westleys.com

Julia Esposito & Aidan Westley · August 1, 2027 · Chatham Bars Inn

Static site served by GitHub Pages. No build step: edit the HTML and commit.

| Path | What it is |
|---|---|
| `index.html` | The wedding website (password page, weekend, travel, RSVP, registry, FAQ, guestbook) |
| `admin.html` | Jules' RSVP portal: replies, guest list, guestbook approval, CSV export. Needs the admin key. |
| `questionnaire/` | The planning questionnaire Jules & Aidan fill in |
| `hero.jpg` | Home page photo |

## Data
Everything lives in Supabase (project `afkjchshoktlmqrpopyk`). The pages call `westley_*` database functions with the public publishable key. Each function checks the site password (or the admin key) on the server, and the tables themselves can't be read directly.

- Guest list: `westley_households`, `westley_guests` (78 save-the-date envelopes → 126 guests)
- Replies: `westley_rsvps`, `westley_rsvp_notes`
- Guestbook: `westley_guestbook` (hidden until approved)
- Questionnaire: `westley_questionnaire`

## Domain
Aidan's the-westleys.com (Cloudflare) points at GitHub Pages. See the DNS notes Christa sends.

## Review comments
`review.html` shows the site (desktop / phone) with pinned comments, the same system as The MOHI review boards: `review.js` calls the `mohi_review_*` functions with board `westleys`. Open it from the private link (`review.html?k=…`). The key is saved on the device and removed from the address bar, so it never lives in this repo.
