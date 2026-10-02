---
name: image-prompts
description: >-
  Write and fix image prompts for kie.ai image models (GPT Image 2 first, then Nano Banana 2
  and Seedream) so the picture is right on the first try. Covers text-to-image, image-to-image
  edits with reference images, text rendered inside images, consistent characters, products
  and places through reference sheets (turnarounds, expression and hand sheets, location
  plates, product sheets), storyboard panels, and first and last frames for later video. Use
  when someone says "write the image prompt", "character sheet", "turnaround", "keep the same
  face", "edit this image but keep everything else", "add text to the image", "storyboard
  panel", "first frame", "why does the face look plastic", or when a generated image came out
  wrong. NOT for running, pricing or approving a generation (use generate-media), motion
  prompts (video-prompts), product photoshoot sets (product-photoshoot) or thumbnails
  (youtube-thumbnail).
---

# Image prompts

This skill is about what to put in the prompt. It does not spend credits. Every generation
goes through the plan workflow of the `generate-media` skill: `prepare_media_generation`
(free), the person's approval, `submit_media_generation`, then `wait_for_task`. Credit caps
apply. Never call a paid image tool any other way.

Order of work: say which kind of image this is (table below), pick a model and read its fields
with `get_model_schema`, write the prompt from the formula starting from a template, run one
cheap pilot, download and look at it, fix the prompt, then batch.

## Which image is this?

| Image | Path | References (`input_urls`) | Aspect |
|---|---|---|---|
| One-off picture | text-to-image | none | what the use needs |
| Character portrait (identity anchor) | text-to-image, or edit of a real photo the person gave you | none, or the photo | 3:4 |
| Turnaround, expression sheet, hand sheet | image-to-image | the portrait | 1:1 |
| Location plate or product sheet | text-to-image, or edit of a real photo | none, or the photo | video's ratio (plate), 1:1 (product) |
| Storyboard panel, first frame | image-to-image | the sheets this shot needs | the video's ratio |
| Last frame | image-to-image | the first frame | same as first frame |
| Edit (change one thing) | image-to-image | the image to edit | same as the original |

Read [reference sheets](references/reference-sheets.md) before you build a character, product
or place that must stay the same across images, and before you write storyboard panels or
first and last frames. Filled prompts for every row are in [templates](references/templates.md).
Start from the matching template. Do not write from a blank page.

## Which model

Start with GPT Image 2 at 1K, the model this skill is written for.

| Model id | Credits | Use it for |
|---|---|---|
| `gpt-image-2-text-to-image`, `gpt-image-2-image-to-image` | 6 at 1K, 10 at 2K, 16 at 4K | Default. Pilots, sheets, storyboard frames, edits with up to 16 references. |
| `nano-banana-2-lite` | 4 at 1K | The cheapest option. Drafts and throwaway tests. Up to 10 references. |
| `nano-banana-2` | 8 at 1K, 12 at 2K, 18 at 4K | A second opinion when GPT Image 2 keeps missing. Up to 14 references. |
| `google/nano-banana-edit` | 4 per image | The older edit model. Edits with up to 10 `image_urls`. |
| Seedream | find the id with `search_models` (query "seedream") | Faces and character sheets (see note). |

What each is good at. The GPT Image 2 notes come from the source skill's field notes. The rest
is Higgsfield's catalog text, not tested on kie.ai. Treat both as hints and pilot first.

- GPT Image 2: faces look plastic when the prompt asks for "photorealistic", every edit
  softens skin, and interiors lean warm and yellow. The fixes are below.
- Nano Banana 2: listed as the fast everyday model for character work, edits and cartoon or
  animated styles. Its Lite version is the budget variant.
- Seedream: Seedream 5.0 Pro is listed for faces, character sheets and complex scene edits
  with faces (up to 10 references on Higgsfield).
- Field names change between models. GPT Image 2 takes references in `input_urls`; Nano Banana 2
  and Lite (catalog or the hand-tuned `nano_banana_image`) take `image_input`; the older edit
  model takes `image_urls`. Never reuse a field name from another model.
- Check `get_model_status` first and avoid a degraded model. The formula below was tried on
  GPT Image 2. On another model, use the same labelled lines and judge the first result.

## GPT Image 2 limits

| Item | Value |
|---|---|
| `resolution` | `1K`, `2K`, `4K` (6 / 10 / 16 credits) |
| `aspect_ratio` | auto, 1:1, 3:2, 2:3, 4:3, 3:4, 5:4, 4:5, 16:9, 9:16, 2:1, 1:2, 3:1, 1:3, 21:9, 9:21 |
| 2K does not support | 5:4, 4:5, 3:1, 1:3, 9:21 |
| 4K does not support | 3:1, 1:3, 9:21, and 1:1 cannot be 4K |
| `auto` | only gives 1K |
| References | `input_urls`, up to 16, public URLs, image-to-image model only |
| Prompt length, size, time | up to 20,000 characters; a 1K 1:1 image is 1254x1254 and takes about 60 seconds |
| Not available | seed, negative-prompt field. `size`, `quality` and `output_format` do not exist. |

