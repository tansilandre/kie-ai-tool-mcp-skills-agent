# Script, beat sheet and shot list

Stages 2 and 3 of the `short-video` skill. Output: `script/Script_v1.md` (beats and
narration) and `script/Shotlist_v1.md` (one row per shot). Write the beats before the
shots. A beat is a change in information or emotion. A beat that changes nothing is
padding: cut it.

## 1. The one-message test

Write the one sentence a viewer should repeat afterwards. If it needs "and" to hold two
halves, it is two videos: cut one. Every beat serves this sentence.

## 2. Pick a structure

Pick the one that fits the content, then fill it with the brief's real claim, proof and
call to action. Times are for a 25 s reel; scale them.

| Structure | Beats | Use for |
|---|---|---|
| Hook, problem, proof, call to action | 0-2 s hook (the claim, already moving); 2-8 s problem the viewer recognises; 8-20 s one demonstration or one piece of evidence; 20-25 s next step | a product, service or offer |
| Listicle | 0-3 s hook states the count ("3 things nobody tells you about X"); 3-6 s per item, one shot and one on-screen number each; 2-3 s wrap and call to action | "N reasons / N things" |
| Guess and reveal | 0-3 s pose the question; 3-8 s visual evidence without the answer; 8-12 s reveal; 12-15 s reaction and call to action | prices, specs, any fact the viewer wants to guess |
| Before and after | 0-3 s hook; 3-10 s before, one fixed framing; 10-15 s what changed; 15-22 s after, the same framing; 22-25 s close | transformations |
| POV | 0-2 s drop straight into the scenario; then small lived-in moments; 2-3 s punchline | story, humour, relatable scenes |
| Explainer blocks | N equal blocks (see section 6): hook, one idea per block, payoff | a topic explained with voice-over |

- State the count in a listicle hook. It gives the viewer a reason to stay.
- In guess and reveal, the answer lands as text and voice at the same moment.
- In before and after, make the after frame image-to-image from the before frame so
  the framing and light match. Describe only what changed.
- In POV, if you need a sentence to explain the premise, put it in the hook line.

## 3. Duration budget

| Length | Beats | Notes |
|---|---|---|
| 15 s | 4-5 | tightest form, no setup beat |
| 30 s | 6-8 | one turn, one proof beat |
| 60 s | 10-14 | add a second hook or turn near 40% or viewers drop off |

A beat longer than about 6 s of edit time is probably two beats or padding.

## 4. Pacing and craft rules

| Rule | Why |
|---|---|
| The hook lands in the first 1-2 s: first word before about 0.8 s, first text within about 0.5 s | most scroll-past decisions happen before 2 s |
| One idea per shot; each shot has one job (introduce, show the place, prove, reveal, move, ask) | two actions in one shot make the model and the viewer read the wrong one |
| Cut every 1.5-3 s on b-roll, product and place; longer only while someone speaks on camera | slow cuts are the usual pacing problem |
| No three cuts in a row with the same shot size and camera move | the most common giveaway of a generated shot list |
| The product or place being sold holds real screen time (aim for 40% or more) | a closing card is not screen time |
| Every hook's promise is paid off by a named shot | a "let me check it myself" hook must show the checking |
| Captions first: most viewers watch muted | on-screen text and narration are not decoration |
| End on a clear call to action and design the last frame (a hold, a card) | never a generic fade into nothing |

**Clip length.** A clip is generated at its full length and trimmed in the edit. kie.ai
clips are 4 s or longer (Seedance 1.5 Pro 4-12 s, Veo 3.1 4 / 6 / 8 s, Gemini Omni
Flash "4" to "10"), so a 2 s beat still costs a 4 s clip. Where beats are short, take
two or three cuts from one 6-8 s clip with in and out points instead of paying for
three clips.

## 5. Narration rules

- Short and spoken, not written: contractions, one clause at a time, one phrase per beat.
- Put a full stop or colon where a cut should land. The picture is cut to the phrases.
- Plain text only: no timecodes, emotion cues, parentheticals or stage directions in
  the text sent to text-to-speech. Spell numbers out. Never say "in this video".
- Set tone with word choice and concrete detail, not adjectives.
- A factual topic is researched first. Do not invent quotes, dates, numbers or events.
  Keep a short Sources list and give it to the person. A personal story uses only the
  details the person supplied.
- Plan at most one or two on-camera lines (the hook, the call to action). Everything
  else is voice-over.

## 6. Explainer in blocks

For a topic explained with a voice and no presenter. A 15-60 s reel is 2-6 blocks.

- One block = one narration line = one clip. Block N audio always maps to block N video.
- Block length is the clip length you can buy. For a 10 s block, the voice fills 8-9 s:
  20-24 words in English. Scale the word count for shorter blocks and measure the take.
- One style key: write one STYLE line once (medium, palette, line character, finish)
  and paste it word for word into every image prompt (and into text-to-video clip
  prompts, which have no frame). For a non-photoreal look, end it with
  `non-photorealistic, illustrated, not a photo, no live-action, no realism`.
  Examples: `flat 2D vector animation, bold clean outlines, solid vibrant flat fills, no
  shading`; `hand-painted storybook gouache, soft textures, warm muted palette, visible
  brush strokes`; `strict monochrome minimalism, black silhouettes on white, lots of
  negative space`.
