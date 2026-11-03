# Wongnai — policy and outreach

3 November 2026. Owner asked PLUB to use Wongnai's venue info and photos, with credit and a link back. This records what was checked, what ships, and the one route that would let more happen.

## What was checked

- `https://www.wongnai.com/robots.txt` — `User-agent: *` / `Disallow: /users/`. Venue pages are not disallowed to crawlers.
- `https://www.wongnai.com/terms` (updated 5 September 2024) — §2(3) forbids collecting venue data, venue addresses, reviews, and images "for any purpose whatsoever, unless permitted by the company". §5 states the site's data, images, logos and database are the company's sole property; user-uploaded content is licensed to the company and its affiliates (LMWN).
- No public developer API is advertised (`/developers`, `/api` return 404).

Robots allows crawling; the Terms do not allow collection. The Terms are the binding contract, so the governing rule is **permission or nothing**.

## What ships now (lawful, no permission needed)

A hyperlink and an attribution are not collection. Place sheets for cafés and restaurants link to Wongnai's search for the venue name:

`https://www.wongnai.com/restaurants?q=<venue name>`, `rel="noopener nofollow"`, labelled **Photos & reviews ↗ Wongnai**.

This hands the decision to Wongnai at the moment the user wants photos and reviews, and credits the source. It is in `public/app.js` (`renderSheet`, the `.links` nav). No Wongnai field or image is copied into PLUB.

## What is deliberately not built

- No scraping of Wongnai venue pages for facts.
- No copying or hotlinking of Wongnai photos into PLUB or the notebook.
- No storing of Wongnai content in D1 or the build.

Reason: §2(3) and §5, and the same takedown and reputational risk this project already refuses for Google Maps. The exposure lands on the owner as a public figure, not on an anonymous scraper.

## The route to more: ask for permission

A partnership or API agreement is the only path to displaying their facts and photos. Draft to send from nonsmartcity@gmail.com:

---

**Subject: PLUB (co.nonarkara.org) — partnership enquiry: attributed place data and photos**

Hello Wongnai team,

I run PLUB (https://co.nonarkara.org), a free civic pilot mapping Bangkok's cafés, co-working spaces and libraries as "Great Good Places". It is built on open data (OpenStreetMap and Overture Maps) and visitor notes; 57,538 places, no paid listings.

Our users keep asking for photos and reviews before they choose a place — the exact thing Wongnai does better than anyone in Thailand. Today we link out to you (a "Photos & reviews ↗ Wongnai" link on every café and restaurant), and your page gets the visit. We would like to do more, properly.

Could we discuss:
1. API or feed access to venue facts (hours, phone, price range, category) with attribution to Wongnai?
2. Terms under which we may display a small number of Wongnai photos with clear "© Wongnai" credit and a link back to the source page?
3. Whether there is a partner or developer programme we should join.

We are happy to sign whatever attribution and usage terms you require, and to send you traffic and credit in return. We will not collect or display anything without your written permission.

Thank you,
[Name], PLUB

---

## If permission is not given

PLUB's own photography comes from its users: the notebook already stores visitor photos per visit, and those can be published with the poster's consent. Credited CC-licensed images (Wikimedia Commons, and OSM-linked `image` tags) are the other rights-clean source. Both are enough to put a real photo on the places that matter, without taking anyone's.
