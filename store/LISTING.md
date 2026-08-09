# Chrome Web Store listing

Copy for the listing, kept in the repo so it is reviewed like anything else.

## Name

linkedin-x

## Summary (132 characters max)

Rebuilds LinkedIn as x.com: nine surfaces in a dark three-column shell, with the ads and the feed noise filtered out.

## Description

linkedin-x replaces LinkedIn's own screens with x.com-shaped ones. It does not
scrape, it does not send anything anywhere, and it makes no network requests at
all — it reads the page you are already looking at and draws a better one.

**What it replaces**

- Feed, with ads, "people you may know" and carousels filtered out
- A post and its replies, on its own page
- Search results, searched from inside the app
- Jobs: results, filters, and the description without leaving
- Your network's suggestions
- Member profiles and company pages
- Saved posts
- Notifications

**How it works**

LinkedIn's own page keeps running underneath. Every action — all six
reactions, comment, repost, save, connect, follow — happens by clicking
LinkedIn's own control, so there are no undocumented API calls and LinkedIn's
own error handling applies.

**Honest about two things**

Actions are detectable. A synthesised click carries `isTrusted: false` and no
extension can forge it, so LinkedIn can tell an action taken here from one you
took by hand. LinkedIn's User Agreement prohibits automated access. If that
trade is not worth it to you, switch the action toggles off and use it as a
reader — reading is the part that is effectively undetectable.

It will break. LinkedIn changes its markup and this extension reads it. When a
surface cannot be read, it says so and hands you the original page rather than
showing you an empty screen.

Open source, MIT: https://github.com/Ilmak17/linkedin-x

## Category

Social & Communication

## Permission justifications

**storage** — Remembers your settings: whether the extension is on, and which
categories of feed noise you want shown anyway. Nothing else is stored.

**Host permission, www.linkedin.com** — The extension replaces LinkedIn's own
pages, so it has to run on them. It runs on no other site, and the manifest
requests no other host.

**No remote code.** Everything the extension runs ships inside the package.
Fonts are bundled rather than fetched, so opening LinkedIn does not tell a font
CDN you did.

## Single purpose

Replacing LinkedIn's own interface with an alternative one, on linkedin.com only.

## Data usage disclosures

- Does not collect or transmit personally identifiable information
- Does not collect or transmit health, financial, authentication or personal
  communications data
- Does not collect or transmit location, web history or user activity
- Does not sell or transfer data to third parties: there are no third parties
- Does not use or transfer data for purposes unrelated to the single purpose
- Does not use or transfer data to determine creditworthiness or for lending
