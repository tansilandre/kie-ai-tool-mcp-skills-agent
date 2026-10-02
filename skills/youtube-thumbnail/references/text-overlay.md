# Headline overlay

Add the headline after the image is generated. The text is drawn by your own tools, so the
letters are exact, it costs no credits, and you can try several wordings on one background. The
result is a flat PNG. There are two recipes. Use A when a Chromium browser is available (it gives
all five styles). Use B when only ImageMagick is.

## Headline rules

- 2 to 4 words, ALL CAPS. A headline, not a sentence.
- Not on the face. Put it in a free quarter: bottom, a corner or a side. Keep it clear of the
  bottom-right corner, where YouTube shows the video length (general YouTube behavior, not
  tested here).
- Large: font size about 16% of the frame height. When in doubt, bigger.
- Margins: about 5 to 6% of the frame height from the edges.
- One color idea per headline: white, a fire gradient, or acid lime. At most one accent line.

What makes the look work. Remove one and it falls apart:

| Trait | Value |
|---|---|
| Font | Anton, one weight: a fat condensed grotesque |
| Case | ALL CAPS |
| Stroke | thick, 8 to 14% of the font size, drawn UNDER the fill |
| Shadow | hard, dark, offset down, plus a soft blur |
| Color | white, a yellow to orange to red gradient, or acid lime `#D4FF3F` |
| Tracking | tight (`-0.01em` to `-0.02em`), line height about 1 |

## Before you start

Download the generated image into a work folder and read its size
(`magick identify bg.png`). Everything below scales from the image height, so any resolution
works. Look at the image: pick the quiet quarter for the text. If every quarter is busy, choose
the darkest one and use a heavier stroke.

## Recipe A: HTML page and a browser screenshot

Needs a Chromium browser (Chrome, Chromium, Edge) or your own browser tool. Network access lets
it load the font from Google Fonts. Offline, the page falls back to Impact or Arial Black.

1. Save the background next to the page as `bg.png`.
2. Save the page below as `overlay.html`. Paste one style (next section) where marked.
3. Screenshot it at exactly the image size (`W` and `H` are its pixel width and height):

   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
     --hide-scrollbars --screenshot="$PWD/out.png" --window-size=W,H \
     --virtual-time-budget=5000 "file://$PWD/overlay.html"
   ```

   On Linux the binary is usually `google-chrome` or `chromium`; on Windows use `chrome.exe` or
   `msedge.exe` (same flags, not tested there). With a browser tool instead: open the `file://`
   URL, set the viewport to `W` x `H`, take a screenshot of the page, save the PNG.
4. Check that `magick identify out.png` shows `W` x `H`, then open the PNG and look at it. Chrome
   may print display warnings; only the written file matters.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #000; }
  #poster { position: relative; width: 100vw; height: 100vh; overflow: hidden;
            background: url("bg.png") center / cover no-repeat;
            font-family: "Anton", Impact, "Arial Black", sans-serif; }
  #headline { position: absolute; left: 5vh; bottom: 6vh; text-align: left;
              line-height: 1; letter-spacing: -0.01em; text-transform: uppercase; }
  .line { font-size: 17vh; }
  /* STYLE GOES HERE */
</style>
</head>
<body>
  <div id="poster"><div id="headline">
    <div class="line" data-text="I SPENT">I SPENT</div>
    <div class="line" data-text="100 DAYS">100 DAYS</div>
  </div></div>
</body>
</html>
```

Keep `data-text` equal to the line's text (the Fire style reads it). To move the block, change
`left`/`bottom`, or use `right` with `text-align: right`. To try another wording, edit the two
lines and screenshot again.

Pitfalls:

- `paint-order: stroke fill` draws the stroke under the fill. Without it the stroke paints on top
  and eats half of every letter.
- Gradient text cannot use `paint-order` (the stroke would paint over the gradient). The Fire style
  uses a second layer, `::after`, for the gradient.
- If the letters look thin or plain, the font did not load. Check the network, raise
  `--virtual-time-budget`, or accept the Impact fallback and say so.
- Sizes are in `vh`, so the window size must equal the image size or the text will not scale.

### Five styles

Bold (default): white fill, thick black stroke. The optional last rule colors the second line.

```css
.line { color: #fff; -webkit-text-stroke: 1.9vh #000; paint-order: stroke fill;
        text-shadow: 0 1.1vh 0 rgba(0,0,0,.35), 0 1.9vh 3.3vh rgba(0,0,0,.55); }
