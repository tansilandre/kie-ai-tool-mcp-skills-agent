---
name: product-photoshoot
description: >-
  Turn one or a few photos of a real product into e-commerce and ad images with kie.ai
  image-to-image models (GPT Image 2, Nano Banana): white-background packshots, lifestyle
  scenes, flat lays, detail close-ups, a person holding or wearing the product, seasonal
  and campaign scenes, marketplace listing sets, ad packs, hero banners, Pinterest pins,
  carousels and restyles. Keeps the product's shape, label, colors and logo faithful and
  checks every output against the original photo. Use when the user says "product photo",
  "packshot", "white background", "lifestyle shot", "flat lay", "marketplace listing
  images", "product ad", "model holding my product", "hero banner", "make this look like
  Christmas", or uploads a product photo and asks for images. NOT for images with no real
  product (use `image-prompts`, then `generate-media`), YouTube thumbnails (use
  `youtube-thumbnail`), or video from the photo (use `short-video` or `video-prompts`).
---

# Product photoshoot

Start from the person's real product photo and put it into new scenes. The product must stay
the same product: same shape, label, colors, logo. Everything else (background, light,
props, people) is yours to change.

Every generation spends credits. Run it through the plan workflow of the `generate-media`
skill: `prepare_media_generation` (free), the person's approval, `submit_media_generation`,
`wait_for_task`. Credit caps apply. Never call a paid tool directly.

## Rules

1. Image-to-image. Pass the real photo in `input_urls`. Without a photo you get "a product
   like yours", not their product: ask for the photo, and go text-only only if they accept
   that (see the text-only variant in the templates).
2. Pilot first. Make one image, check it, then run the rest of the set.
3. Open every output next to the input photo before you deliver it ("Check fidelity").
4. Do not ask the model to write headlines, prices, badges or claims in the image. Leave
   empty space and add the words afterward in a design tool.
5. Never guess a field name, price or limit. Read `get_model_schema` for the model you use.
   `get_model_status` shows price text and health.
6. Reply in the person's language. Write the image prompt in English.

## Workflow

Follow sections 1 to 9 in order: look at the photo, pick the mode, interview, write the
prompt, choose model and ratio, pilot, set, check fidelity, deliver. Per-mode details:
[modes](references/modes.md). Prompt templates: [templates](references/prompt-templates.md).

## 1. Look at the input photo

Open the photo. It should show the whole product, sharp, with the label readable, no heavy
glare, no hand over the label, no crop through the product. If it fails, ask for a better
photo.

Ask for extra views too: front, back, a label close-up, any side that will be visible in
the output. Two or three views of one product hold its shape better than one. GPT Image 2
takes up to 16 references. A side that no reference shows is invented by the model, so
tell the person when a requested angle is a guess.

Upload local files with `upload_file`; model inputs must be public URLs. Under MCP,
`upload_file` takes `file_base64` (a base64 string or data URL, up to 10 MiB); `file_path`
works only in the CLI. Apps that support it can also use `upload_widget`. Uploads live about
24 hours, so upload again if the URL is old. If the person gives only a product page link,
save the product image from it, check it, then upload.

Write the product string once, from looking at the photo, not from the person's words:
category, shape, size cues, material and finish, main colors, closure or parts, and the
label layout (where the logo sits, color blocks, how many text lines). Paste it unchanged
into every prompt of the set.

## 2. Pick the mode

| Mode | Use when the person wants |
|---|---|
| Packshot | Product on white or neutral studio background, catalog or clean e-commerce style |
| Lifestyle scene | Product in a real setting: kitchen, outdoor, cafe, gym, desk |
| Flat lay | Product and a few props seen from directly above |
| Detail close-up | One part in macro: cap, stitching, texture, label |
| Person with product | Hands or part of a face holding, applying or showing it |
| Model wearing or using | A person wearing the product: fashion, accessories, lookbook |
| Conceptual | Levitating, splash, frozen motion, surreal, sculptural |
| Restyle | An existing image in a new look or season, subject unchanged |
| Pinterest pin | Vertical 2:3 image with a mood |
| Hero banner | Wide website, email or campaign header |
| Carousel | 3 to 10 connected slides |
| Ad pack | Several coordinated static ad variants |
| Listing set | Main image plus secondary images for a marketplace listing |

