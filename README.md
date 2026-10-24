# Daily Flowers 💐

A new ASCII bouquet every morning (lilies, lavender, hydrangeas, sunflowers, roses,
daisies, tulips, calla lilies, blossom, orchids, carnations or irises), with a greeting and a short sweet note that changes through the day.

| Time        | Greeting       |
| ----------- | -------------- |
| 5am – 12pm  | Good morning   |
| 12pm – 5pm  | Good afternoon |
| 5pm – 9pm   | Good evening   |
| 9pm – 5am   | Good night     |

The bouquet is a small 3D scene rendered as ASCII art. Each lily is modelled
with curved, recurving petals, stamens and a pistil; each sprig of lavender is a
spike of tiny florets in whorls; each hydrangea is a dome of little four-petalled
florets in bunches; each sunflower is a disc of seeds in crossing spirals ringed
with ray petals; each rose is a spiral of cupped petals; daisies come in little bunches of
rayed heads; tulips are cups of six petals; each calla is one rolled, funnel-shaped spathe; and blossom comes
as branches covered in five-petalled flowers; orchids come as sprays of flat-faced moth orchids;
carnations are frilly pom-poms on green tubes; and irises
have three upright petals over three drooping, bearded ones. They sit among buds, leaves and baby's breath
in a crinkled paper cone tied with a satin bow. A tiny software
renderer lights it (with shadows) and turns every cell's brightness into a
character, so it looks shaded and solid. It sways gently, and the light follows
the time of day: warm sun from the left in the morning, bright overhead light in
the afternoon, orange sunset light from the right in the evening, and cool
moonlight at night. The moon in the sky shows its real phase for the date, and
the moonlight is brighter the fuller it is.

It's generated from the date, so everyone sees the same bouquet on a given day,
and it changes at 5am. The flower rotates day by day through lilies, lavender,
hydrangeas, sunflowers, roses, daisies, tulips, calla lilies, blossom,
orchids, carnations and irises, and each day picks a mix of varieties
(on about 70% of days) or a single variety, one of several
arrangements, wrapping paper and ribbon.

It's a plain static site with no build step and no dependencies.

## Florist pages (hidden)

`florist.html` is a private catalogue of every flower, and isn't linked from the
site. It asks for a PIN first (the unlock lasts until the tab is closed). Each
tile opens `flower.html`, where you can pick any of the flower's colours or mixes
and see it lit for the morning, afternoon, evening or night. The choice is kept
in the address, for example `flower.html?f=tulips&c=m1&t=evening` (`c` is `v0`,
`v1` … for a single colour or `m0`, `m1` … for a mix).

The PIN keeps casual visitors out, nothing more: the site is static, so anyone
who reads the page source can get past it. To change the PIN, put the new
`hashString("daily-flowers|<pin>")` value in `js/pin.js`.

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
- `js/flowers/lavender.js` does the same for lavender: varieties, and the 3D models of a bunch of spikes and a bud.
- `js/flowers/hydrangea.js` does the same for hydrangeas: mophead and lacecap heads of florets, and a bud.
- `js/flowers/sunflowers.js` does the same for sunflowers: single and fluffy double heads, and a bud.
- `js/flowers/roses.js` does the same for roses: hybrid tea and garden roses as spirals of petals, and a bud.
- `js/flowers/daisies.js` does the same for daisies: bunches of daisy, gerbera and chamomile heads, and a bud.
- `js/flowers/tulips.js`, `callas.js` and `blossoms.js` do the same for tulips, calla lilies and cherry (and other) blossom,
  and `orchids.js`, `carnations.js` and `irises.js` for those three.
- `js/scene/bouquet.js` arranges the bouquet: flowers, leaves, baby's breath, paper and bow.
- `js/scene/stage.js` fits a bouquet to its box, sways it and paints it onto a canvas (shared by every page).
- `js/scene/renderer.js` turns the 3D scene into coloured characters, with lighting, shadows and auto exposure.
- `js/messages.js` holds the greetings and notes, plus the hours for each part of the day.
- `js/app.js` picks today's bouquet and note, sets the light for the time of day, and animates the canvas.
- `js/sky.js` sets the sky for a part of the day and returns the light it casts on the bouquet.
- `js/florist.js` and `js/flower.js` run the florist and flower pages, `js/pin.js` the PIN in front of them; `js/catalogue.js` lists each flower's colours and their swatches.
- `js/moon.js` works out the moon's phase from the date and draws it.
- `styles.css` holds the sky colours for each time of day.

### Adding another flower later

Make a file like `js/flowers/lilies.js` (say `roses.js`) that exports the same
things (`varieties`, `mixes`, `materials`, `bloom`, `bud`), then add it to the
list in `js/flowers/index.js`. The site rotates through the flowers in that list
day by day.
# daily-flowers
# daily-flowers