- One image per task. No seed: the same prompt gives a different image each time, so the
  files and prompts you save are the only record.
- Pick a supported ratio and resolution pair before you prepare the plan. 1K is enough for
  pilots, sheets and storyboard frames.

## The prompt formula

Write short labelled lines in this order. GPT Image 2 weighs earlier information more
heavily, and short labelled clauses work better than one long sentence. Fill only the lines
that matter and drop the rest.

```
Use: what the image is for (character reference, location plate, storyboard panel, poster...)
Scene: setting, background, environment
Subject: the main thing, with its locked description if it must match other images
Details: props, wardrobe, what someone is doing. One action only.
Composition: framing, camera height, lens (35 mm, 85 mm), angle, aspect in words
Style: phone photo, candid, documentary. Or the medium: watercolor, flat vector, 3D render, anime.
Lighting: direction, quality, time of day
Text: "exact words" (only if the image may contain text)
Constraints: what must stay unchanged, realism requirements
Avoid: what must not appear
```

- Be concrete and sensory. Delete "stunning, 8K, masterpiece, hyperrealistic, perfect,
  flawless, cinematic". Name the light, lens, setting and material instead.
- Say what you want in positive words first ("tack sharp", "an empty street"). Then use the
  `Avoid:` line for the specific failures of this image (extra fingers, a second person,
  garbled text, a different outfit). There is no negative-prompt field, so this line is the
  only place to say it. Do not write generic junk like "bad quality".
- One action per image, framed at its start, not at its climax.
- Keep prompts short: Higgsfield advises under about 200 tokens. The limit is 20,000
  characters, but longer is not better. Cut every template line that does not matter.
- Copy a locked description (a character, a place, a product) word for word into every
  prompt. Paraphrase is how a subject drifts.

## Realism

- Skin: "natural skin texture, visible pores, no beauty filter, no smoothing".
- Camera and light: "phone photo, candid, unposed, slight handheld feel", "soft natural
  daylight from the left", plus the time of day.
- Not the AI look: `Avoid: airbrushed skin, perfect symmetry, studio-perfect lighting,
  plastic texture, oversaturated colour`.
- Do not write "photorealistic" when a face is in frame. Say "35 mm film photo", "candid phone
  photo" or "editorial portrait, natural light".
- If a location goes yellow, name the white balance: "neutral daylight, about 5500 K".

## Image-to-image and references

- References go in `input_urls`. Inputs must be public URLs: use `upload_file` on a local
  file first. Under MCP, `upload_file` takes `file_base64` (a base64 string or data URL, up to
  10 MiB); `file_path` works only in the CLI. Apps that support it can also use `upload_widget`.
  An upload lives about 24 hours, so upload again for a later job.
- Describe what changes, not what is already in the image. "Transform into flat vector
  illustration" beats redescribing the picture and then adding the change.
- End every edit with a keep clause: list the change, then "keep everything else exactly the
  same: lighting, angle, walls, floor, every other object". Without it the whole image
  re-renders and drifts.
- Identity lock. When a face, product or place must survive, add a preservation clause or
  the model will "improve" it into someone else. Ready-made clauses for a face and a product
  are at the top of [templates](references/templates.md).
- Two anchors beat one. One reference drifts (rounder face, other jaw, thicker eyebrows) more
  often than two. Pass at least two views of the same subject when you have them. When a
  result drifts, add a second anchor before you add adjectives.
- Say what each reference is for ("the first image is the character, the second the room").
- Never pass a face through the model twice. Every edit softens skin. Regenerate from the
  original portrait instead of editing an edit.
- A real place or product starts from its real photo. Edit the photo. Never invent the
  building or the packaging when a photo exists.

## Text in images

Text rendering is the least certain part: one source warns of garbled glyphs, another rates
GPT Image 2 strong at layout and text. Neither is measured on kie.ai. Test it with a 1K pilot.

- Image that will become video: ask for no text ("no text, no signage, no logos") and add
  the words in the edit.
- Graphic where the text is the point (title card, poster, cover): use the `Text:` line. Put
  the exact words in quotes. Say where they sit, how big, what weight and colour, and what
  they sit on. Keep it to a few words. Add "no other text".
- Read the result letter by letter. If a word is wrong, change the prompt (shorter, bigger,
  simpler background) or add the text in post.
