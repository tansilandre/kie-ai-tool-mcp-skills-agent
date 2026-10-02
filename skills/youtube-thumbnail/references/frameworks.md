# Thumbnail frameworks and prompt pieces

This file answers "what to depict". The part order in Step 4 of `SKILL.md` answers "how to
render it". Pick the framework first, then fill the parts.

## The information gap

Every thumbnail must open an information gap: the image raises a question that the title and the
video answer. Before you write a prompt, brainstorm at least five concept options across the
frameworks below. Keep the strongest. A concept often combines two frameworks (for example Posed
Portrait plus Map plus Landscape) when that deepens the gap without adding clutter.

**Truthfulness law.** The image may exaggerate but must honestly represent the video. Fake
screenshots, fake news clips and over-amplified claims break viewer trust. Keep any text in the
image short and true.

## The 16 frameworks

Every framework is built with the parts in Step 4. No extra tool is needed.

| # | Framework | Build it with |
|---|---|---|
| 1 | Before/After transformation | Split layout (below). Maximum contrast between two states of one subject. |
| 2 | Social UI (tweet, DM, review) | Part 5: a generic chat bubble, DM row or star-review card beside the subject. Short message as baked text (see "Short text in the image"). No real platform brand. |
| 3 | Three-step progression | Split layout with three vertical panels: start, middle story beat, end. Optional number or `DAY N` badge per panel. |
| 4 | Compelling screenshot | Not a generation. Extract a real frame from the source video: `ffmpeg -ss 00:00:12 -i video.mp4 -frames:v 1 frame.png`. Use it as is, or as the base for an overlay. Or write a Posed Action Shot that matches the video's first frame. Say so when the person has the source clip. |
| 5 | Posed portrait | The default. Subject very large (part 4) plus identity lock, lighting rig and emotion. Little or nothing in the background: the subject is the focus. |
| 6 | Posed action shot | Part 2 is one intriguing action in mid-moment. Uncrowded composition, a single hero action. |
| 7 | Highlighting a specific day | Any framework plus a big `DAY N` badge (baked or overlay). Pick a day in the last 20% of the story arc. |
| 8 | Graphical representation | Not photoreal. Replace part 1 with a clean diagram or graphic brief (a bell curve, a simple familiar chart) and drop the photoreal and lighting-rig parts. |
| 9 | Landscape | The environment is the hero. One small subject on a power third. The lighting rig is optional. |
| 10 | Map or aerial | Part 1 is a map or an aerial photo. Part 5 is a highlighted route or point (circle, arrow); add any label as overlay text. |
| 11 | Product | The product is the subject: hero, sharp, its own label and shape unchanged (pass its photo as a reference). Open the gap by making the product the answer to the title's question. |
| 12 | Adding text | Headline overlay (default) or baked text. Use it as a callout (arrow plus one word) or as the answer to the title's question. |
| 13 | Repetition of objects | Part 5: a large quantity of ONE object filling the frame, still legible. Add one context element and a subject for scale. |
| 14 | Size difference | Part 8: extreme scale contrast between two elements central to the story (giant against tiny). |
| 15 | News clip | A generic "breaking news" lower-third over the image, one short true line. Generic broadcaster styling, no real network. |
| 16 | Amplified reality | A posed action shot with ONE real element from the story made oversized in part 5. Keep it plausible. |

Frameworks 1, 5 and 12 are the usual defaults.

## Split layouts

Use a split only when the person asks for split, before/after, versus or side by side, or the
style reference is split. A topic like "X vs Y" does not by itself need one. Replace part 1 (the
Frame part) with a panel contract and keep every label out unless short, true text was ordered:

```text
Bold, punchy, high-contrast composite, poster-grade, <ratio>. Two equal panels with one clean
vertical divide in the center. LEFT panel: <before state>. RIGHT panel: <after state>. The same
person, the same framing and the same lighting rig in both panels. High contrast between them.
```

For three panels write `three equal vertical panels, left to right: <start>, <middle>, <end>`.

## Short text in the image

Text that is part of the scene (a chat bubble, a `DAY 30` badge, a chyron) goes in as baked text.
Keep it to a few words, put it in quotes, make it true to the video, and keep it generic: no real
platform, network or app logos. Check the letters after the render. If one re-roll does not fix
the spelling, move the words to an overlay ([text overlay](text-overlay.md)).

## Emotion phrases

Use one emotion per image and make the face the loudest thing in the frame. Phrases for the
`Expression:` line:

