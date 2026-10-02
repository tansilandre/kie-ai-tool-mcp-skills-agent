# Modes

Per-mode notes for the `product-photoshoot` skill. Prompts for each mode are in
[prompt-templates.md](prompt-templates.md). Ratios and counts below are usual starting
choices, not rules: the person's platform and the platform's current spec win.

4:5 works on GPT Image 2 at 1K only. For a 4:5 result at 2K, ask for 3:4 and crop, or read
Nano Banana 2's schema first.

Every mode starts from the real product photo in `input_urls`, uses the keep clause, and
adds no words to the image.

## Interview by request type

At most 4 short questions, in one message, with labelled options. Skip a question when the
request, the photo or an earlier answer already gives the answer. If the person answers
"you choose", take the first option and say what you took.

**A. Photo, "make me images" (no use named).**
1. How many? [1 / 3 / 5]
2. Style or mood? [Clean studio / Lifestyle / Conceptual / With a model / Other]
3. Where will you use them? [Marketplace / Instagram / Pinterest / Paid ads / Website hero]
4. Brand colors to match? Skip if the product or the person's brand makes it obvious.

**B. Photo and a named use ("ads", "a pin", "a hero banner").** The mode is known. Ask only
the gaps:
1. How many? (only for modes that make a set)
2. What is the offer, mood or hook?
3. Is there anything to emphasize? (a feature, a color, a size)

**C. No photo, text only.**
1. Can you upload a product photo? A real photo is far more faithful than a description.
2. If not: describe the product (category, packaging, color, standout features).
3. Which style? (same options as A)
4. Where will you use it?

Without a photo you get "a product like this", not the person's product. Say so before you
generate. Leave logos and label words out of the prompt and plan to add them afterward.

**D. Existing image, "redo it", "change the vibe", "make it Christmas".** Mode: restyle.
1. Which aesthetic? [Clean girl / Cottagecore / Quiet luxury / Dark academia / Y2K / Other]
2. Which season or occasion? [Christmas / Valentine's Day / Halloween / Black Friday /
   Ramadan and Eid / None]
3. What stays and what changes? Ask only if it is unclear.

**E. A person wearing the product.** Mode: model wearing or using.
1. What model look? Suggest 2 or 3 that fit the brand's audience.
2. Which setting? [Studio clean / Outdoor natural / Street style / Editorial / Home cozy]
3. Which framing? [Full body / Three-quarter / Waist up / Close-up on the product area]

**F. Vague ("make me something cool for my brand").**
1. What product or topic?
2. What is the goal? [Sell on a marketplace / Build awareness / Run paid ads / Update the website]
3. Can you upload a reference image?

Then continue with the matching type above.

## Packshot

- Use: product on white or neutral background for a catalog, a store page or a marketplace main image.
- Ratio and count: 1:1. Usually 1 hero, plus 2 or 3 angles if real angle photos exist.
- Prompt: seamless background, soft contact shadow, product centered and large in the frame,
  even soft light, neutral color balance.
- Watch for: a background that is off-white or grey instead of pure white (look at the
  corners); a hard shadow; changed proportions; a label that softened. If the platform needs
  exact pure white, say a levels fix or cutout is needed afterward. For a cut-out packshot, the
  `gpt_image_2` tool takes `background: "transparent"` (1K only).

## Lifestyle scene

- Use: product in a real setting that shows who uses it and when.
- Ratio and count: the platform's ratio. 3 different scenes make a good first set.
- Prompt: one scene, one light direction, one or two props that suit the product, the
  product in the sharpest, most prominent spot with its label toward the camera.
- Watch for: props that compete with the product, a second product appearing, the label
  turned away, two light directions.

## Flat lay

- Use: product plus a few related items on a surface, seen from straight above.
- Ratio and count: 1:1 or 4:5. 1 to 3 arrangements.
- Prompt: name the surface, the 3 to 5 supporting items and say they sit apart with space
  between them. State that the camera is directly overhead.
- Watch for: items overlapping the label, the product lying in a pose the photo never
  showed (its top or underside is invented), crowding.

## Detail close-up

- Use: one part of the product in macro: a cap, a zipper, stitching, a texture, a label.
- Ratio and count: 1:1 or 4:5. 1 to 3, one per feature.
- Prompt: name the part, say the part fills the frame, and say all detail must match the
  reference.
- Watch for: invented detail. A close-up asks the model to draw detail the photo may not
  show. Send a sharp photo of that part as a reference. Compare the detail with the photo.

## Person with product (hands, partial face)

- Use: a person holding, applying or showing the product: beauty, food, devices.
- Ratio and count: 4:5 or 9:16 for social. 2 or 3 variants (different action or crop).
- Prompt: crop tight (hands only, or lower face and hands). One action. Give the product's
  real size ("about 15 cm tall, held in one hand") if you know it. Real-skin words, not
  "photorealistic".
- Watch for: extra or fused fingers, the product merging into the hand, wrong scale, plastic
  skin. If the person supplies a photo of a real model, pass it as another reference and
  ask to keep the same person. Use only photos of people who agreed to it. Do not pass the same
  face through the model twice: regenerate from the original references instead.

