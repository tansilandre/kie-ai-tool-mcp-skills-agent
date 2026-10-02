---
name: youtube-thumbnail
description: >-
  Make truthful, high-click YouTube thumbnails (16:9; also 9:16 Shorts and 4:5 Instagram covers) with kie.ai image models. Picks a concept framework with a clear information gap, writes the prompt in a fixed part order, keeps the creator's face consistent from reference photos (GPT Image 2 image-to-image takes up to 16 reference URLs), decides between model-rendered text and a headline overlay added afterwards, caps generations and retries, and checks the result at small size. Use when the user says "make a YouTube thumbnail", "thumbnail for this video", "thumbnail with my face", "Shorts cover", "Instagram video cover", "thumbnail variants", or "add a headline to this thumbnail". NOT for making the video itself (use short-video or generate-media), product catalog photos (use product-photoshoot), or general image prompt writing (use image-prompts).
---

# YouTube thumbnail

Make one thumbnail, or a small set, that tells the truth about the video and still earns the
click. The image raises a question; the title and the video answer it. Render with GPT Image 2,
check at small size, add any headline as a clean overlay.

## Rules

1. Never invent claims, results, products, people, screenshots or numbers that are not true of
   the video. The image may exaggerate. It may not mislead.
2. Every generation goes through the plan workflow of the `generate-media` skill:
   `prepare_media_generation` (free), the person's approval, `submit_media_generation`,
   `wait_for_task` (returns `result_urls`). Never call a generation tool directly. Credit caps
   apply. Read `generate-media` for the approval modes.
3. Start cheap: one pilot image at 1K before any set. Count every generation (see Step 5).
4. Look at every output before you show it: download it (`curl -L -o <file> <url>`), open it.
5. Match the user's language in chat. Ask only for facts the brief lacks, in one short question.
6. Use face photos only of the user or of people who agreed. No public figures, no other
   people's logos or branded characters. Keep real people's names out of prompts. Tell the user
   an uploaded photo gets a public link that lives about 24 hours.
7. A style-reference thumbnail is for you to look at. Never upload it or pass it as an input.

## Step 1: Intake

Collect only what the brief does not answer:

- The video's topic or title, and the truthful promise the thumbnail may imply.
- Exact scene requirements, if any.
- Who appears: 0 to 3 people. If the concept needs a person and no face photo was given, ask
  whether to use the user, another provided person, or a generic generated character. Never
  choose silently.
- Optional: a style-reference thumbnail (Step 2), a logo (flat or 3D), a headline of 2 to 4
  words (Step 6).
- Ratio: `16:9` for YouTube (default), `9:16` for Shorts, `4:5` for Instagram.
- One final concept or a set. If the person did not say and options would help, offer about four.

If the person gives only a number of emotions, use: shock, hype, rage, awe, laugh, fear, smug,
charisma, confusion, determination, disgust. Face phrases: [frameworks](references/frameworks.md).

## Step 2: Pick the concept

Read [frameworks](references/frameworks.md). Brainstorm at least five truthful concepts across
several frameworks, then pick the strongest information gap with one focal subject and little
clutter. Combine frameworks only if the result still reads in under one second at about 120 px
wide. Say the chosen concept in one or two lines.

If there is a style reference, open it and note its structure (fields in the reference file). It
gives art direction, never an identity. The user's instructions win field by field. If the user
wants a real screenshot from the video, extract a frame instead of generating (framework 4).

## Step 3: References and face consistency

1. Upload each local file with `upload_file`. Models need public URLs, so use the URL it returns.
   Under MCP, `upload_file` takes `file_base64` (a base64 string or data URL, up to 10 MiB);
   `file_path` works only in the CLI. Apps that support it can also use `upload_widget`.
   Uploads live about 24 hours: upload again in a later session.
2. Order the references: face photos first, in character order, then any product, then the logo.
   Put the URLs into `input_urls` in that order. GPT Image 2 takes up to 16. Use as few as you
   can: 1 or 2 sharp, well-lit, front-facing photos per person, at most 3 people.
3. With two or more references, the first line of the prompt is a manifest:
   `IMAGE REFERENCES: image 1 = CHARACTER 1 face reference; image 2 = brand logo.`
   Whether GPT Image 2 maps "image 1" correctly is unverified: the pilot shows it.
4. No face photo and no logo: use text-to-image and leave `input_urls` out. Every person with a
   photo gets an identity-lock block in the prompt (Step 4).
5. After each render, compare the face with the photos: bone structure, eye shape, nose, lips,
   jawline, skin tone, hairline, hair texture. If it drifts, try in this order: check that the
   manifest order matches `input_urls`; make the face larger, frontal and less busy; drop the
   logo from the render and add it later; state the identity lock again in fewer words. One
   change per retry.