| Emotion | Phrase |
|---|---|
| shock | mouth wide open, eyebrows raised high, eyes wide |
| hype | huge open-mouth grin, bright wide eyes, head thrown slightly forward |
| rage | furrowed brows, clenched teeth, intense glare |
| awe | eyes wide, mouth slightly open, eyebrows lifted, gaze fixed on something huge |
| laugh | eyes squeezed, wide open laughing mouth, head tipped back |
| fear | eyes wide, brows pulled up and together, mouth tight and slightly open |
| smug | one eyebrow raised, closed-mouth half smile, chin lifted, half-lidded eyes |
| charisma | warm confident smile, direct eye contact, head slightly tilted |
| confusion | one eyebrow raised, one furrowed, head tilted, mouth slightly twisted |
| determination | eyes locked on the camera, jaw set, brows low |
| disgust | nose wrinkled, upper lip raised, eyes narrowed, head pulled back |

## Reading a style reference

Open the reference and write down these fields before you prompt. They are art direction only:

```text
brief, generic subject pose or action, elements, location, composition, background,
split (true/false), split_count, person_count, emotion, emotion_detail
```

Never copy its identity, its exact composition or any text on it.

## Logo

A flat logo: pass the logo file as a reference (after the faces) and use part 6. For a 3D logo,
first render it alone. Send the flat logo as the only input and ask for 1:1 at 2K (GPT Image 2
cannot do 1:1 at 4K):

```text
Transform the attached 2D logo into a premium 3D logo render: extrude the exact logo shapes into
glossy dimensional volumes; preserve every letterform, proportion and brand color; soft studio
reflections, subtle bevels, crisp edges, clean dark neutral background, soft contact shadow,
centered, generous margins, no extra text, no watermark.
```

Check the letterforms against the original. Download the result, look at it, then `upload_file` it
to use it as an input. Passing kie.ai result links straight in is not confirmed to work, and
uploading also makes you look first. Use the uploaded URL as the last `input_urls` item of every
thumbnail call.

## Edit prompts

Image-to-image with the picked image (downloaded, looked at, then uploaded with `upload_file`) as
the only input. Describe only the change. Pick one scope and fill in the first sentence:

- `Change ONLY the person's facial expression to: <phrase>.`
- `Change ONLY the background to: <new background>.`
- `Change ONLY the background color to: <color>.`
- `Change ONLY the rim light color to: <color>.`

Then add:

```text
Keep identity, face structure, hair, pose, body, clothing, logo, composition and everything
else exactly unchanged, pixel-faithful. Keep the key light, fill light and rim light intact.
```

## The rules behind all of them

One clear focal subject. A strong information gap. High contrast and readability at about 120 px.
Emotion or intrigue on any face. No clutter. Truthful to the video. A concept that reads in under
a second in a crowded feed.

## Worked example

Video: "I made a full video with just my phone". The promise is true: the creator did. Five
concepts were considered: a portrait with the phone (5), the phone against a giant pile of camera
gear (14), a before/after of the setup (1), a three-step progression (3), a news clip (15). The
size difference won: it asks "how can a phone beat all that?" Combined with a shocked portrait.

```text
IMAGE REFERENCES: image 1 = CHARACTER 1 face reference; image 2 = brand logo.
Bold, punchy, high-contrast composite, poster-grade, photoreal and high-impact, not a muted
cinematic movie still, 16:9, single unified frame, no split-screen, one continuous shot.
A creator holds one smartphone up toward the camera while an enormous towering pile of
professional camera gear (cinema cameras, tripods, light stands, microphones) looms behind them.
No text, no readable UI labels, no watermark.
CHARACTER 1: the person from attached face reference #1. IDENTITY LOCK: reproduce this exact
person with a photographic identity match: same bone structure, eye shape, nose, lips, jawline,
skin tone, hairline and hair texture. Do not beautify, average or restyle the face. Expression:
shock, mouth wide open, eyebrows raised high, eyes wide. Large in the foreground, chest-up on the
left third, filling about 50% of the frame. All faces crisply sharp as the anchors of the shot.
The phone glows with a soft cyan light, its screen an abstract glow. The gear pile is the only
other element.
The brand logo from image 2, small in the upper right corner, exact shapes, colors, proportions
and letterforms preserved, away from the face.
A bright cluttered studio. Extreme scale contrast between the small phone and the huge pile,
the person on the left power third, the phone in their raised hand near the center, clear depth.
Vivid deep-blue to teal background with a soft vignette. Bright key light sculpting the face, soft
fill lifting shadows, defined back light and hair light tracing a clean bright rim. Vivid,
bright, glossy, poster-punchy, deep blacks, crisp highlights, rich saturated color.
```

Plan item, 1K pilot:

```json
{ "tool": "gpt_image_2", "args": { "prompt": "<the text above>",
  "input_urls": ["<face photo url>", "<logo url>"], "aspect_ratio": "16:9", "resolution": "1K" } }
```

Variants of this one concept change a single line: the expression (shock, then smug), or the
camera take (chest-up, then a low angle).
