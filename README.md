# Daily Flowers 💐

A new ASCII lily bouquet every morning, with a greeting and a short sweet note
that changes through the day.

| Time        | Greeting       |
| ----------- | -------------- |
| 5am – 12pm  | Good morning   |
| 12pm – 5pm  | Good afternoon |
| 5pm – 9pm   | Good evening   |
| 9pm – 5am   | Good night     |

The bouquet is a small 3D scene rendered as ASCII art. Each lily is modelled
with curved, recurving petals, stamens and a pistil, set among buds, leaves and
baby's breath in a crinkled paper cone tied with a satin bow. A tiny software
renderer lights it (with shadows) and turns every cell's brightness into a
character, so it looks shaded and solid. It sways gently, and the light follows
the time of day: warm sun from the left in the morning, bright overhead light in
the afternoon, orange sunset light from the right in the evening, and cool
moonlight at night.

It's generated from the date, so everyone sees the same bouquet on a given day,
and it changes at 5am. Each day picks a lily variety (or a mix), one of several
arrangements, wrapping paper and ribbon.

It's a plain static site with no build step and no dependencies.

## Run locally

Any static server works, for example:

```sh
npx serve .
```

Preview another day or time with query params:

```
http://localhost:3000/?date=2026-12-25&hour=8
http://localhost:3000/?hour=22
```

## Deploy to Vercel

**Option 1: from the terminal**

```sh
npx vercel          # first time: log in and link the project (accept the defaults)
npx vercel --prod   # deploy to production
```

**Option 2: from GitHub**

1. Push this folder to a GitHub repo.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Leave Framework Preset as **Other**, with no build command and no output directory.
4. Deploy. Every push to `main` redeploys automatically.

## Where things live

- `js/flowers/lilies.js` holds the lily varieties, their colours and shapes, and the 3D models of a bloom and a bud.
- `js/scene/bouquet.js` arranges the bouquet: flowers, leaves, baby's breath, paper and bow.
- `js/scene/renderer.js` turns the 3D scene into coloured characters, with lighting, shadows and auto exposure.
- `js/messages.js` holds the greetings and notes, plus the hours for each part of the day.
- `js/app.js` picks today's bouquet and note, sets the light for the time of day, and animates the canvas.
- `styles.css` holds the sky colours for each time of day.

### Adding another flower later

Make a file like `js/flowers/lilies.js` (say `roses.js`) that exports the same
things (`varieties`, `mixes`, `materials`, `bloom`, `bud`), then add it to the
list in `js/flowers/index.js`. With more than one flower in the list, the site
rotates through them day by day.
# daily-flowers
# daily-flowers