## Step 4: Write the prompt

Write the prompt in English, each part one or two sentences, in this order:

1. **Frame.** `Bold, punchy, high-contrast composite, poster-grade, photoreal and high-impact,
   not a muted cinematic movie still, <ratio>, single unified frame, no split-screen, one
   continuous shot.` For `9:16` add `faces in the upper two-thirds`. A graphic concept swaps the
   photoreal words for a clean graphic brief.
2. **Scene brief.** The user's exact content, nothing added.
3. **Text.** Default: `No text, no readable UI labels, no watermark.` Only for baked text:
   `TEXT: bold thumbnail headline baked into the image, reading exactly "<TEXT>", massive,
   ultra-legible sans-serif with a clean outline, never covering the face. No other text, no
   watermark.`
4. **Subjects.** Large, in the foreground, chest-up or medium close-up, filling about 40 to 60% of
   the frame. End with `All faces crisply sharp as the anchors of the shot.`
5. **Key elements.** Only the props or effects that explain the information gap.
6. **Logo.** Preserve exact shapes, colors, proportions and letterforms. Keep it away from faces.
7. **Location.** Place, time, weather, atmosphere, when they matter.
8. **Composition.** One hero on a power third, clear scale hierarchy, depth, subject separated
   from background.
9. **Background.** A vivid, high-contrast color field or environment, soft vignette, undivided
   unless a split was requested.
10. **Lighting on people.** `Bright key light sculpting the face, soft fill lifting shadows,
    defined back light and hair light tracing a clean bright rim around hair, shoulders and
    silhouette.` Only the rim may take a color accent.
11. **Grade.** Vivid, bright, glossy, poster-punchy, deep blacks, crisp highlights, rich saturated
    color, one cohesive image. Go calmer only for an explicit calm, premium or muted brief.

For each person with a photo, add:

```text
CHARACTER N: the person from attached face reference #K. IDENTITY LOCK: reproduce this exact
person with a photographic identity match: same bone structure, eye shape, nose, lips, jawline,
skin tone, hairline and hair texture. Do not beautify, average or restyle the face.
Expression: <emotion phrase>.
```

Prompt habits:

- Be concrete and sensory. Say what to show ("tack sharp", "empty background") rather than what
  to avoid. The fixed no-text line in part 3 is the one exception.
- Split layouts only when the person asks for split, before/after, versus or side by side, or the
  style reference is split. "X vs Y" in a title does not need a split. The split contract and a
  full worked prompt are in [frameworks](references/frameworks.md).

## Step 5: Generate

Default model: GPT Image 2 (`gpt-image-2-text-to-image`, `gpt-image-2-image-to-image`), 6 / 10 /
16 credits at 1K / 2K / 4K. Second choice if it will not hold the face or the look:
`nano-banana-2`, 8 / 12 / 18 credits; read its `get_model_schema` first for the reference field
and limit. The plan's quote is the price to trust.

Settings for GPT Image 2:

- Set `aspect_ratio` yourself. `auto` only gives 1K. `16:9` and `9:16` work at 1K, 2K and 4K.
  `4:5` does not work at 2K. `1:1` cannot be 4K.
- There is no seed. A second run of the same prompt gives a different image, so a "retry" is a
  re-roll and a higher-resolution run of a winner is a new image.
- One image takes about a minute. The prompt limit is 20,000 characters.

Plan item for the hand-tuned tool (check `list_models` for its exact fields):

```json
{ "tool": "gpt_image_2", "args": { "prompt": "<prompt>", "input_urls": ["<face url>", "<logo url>"],
  "aspect_ratio": "16:9", "resolution": "1K" } }
```

If it refuses a field, use `run_model` with model `gpt-image-2-image-to-image` and the fields
from `get_model_schema`.

Order of work:

1. **Pilot.** One image, 1K, best concept. Check face, concept, text and small-size read
   (Step 7). Fix the prompt before spending on a set.
2. **Set.** Only if wanted: up to 4 images in one plan (a plan holds 1 to 6 items). Every item has
   its own prompt. Keep the references and settings the same and change one thing: the concept,
   the expression, or the camera take.
3. **Final.** Download the picks and read their pixel size (`magick identify <file>` or
   `sips -g pixelWidth -g pixelHeight <file>`). Aim for at least 1280x720. If the width is
   under 1280, upscale the chosen image locally (`sips -Z 1280`, ImageMagick
   `magick in.png -resize 1280x720 out.png`, or an ffmpeg scale) or with `topaz_upscale_image`
   through a plan. Skip 4K unless the person asks.