- Make one style-key image first: a swatch with no characters, faces, objects or
  letters that shows only the rendering grammar. Give it as a reference
  (`input_urls`) to the image generation of every block's first frame, so all frames
  share one look. If the person gives style reference images, use only their render
  style and colour, never their people, text or objects.
- Mascot or faceless: ask once. A mascot's first block greets by gesture with the mouth
  closed and the last block waves a sign-off. Faceless blocks are stylistic scenes.
- Keep every spoken word out of the clip. Generate clips silent (no `generate_audio`)
  or ambient only. No lip-sync, captions, text, logos or watermark in the clip prompt;
  captions are added in the edit.
- Clip prompt order for image-to-video: camera move and animation, one action that
  matches the narration, audio (none or ambient), positive locks. The frame carries the
  look, so a clip prompt has no style line and no negative lists: use positive locks
  instead of negatives. A style line is only for text-to-video clips and for the image
  prompts that make the frames. Craft rules are in `video-prompts`.
- If a clip drifts in style, fix the frame or add a positive lock, and regenerate only
  that clip.

## 7. The dialogue fit rule

Spoken characters <= (clip seconds - 0.7) x 10.5. Measured on generated on-camera
speech. Over the limit, the line is rushed or cut. For text-to-speech narration, treat
it as a first guess and measure the real take with `ffprobe`.

| Clip seconds | 4 | 5 | 6 | 8 | 10 | 12 |
|---|---|---|---|---|---|---|
| Max characters (with spaces) | 34 | 45 | 55 | 76 | 97 | 118 |

A line too long for the longest clip is split across two shots.

## 8. The look block

Decide one visual direction before any image exists. A reel reads as generated slop
when each shot has its own time of day, weather, grade and graphic style. Write it in
six lines and keep it in `script/Script_v1.md`:

```
World:     one place and one moment ("a small ceramics studio, one weekday morning")
Light:     direction, quality, colour temperature ("soft window light from camera left,
           about 5500 K; no second source")
Grade:     one colour treatment and what to avoid ("warm neutral; no teal-orange, no night")
Graphics:  one font, one accent colour, where captions sit (never over a face), one label style
Register:  "real phone video, handheld" or "stabilised gimbal, slow moves"
Lens/skin: "phone main camera, about 26 mm equivalent; matte skin with visible pores"
```

Then write the **style prefix**: one short clause per axis (register, light, colour,
lens, skin and physics, audio policy such as "no music, no subtitles") that goes
verbatim at the end of every image prompt and every text-to-video clip prompt. An
image-to-video clip prompt gets no style line: the frame carries the look. The same
words in every image prompt are what make separate clips read as one film. Put no
resolution, aspect or duration in it:
those are settings. A shot whose look differs on purpose (an aerial, a concept render)
carries its own lines and is labelled as such.

Questions to answer before you move on:

- Is every shot in the same world and time of day? If the brief mixes day and dusk,
  keep the exception to one labelled beat.
- Does the hook's promise get paid off on screen?
- Does the product or place get screen time, not only a closing card?
- Is there a beat with nothing to look at (a map card, a text slide) that needs a
  real picture?

## 9. The shot list

One shot per beat. One row per shot in `script/Shotlist_v1.md`:

| ID | Beat | Edit s | Source | Model | First frame (prompt or reference) | Last frame | Clip s | Motion, one line | Spoken | On-screen text | Sound |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | hook | 2.4 | ai | `bytedance/seedance-1.5-pro` | presenter at the bench, ref style frame | none | 4 | slow push-in | "I almost returned this." | "ALMOST RETURNED IT" | voice-over |

Fill each column with a decision, not a hope:

- **Source:** `ai` (generated), `real` (the person's footage or photo) or `graphic`
  (built in the edit). Never turn a `real` or `graphic` beat into `ai` because it is
  easier. If a real place or product must appear, make the first frame image-to-image
  from the person's real photo, so the geometry stays real.
- **Model:** from the table in `SKILL.md`. Speech on camera only for the hook or call
  to action.
- **Clip s:** one of the model's allowed lengths. For an on-camera line, the shortest
  length that passes the fit rule. For voice-over, the measured take plus a short tail.
- **Last frame:** only when the shot has a real end state (see
  [storyboard and reviews](storyboard-review.md)).
- **Sound:** voice-over, on-camera line, ambient, none.

Check the whole list at once: cut lengths vary and none run three in a row at the same
size and move; the hook is paid off; the product has its share of screen time; the
looks agree; the total clip seconds times the model's price (from `get_model_status`)
matches the budget.

## Common mistakes

| Mistake | Fix |
|---|---|
| Two ideas in one shot | split it into two shots |
| On-camera line on every shot | one or two lines in the whole reel; the rest is voice-over |
| Dialogue longer than the fit rule allows | shorten the line or lengthen the clip |
| A `real` beat quietly made `ai` | re-read the brief |
| On-screen text added after the shot list "is done" | write it with the beat |
| An asset or style frame nothing uses | drop it: every image is a paid generation |