Pick by intent, not by one keyword. When two modes fit, take the more specific:

- A platform or format beats the scene: "Pinterest pin of my product on a kitchen counter"
  is a pin. "Hero banner showing my product in use" is a hero banner. Multi-slide wins:
  "carousel of my product in different scenes" is a carousel.
- A specific genre beats a general one: "close-up of a person applying my serum" is person
  with product, not lifestyle.
- Changing an existing image without changing its subject is a restyle.

## 3. Interview

Ask only when the answer changes the result. If the request already answers it, do not ask.
At most 4 short questions in one message, with labelled options so the person can answer
with a letter. Say which option you will pick if they do not answer.

The three that usually matter:

1. Where will it be used? [Marketplace / Instagram / Pinterest / Ads / Website]. This sets
   the aspect ratio and how plain the background must be. For a marketplace, ask which one:
   its current image rules decide the main image. Do not quote them from memory.
2. What scene or style? [Clean studio / Lifestyle / Conceptual / With a model]
3. How many? [1 / 3 / 5]

Other gaps (no photo, restyle, model, vague request): [modes](references/modes.md#interview-by-request-type).

## 4. Write the prompt

Short labelled lines in this order. Fill only the lines that matter.

```
Use: / Scene: / Subject: (the product string) / Details: (one action only) /
Composition: / Style: / Lighting: / Text: (only if unavoidable) /
Constraints: (the keep clause) / Avoid: (named failures)
```

- Describe what changes. Do not re-describe the product at length: the product string plus
  the keep clause is enough.
- Put the keep clause in `Constraints` of every prompt. Without it the model re-draws the
  product and "improves" it. Wording and the other prompt rules are in
  [templates](references/prompt-templates.md#prompt-rules).
- Name light, lens, surface and material. Cut filler such as "stunning" or "8K".
- No negative-prompt field exists. Phrase positively; use `Avoid:` for named failures.
- Keep it about 90 to 150 words. Never cut the keep clause.

The templates are starting points, written from these rules and not tested across many
product types. Adjust them after the pilot.

## 5. Model, ratio, resolution

Default to GPT Image 2 image-to-image. Use Nano Banana 2 when GPT Image 2 cannot give the
ratio and resolution you need (4:5 at 2K, for example), or when it distorts the product
twice in a row and you want a second opinion (whether it keeps products better is untested).
Nano Banana 2 Lite is the cheapest way to try a scene idea; its fidelity is untested, so do
not use it for final images. Check `get_model_status` first.

| Model | Plan item | 1K / 2K / 4K credits |
|---|---|---|
| GPT Image 2 | `gpt_image_2`, or `run_model` with `gpt-image-2-image-to-image` | 6 / 10 / 16 |
| Nano Banana 2 | `nano_banana_image` with `model: "nano-banana-2"`, or `run_model` | 8 / 12 / 18 |
| Nano Banana 2 Lite | `nano_banana_image` with `model: "nano-banana-2-lite"` | 4 (1K only) |

The plan's own quote beats this table. GPT Image 2 plan item:

```json
{ "tool": "gpt_image_2", "args": { "prompt": "<from the templates>",
  "input_urls": ["https://.../front.jpg", "https://.../label.jpg"],
  "aspect_ratio": "1:1", "resolution": "1K" } }
```

The hand-tuned `gpt_image_2` tool takes all 16 ratios, as the catalog model does, and a
`background` field (`background: "transparent"` gives a cut-out packshot, 1K only). If it
refuses a field, use `run_model` with `gpt-image-2-image-to-image` and read `get_model_schema`.
Nano Banana's reference field in `nano_banana_image` is `image_input`; confirm it in the schema.

GPT Image 2 limits (verified):

- 2K does not support 5:4, 4:5, 3:1, 1:3, 9:21. 4K does not support 3:1, 1:3, 9:21. 1:1 cannot
  be 4K. `auto` only gives 1K, so set the ratio explicitly.
- No seed: the same prompt gives a different image each time, so a 2K re-run of a 1K pilot is
  a new image. A 1K 1:1 image is 1254 by 1254 pixels and takes about 60 seconds.

Usual ratios. Confirm with the person; the platform's current spec wins.

| Use | Ratio |
|---|---|
| Marketplace main image, square feed post | 1:1 |
| Instagram feed portrait | 4:5 (1K only on GPT Image 2; at 2K ask 3:4 and crop, or check Nano Banana 2's schema) |
| Story, Reel, TikTok | 9:16 |
| Pinterest | 2:3 |
| Website hero, email header, landscape ad | 16:9 or 21:9 |

Resolution: pilot at 1K. Use 2K where people zoom in (listings, ads), 4K only when asked.

## 6. Pilot, then the set

- Pilot: one item, the hardest or most important shot. Present the plan, wait for approval,
  submit, `wait_for_task`, download, check.
- Set: when the pilot passes, prepare one plan with the rest (a plan holds up to six items).
  Vary scene, angle, light and palette across them, or they come out as near-copies. Keep
  the product string, the keep clause and the style block identical.
- Untested tip: add the approved pilot as an extra reference ("match the lighting and color
  palette of image 3") to keep a set consistent. It may copy the composition too. Download the
  result, look at it, then `upload_file` it to use it as an input. Passing kie.ai result links
  straight in is not confirmed to work, and uploading also makes you look first.

## 7. Check fidelity

Download each result (`curl -L -o <file> <url>`). Open it next to the input photo, side by
side if you can, and compare with the photo, not with your memory of it. Zoom in on the label.

| Check | Fail looks like |
|---|---|
| Silhouette | Taller, wider, new proportions, rounded corners where the photo has sharp ones |
| Parts | Cap, pump, lid, handle, zipper or buttons changed, added or missing |
| Label layout | Logo moved, color blocks changed, text lines added or removed |
| Label text and logo | Garbled or new words, a redrawn or simplified mark |
| Color | Hue shifted, warmer or more saturated than the photo |
| Material | Glossy turned matte, clear turned opaque, texture changed |
| Count | Extra or missing items, a second product |
| Scale | Product too big or small next to hands or props |
| People | Extra or fused fingers, plastic skin, product merging into a hand |
| Background | Off-white tint where white was asked, stray props, shadows in two directions |

Small label text often garbles, most when the product is small in frame. Keep the product
large in frame and send a label close-up as a second reference.

## 8. When the product is wrong

Work down the list. Stop when it passes.

1. Name the exact thing that drifted in the keep clause ("the cap is flat, not domed").
2. Add a second reference (another angle or a label close-up) before adding adjectives.
3. Re-run once. A re-run is a new plan and a new spend: tell the person the cost.
4. Try Nano Banana 2 with the same references.
5. For a pixel-exact label: cut the product out of the real photo with a background-removal
   tool (`list_models` shows one; it also goes through the plan workflow) and place it on a
   generated empty scene in an image editor (that step is outside the toolkit).
6. Stop and say what the model cannot hold. Do not hand over a wrong product.

One re-roll of an unchanged prompt is fine for a random miss. After that, change one thing
per attempt. Every re-roll is a new plan the person approves. After two failed attempts on
the same item, stop and show the person what you have. A failed task is not retried
automatically: read the error with `get_task_status`, say what happened, change the prompt or
settings. Reword a content-filter rejection; do not retry it unchanged. Avoid real public
figures, sexual content and branded characters.

## 9. Deliver

- Give each file path and a short label ("Packshot, white, 1:1"). Results are kept 14 days:
  download everything the person keeps.
- State the credits used (`creditsConsumed` from `wait_for_task`).
- Say what still needs a design tool: headlines, prices, badges, pure-white fixes, exact
  platform crops. Do not paste the prompts back unless asked.

## Sources

- Adapted from higgsfield-ai/skills, higgsfield-product-photoshoot/SKILL.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/marketing-dtc-ads.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/prompt-engineering.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/media-inputs.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-marketplace-cards/SKILL.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-image-prompt/SKILL.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-image-prompt/references/templates.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-reference-sheets/SKILL.md (by Andre Tansil).