- Never ask for a readable logo or wordmark in text-to-image with no real reference or in a still
  for video: overlay the real one in post. With a real product photo, keep its logo and text.
- For 9:16, keep text out of the top 10% and the bottom 20% (platform buttons and captions sit there).

## Frames that become video

A bad start frame makes a bad video, and no video prompt fixes it. Full rules: [reference
sheets](references/reference-sheets.md#storyboard-panels-and-frames). In short: match the video's
aspect ratio; pick stills by light (one light logic per location), compared side by side; a
storyboard panel shows the shot's one action at its start; a last frame only where the end state
differs, describing only the change; in 9:16 keep faces and key subjects out of the top and bottom
10%. Write the motion prompt (`video-prompts`) after approval.

## Run it

1. `get_model_schema` for the model. Confirm the field names (for GPT Image 2: `prompt`,
   `aspect_ratio`, `resolution`, and `input_urls` on image-to-image).
2. Build the plan item. Use the hand-tuned `gpt_image_2` tool if `list_models` shows it covers
   the request. Otherwise use `run_model`:

   ```json
   { "tool": "run_model", "args": { "model": "gpt-image-2-image-to-image",
     "input": { "prompt": "...", "input_urls": ["https://.../portrait.png"],
                "aspect_ratio": "1:1", "resolution": "1K" } } }
   ```
3. `prepare_media_generation` takes one to six independent items. An item that needs another
   item's output (a turnaround needs the portrait) goes in a later plan, after you have looked
   at and uploaded the earlier result. Show the plan, get approval, submit, `wait_for_task`.
4. Download each result: `curl -L -o Name_v1.png <result_url>`. Save every take under its own
   version name with its prompt beside it. Results are kept 14 days. Download the result, look
   at it, then `upload_file` it to use it as an input. Passing kie.ai result links straight in
   is not confirmed to work, and uploading also makes you look first.

## Look at every image, then fix it

Download each image and open it before it is used again. Check identity (does the face match
the portrait?), hands, text and logos (garbled or invented lettering), wardrobe and props,
realism (smoothed, plastic skin), light (warm cast, two directions, a mismatch with other
frames) and frame (right aspect, no second person, safe zones in 9:16).

If it is wrong, change the prompt before you re-roll. Find the symptom:

| Symptom | Do this |
|---|---|
| Plastic face | Remove "photorealistic". Add "35 mm film photo" or "candid phone photo", "matte skin, visible pores, no retouching". |
| Face drifts between images | Add a second reference of the same person and the identity-lock clause. Repeat the locked description word for word. |
| Skin softer after an edit | Regenerate from the original portrait. Do not edit an edit. |
| Edit changed things you did not ask for | Add the keep clause. List one change only. |
| Yellow, warm interior | Name the white balance ("neutral daylight, about 5500 K"). |
| Extra or fused fingers | Add "exactly five fingers per hand" and build a hand sheet. Or reframe so hands hold something simple or sit out of frame. |
| Garbled text or logo | Remove the text and add it in post, or shorten and enlarge it. |
| Flat, wallpaper-like plate | Reshoot at a three-quarter angle with one anchor object. |
| A second person or object appears | Name it in `Avoid:`. Say "one person only" or "empty space, no people". |
| Sheet panels do not match, or carry captions | Say "identical lighting and scale across all panels", "no captions, no labels, no text". Anchor on the portrait. |
| Packaging changes shape | Edit the real product photo with the preservation clause. One view per generation. |
| Looks like AI | Delete the slop words. Name the light, the lens and the material. |

Failures from the service rather than the picture:

- A fast "500 Internal Error" that repeats on one prompt is usually kie.ai's content filter.
  Failed tasks have been charged 0. Reword the action; do not resend the same prompt.
  Examples: "selfie in the driver's seat with a phone" failed; "in a parked car, engine off"
  worked. "Woman filmed from behind walking away" failed; "a friend films her walking
  alongside; she turns to camera" worked.
- Higgsfield's docs name real public figures, sexual content, and trademarks or branded
  characters as the usual rejections. Avoid them.
- 401 is a bad key, 402 not enough credits, 429 slow down. "The API key is not authorized to
  use this model": the person enables it at https://kie.ai/api-key.

One re-roll of an unchanged prompt is fine for a random miss. After that, change one thing per
attempt. Every re-roll is a new plan the person approves. After two failed attempts on the same
item, stop and show the person what you have. Keep earlier takes, compare them, and pick the
best: a later take is not always better.

## Sources

- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-image-prompt/SKILL.md and references/templates.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-reference-sheets/SKILL.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-image/SKILL.md (by Andre Tansil).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/prompt-engineering.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/model-catalog.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/media-inputs.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/troubleshooting.md (MIT, Copyright (c) 2026 Higgsfield AI).