Hard caps for one thumbnail job:

- At most 16 generations in total, counting the pilot, set, retries, edits and any logo render.
- One re-roll of an unchanged prompt is fine for a random miss. After that, change one thing per
  attempt. Every re-roll is a new plan the person approves. After two failed attempts on the same
  item, stop and show the person what you have.
- Report `creditsConsumed` from `wait_for_task` as actual spend, not the quote.

Optional 3D logo: render it first as its own 2K `1:1` image, then use it as the last input
(recipe in [frameworks](references/frameworks.md)). It counts toward the 16 cap.

## Step 6: Headline text

Default to a clean image and a headline overlay added afterwards. It costs no credits, the
letters are exact, and you can try several wordings on one background.

| Situation | Do |
|---|---|
| The person wants a headline | Generate clean, then overlay: [text overlay](references/text-overlay.md). |
| No headline mentioned | Deliver clean. Offer the overlay in one line. |
| The person explicitly asks for text rendered by the model | Bake it in (part 3). Quote the exact text. Check it letter by letter. |
| Text is part of the scene (a sign, a chat bubble, a "DAY 30" badge) | Bake it in. Keep it short and true. |
| Long text, brand spellings, or a non-Latin script | Overlay, never baked. |

The overlay needs a browser that can screenshot a page, or ImageMagick. If neither exists, offer
the clean image or an approved baked-text regeneration. The deliverable is the flat PNG, opened
and checked, never an HTML preview.

## Step 7: Check at small size

Make a copy about 120 px wide and one about 320 px wide, and open both:

```bash
magick thumb.png -resize 120x small_120.png    # or: ffmpeg -i thumb.png -vf scale=120:-1 small_120.png
sips -Z 320 thumb.png --out small_320.png      # macOS
```

Pass only if all of these are true:

- Every referenced person visibly matches their photos.
- There is no stray text or watermark. Baked text matches the ordered text character for character.
- The face and its emotion, and the one hero element, are readable at 120 px.
- Any headline is readable at 120 px, off the face, and clear of the bottom-right corner, where
  YouTube shows the video length (general YouTube behavior, not tested here).
- The image truthfully matches the video promise.

If you cannot view images, do not claim a pass: hand the files over for review.

## Step 8: Tweaks

Only when the person asks to change a picked image. Use GPT Image 2 image-to-image with the
picked image (download it, look at it, then `upload_file` it) as the only `input_urls` entry and
a narrow prompt: what changes, and that everything else stays exactly the same (template in
[frameworks](references/frameworks.md)). Allowed scopes: expression only, background replacement
only, background recolor only, rim-light recolor only. Never silently regenerate the whole
composition. Compare with the original. If other parts changed, look for an editing model with
`search_models` (query "edit", task type "Image to Image") and read its `get_model_schema`. Each
edit counts toward the 16 cap.

## Deliver

For each passing image give: the downloaded file path, a short label such as
`shock / close-up`, the ratio, whether it is clean, overlay-ready or text-baked, and the credits
used. Save into the project's output folder with a clear name such as
`Topic_Shock_CloseUp_v1.png` (follow the project's own naming rules if it has any). Generated
results are kept 14 days, so download what you keep. Let the person pick before any tweak.
YouTube limits the thumbnail file size (2 MB, unverified): save a JPEG copy if the PNG is bigger.

## If something fails

| Symptom | Do |
|---|---|
| Face does not match | Step 3, point 5, then the retry rule in Step 5. |
| Stray text, garbled letters, watermark | Strengthen part 3. Move the headline to an overlay. |
| Prompt rejected or filtered | Reword. Remove public figures, brands, sexual content. Do not resubmit unchanged. |
| Body code `401` / `402` / `429` | Bad key / not enough credits (`get_balance`) / slow down and retry later. |
| "The API key is not authorized to use this model" | The user enables it at https://kie.ai/api-key. |
| Task seems stuck | `get_task_status` first. Resubmit only after it reports failure, because a resubmit is paid. |

## Reference files

- [frameworks](references/frameworks.md): 16 frameworks, split layouts, emotion phrases, a worked prompt.
- [text overlay](references/text-overlay.md): headline overlay (HTML page or ImageMagick), five styles, export.

## Sources

- Adapted from higgsfield-ai/skills, higgsfield-youtube-thumbnail/SKILL.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-youtube-thumbnail/references/thumbnail-frameworks.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-youtube-thumbnail/references/text-overlay-bake.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/prompt-engineering.md (MIT, Copyright (c) 2026 Higgsfield AI).