## Model wearing or using

- Use: fashion, accessories, lookbook, any product that is worn.
- Ratio and count: 4:5 or 3:4 for fashion, 9:16 for stories. 2 to 4 (different framing or setting).
- Prompt: describe the model look and setting; say the model wears the exact item from
  the reference image. Choose framing: full body, three-quarter, waist up, or close-up on the
  product area. Keep other clothes plain so they do not compete.
- Watch for: print, pattern, logo placement, seams, buttons and fit changing; the item
  turning into a similar one. Compare against the photo at full size.

## Conceptual (levitating, splash, surreal)

- Use: a bold campaign image: the product floating, in a splash, in frozen motion, or on a
  sculptural set.
- Ratio and count: 4:5, 9:16 or 16:9. 1 to 3 concepts.
- Prompt: say what the effect is and that it stays around the product, never over the label.
  Plain colored backdrop in the brand's palette keeps the product readable.
- Watch for: liquid or particles covering the label, the product bending or melting, a
  changed shape. These are the most likely modes to lose the label.

## Restyle and seasonal

- Use: take an existing image and change its look or season: a new aesthetic, a holiday,
  a sale campaign.
- Ratio and count: same as the source image. 1 per aesthetic or season.
- Prompt: pass the existing image as the reference. State only what changes (aesthetic,
  palette, props, light). State what stays: the product, and the composition if it should
  stay. End with "keep everything else exactly the same".
- Aesthetic examples: clean girl, cottagecore, quiet luxury, dark academia, Y2K.
- Season examples: Christmas, Valentine's Day, Halloween, Black Friday, Ramadan and Eid,
  back to school.
- Watch for: the product itself being restyled (new colors, new label); props covering the
  product; text appearing on seasonal props ("Merry Christmas" banners).

## Pinterest pin

- Use: vertical, mood-led image for Pinterest.
- Ratio and count: 2:3. 1 to 3.
- Prompt: a mood scene, product in the lower-middle, calm empty space in the top third for a
  headline added later.
- Watch for: a busy scene that buries the product; text in the image.

## Hero banner

- Use: wide header for a website, email or campaign.
- Ratio and count: 16:9 or 21:9 (wider ratios such as 3:1 are 1K only on GPT Image 2). 1 to 2.
- Prompt: product on one side, a calm uncluttered area on the other (about 40% of the width)
  for a headline and button added later. Say which side.
- Watch for: the product pushed to the edge or cropped; the copy area filled with props.

## Carousel (3 to 10 slides)

- Use: connected slides for Instagram, LinkedIn or Facebook.
- Ratio and count: 4:5 or 1:1. Count is the number of slides.
- Prompt: write one style block (palette, light, surfaces, lens look, mood) and paste it
  unchanged into every slide. Give each slide one job, for example: 1 hook with the product
  large, 2 a detail, 3 the product in use, 4 a benefit scene, 5 empty space for a call to
  action. Each slide is its own plan item and its own generation. A plan holds at most 6 items,
  so 7 to 10 slides need two plans.
- Watch for: the set drifting in palette or light between slides; the product changing between
  slides. Check all slides together, laid out in a row.

## Ad pack

- Use: several coordinated static ads for Meta, TikTok, Pinterest or Google Ads.
- Ratio and count: set by the placements (for example 1:1 and 9:16). 3 to 6 variants.
- Ask for the offer, the audience and the hook first. Do not put them in the image: the
  copy goes in afterward.
- Prompt: one style block for the whole pack. Vary scene, angle, light and palette accent
  between variants, or you get near-copies. Leave deliberate empty space for the copy.
  Layout ideas the copy can use:
  - Headline: large calm area above or below the product.
  - Bullet callouts: product centered, clear space on both sides.
  - Us versus them: split frame, the product on one side and a plain unbranded generic
    item on the other. Never a competitor's real product or logo.
- Watch for: variants that look the same; the product different between ads.

## Listing set (marketplace)

- Use: images for a product listing on a marketplace.
- Ask which marketplace. Its current image rules decide the main image (background, how the
  product fills the frame, what may appear). Do not state rules from memory; ask the person
  to check or paste them.
- A usual set (confirm what the person wants):

  | Image | Mode | Note |
  |---|---|---|
  | Main image | Packshot | The plainest image; follows the platform rules |
  | Multi-angle | Packshot | Only as faithful as the angle photos you have; an unseen side is invented |
  | Detail | Detail close-up | One feature per image |
  | Lifestyle | Lifestyle scene | Shows use and scale |
  | What is in the box | Flat lay | Needs a photo of every item, passed as references |
  | Infographic base | Packshot with empty space | The text and icons go in afterward in a design tool |

- Ratio: 1:1 unless the platform says otherwise. Resolution: 2K if buyers zoom in.
- Pilot the main image first. Reuse its product string and style for the rest.
- Wider content blocks (a banner, a features block, a how-to-use block) are hero-banner
  images with empty space. The words are added afterward.