.line:last-child { color: #D4FF3F; }
```

Fire: yellow to orange to red gradient with a glow.

```css
.line { position: relative; color: #1a0a00; -webkit-text-stroke: 1.9vh #1a0a00; paint-order: stroke fill;
        filter: drop-shadow(0 0 3vh rgba(255,120,0,.55)) drop-shadow(0 1.4vh 0 rgba(0,0,0,.4)); }
.line::after { content: attr(data-text); position: absolute; inset: 0; -webkit-text-stroke: 0;
        background: linear-gradient(#FFE24B 0%, #FF9A1F 45%, #FF2E2E 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent; }
```

Neon Lime: acid lime with a glow.

```css
.line { color: #D4FF3F; -webkit-text-stroke: 1.7vh #0a1400; paint-order: stroke fill;
        text-shadow: 0 0 3.6vh rgba(180,255,40,.7), 0 1.4vh 0 rgba(0,0,0,.4); }
```

Clean Glass: Inter 800 on frosted pills. Change the font link to
`family=Anton&family=Inter:wght@800` first.

```css
#headline { font-family: "Inter", sans-serif; }
.line { display: table; margin-top: 1vh; font-size: 13vh; font-weight: 800; color: #fff;
        letter-spacing: -0.02em; background: rgba(20,20,25,.45); backdrop-filter: blur(2.2vh);
        padding: .12em .5em; border-radius: .2em; box-shadow: 0 2.8vh 8vh rgba(0,0,0,.5); }
```

Marker: black Anton on lime boxes.

```css
.line { display: table; color: #0a0a0a; background: #D4FF3F; padding: 0 .18em;
        box-shadow: 0 1.1vh 0 rgba(0,0,0,.5); }
```

## Recipe B: ImageMagick

Plain Bold look only (white fill, black stroke). No gradient or glow: use recipe A for those.
It needs a heavy condensed font file. Impact ships with macOS at the path below. Find others
with `fc-list | grep -i -E 'anton|impact|bebas|oswald'`. On ImageMagick 6 use `convert` and
`identify` instead of `magick`.

```bash
IMG=bg.png
FONT=/System/Library/Fonts/Supplemental/Impact.ttf
H=$(magick identify -format %h "$IMG")
PS=$((H*16/100)); SW=$((PS*11/100)); GAP=$((PS*105/100)); M=$((H*6/100))
magick "$IMG" -font "$FONT" -pointsize $PS -kerning $((-PS/75)) -gravity southwest \
  -fill black -stroke black -strokewidth $SW \
  -annotate +$M+$((M+GAP)) 'I SPENT' -annotate +$M+$M '100 DAYS' \
  -stroke none -fill white -annotate +$M+$((M+GAP)) 'I SPENT' \
  -fill '#D4FF3F' -annotate +$M+$M '100 DAYS' out.png
```

The strokes of all lines go on first and the fills after, so every stroke sits under the fills.
The size is set from the image height `H`, so it works at any resolution. For a right-aligned
block use `-gravity southeast`. If the font path does not exist, `magick` fails or falls back:
check the output is not in a thin default font.

## Export

Keep the full-size PNG. Make the upload copy at 1280x720 (the 16:9 size to aim for) and, if the
file is too big for the upload limit, a JPEG:

```bash
magick out.png -resize 1280x720^ -gravity center -extent 1280x720 Topic_Variant_Text_v1.png
magick Topic_Variant_Text_v1.png -quality 90 Topic_Variant_Text_v1.jpg
```

Then run the small-size check from Step 7 of `SKILL.md` on the finished file.

## Other fonts

Anton is the default. For another look, pick the nearest in this list and say which one you chose.
Change the Google Fonts link (`family=<Name>:wght@<weight>`), `font-family` and `font-weight`.
Keep the stroke, shadow and `paint-order` rules.

| Group | Fonts (weight) |
|---|---|
| Punchy display, closest to Anton | Bebas Neue (400), Oswald (600 to 700), Archivo Black (400) |
| Bold workhorses | Montserrat (900), Poppins (800), Roboto Condensed (700), Inter (800), Barlow Condensed (800) |
| Soft and elegant | Playfair Display (700 to 900), Cormorant Garamond (600 to 700), DM Serif Display (400), Fraunces (600 to 900), Sacramento (400, script) |

Stroke by font class: the heavy condensed faces take the full 8 to 14% stroke. The delicate serifs
and the script clog with a thick stroke: use 3 to 6% or none, and lean on a soft shadow. A script
is an accent line, never the hero word, because it fails the 120 px test. Check that the font has
every character of the headline (accents, non-Latin scripts) and look for empty boxes in the
result. The ImageMagick recipe can only use fonts installed on the machine.

## Quick check before you deliver

- [ ] Anton or a chosen alternative, ALL CAPS, 2 to 4 words, spelled as ordered.
- [ ] Stroke thick and under the fill.
- [ ] Text off the face, off the bottom-right corner, inside the margins.
- [ ] One color idea.
- [ ] The font actually loaded.
- [ ] Opened the PNG and checked it at 120 px wide.
