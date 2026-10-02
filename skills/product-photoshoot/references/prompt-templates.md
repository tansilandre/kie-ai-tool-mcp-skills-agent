# Prompt templates

Prompt rules and starting-point templates for the `product-photoshoot` skill. They are
written for GPT Image 2 image-to-image (`input_urls` holds the product photos). The same
layout is a reasonable first try on Nano Banana, but it has not been checked there.

These are starting points. They were written from the prompt rules below, not tuned against
a wide range of products. Run one pilot, look at it next to the photo, then adjust.

Replace everything in angle brackets. Keep every other line unless the pilot shows a reason
to change it.

## Prompt rules

**Order.** Use short labelled lines in this order: `Use`, `Scene`, `Subject`, `Details`,
`Composition`, `Style`, `Lighting`, `Text`, `Constraints`, `Avoid`. Earlier lines weigh more,
and short lines work better than one long sentence. Drop lines that do not matter.

**Describe the change, not the photo.** In image-to-image the model already sees the product.
Say what is different: the scene, the light, the framing. Do not re-describe the product at
length. Weak: "a white bottle with a green label, shown on a kitchen counter". Better: "the
product from image 1, standing on a sunlit kitchen counter" plus the keep clause.

**Keep clause.** Every prompt has one in `Constraints`. Without it the model re-draws and
"improves" the product.

**Two anchors beat one.** One reference drifts more than two. Pass a second view (another
angle or a label close-up) before adding more adjectives to a prompt that drifted.

**Name each image.** With more than one reference, say what each is: "Image 1: front of the
pack. Image 2: close-up of the label." Whether the model follows this order is untested, so
check the first result.

**Text.** Do not ask for readable words the photo does not carry: no headlines, prices,
badges, claims. Text rendering is unreliable. If a word must appear, put it in quotes on a
`Text:` line, keep it to a few words, and check the spelling. Otherwise add the words
afterward.

**Positive phrasing.** There is no negative-prompt field. Write "tack sharp" instead of "no
blur", and "empty surface" instead of "no props". Use the `Avoid:` line for named failures
of this shot (a hidden label, extra fingers, a second product), not "bad quality".

**Words to cut.** "Stunning", "8K", "masterpiece", "hyperrealistic", "perfect", "flawless",
"cinematic". Name the light, the lens, the surface and the material instead.

**Real light and real camera.** Say where the light comes from and the time of day ("soft
window daylight from the left", "hard sun at 4 pm"). GPT Image 2 tends to skew warm and
yellow on scenes, so for product colors add "neutral daylight, about 5500 K, true product
colors" and compare with the photo.

**People.** When a face is in frame, do not write "photorealistic". Write "35 mm film photo,
candid editorial photograph, natural skin texture, visible pores, matte skin, no
retouching". Every edit softens skin, so never edit an edit: regenerate from the original
references. Ask for "exactly five fingers on each hand". Avoid real public figures.

**Length.** About 90 to 150 words. The limit on kie.ai is 20,000 characters, but long
prompts wander. The keep clause is the one part you never cut.

**One light logic.** One light direction per image, and the same one across a set.

## Building blocks

**PRODUCT STRING.** Write it once from the photo. Include category, shape, size cues,
material and finish, colors, parts, label layout. Describe the label by layout (where the
logo sits, color blocks, number of text lines), not by quoting its words. If the brand name
is short you may quote it, then check it. Example:

```
a 250 ml matte white pump bottle, black round pump head, a sage-green wraparound label with
a small leaf logo above two lines of black text, a clear ring at the neck
```

**KEEP clause.** Full version, for the pilot and for any prompt after a drift:

```
Keep the product exactly as in the reference photo: same shape and proportions, same
material and finish, same colors, same label layout and artwork, same logo, same text, same
closure. Do not redesign, recolor, simplify or restyle it. Do not add, remove or move any
print on it.
```

Short version, for later images of a set once the full one has held:

```
Keep the product exactly as in the reference photo. Change only what is named above.
```

**STYLE BLOCK.** For a set (carousel, ad pack, listing set), write it once and paste it
unchanged into every prompt:

```
Visual system: warm off-white and sage palette, soft diffused daylight from the left,
matte linen surfaces, 50 mm lens look, shallow depth of field, calm minimal composition.
```

**SCALE line.** When a hand or a prop is in frame and you know the size:

```
The product is about <15 cm> tall and sits in the hand at that scale.
```

## 1. Packshot on white

```
Use: e-commerce packshot of the product in image 1.
Scene: seamless pure white background, a soft contact shadow under the product, nothing
else in frame.
Subject: <PRODUCT STRING>, standing upright, front facing the camera.
Composition: centered, straight-on at the product's mid-height, product large in the frame
with an even margin all around.
Style: clean commercial catalog photograph.
Lighting: large soft light from the front left, gentle fill from the right, neutral
daylight color balance, true product colors.
Constraints: <KEEP>
Avoid: props, reflections of other objects, a tinted background, extra products, added text
or badges, a warped or blurred label.
```

## 2. Lifestyle scene

```
Use: lifestyle photo for <platform> showing the product from image 1 in its natural setting.
Scene: <one setting, e.g. a sunlit kitchen counter with a wooden board and a glass of water,
soft blurred background>.
Subject: <PRODUCT STRING>, placed <where, e.g. in the front third of the counter, label
facing the camera>.
Details: <one or two props that suit the product and do not compete with it>.
Composition: <eye level or slightly above>, product in the <lower left third>, <ratio> frame.
Style: natural lifestyle photograph, candid, 50 mm lens look.
Lighting: soft window daylight from the left, <time of day>, neutral color balance.
Constraints: <KEEP> The product is the sharpest and most prominent object.
Avoid: a second product, people, readable text on props, clutter, a hidden or turned-away
label.
```

## 3. Flat lay

```
Use: flat-lay photo of the product from image 1 with a few related items.
Scene: <surface: pale linen / light oak / terrazzo>, seen straight from above.
Subject: <PRODUCT STRING>, <lying flat / standing, as in the reference>.
Details: <3 to 5 supporting items>, arranged apart with clear space between them.
Composition: camera directly overhead, product slightly off-center, items balanced around it.
Style: tidy editorial flat lay photograph.
Lighting: soft diffused daylight from the top left, gentle shadows.
Constraints: <KEEP> The label is fully visible and not covered by any item.
Avoid: overlapping items, items on top of the label, a second product, readable text on props.
```

## 4. Detail close-up

```
Use: detail close-up of the <part: cap / zipper / stitching / label / texture> of the product
in image 1. Image 2 is a close-up photo of that part.
Scene: <soft blurred background in the product's palette>.
Subject: <PRODUCT STRING>, cropped so only the <part> and its surroundings are visible.
Composition: macro framing, the <part> fills the frame, <camera angle>.
Style: sharp macro product photograph, shallow depth of field.
Lighting: soft side light from the left that shows the material and texture.
Constraints: <KEEP> Every detail of the <part> matches the reference exactly.
Avoid: invented details, text or marks that are not in the reference, a different material.
```

## 5. Person with product (hands, partial face)

```
Use: close-up of a person <holding / applying / showing> the product from image 1.
Scene: <setting in one line, e.g. a bright bathroom with a pale stone sink>.
Subject: <person: age range, skin tone, hair, or "hands only">, <one action, e.g. holding the
product at chest height with the label toward the camera>. <PRODUCT STRING>. <SCALE line>
Composition: tight crop, <hands only / lower face and hands>, product sharp and in the
foreground.
Style: candid editorial photograph, 35 mm film look, natural skin texture, visible pores,
matte skin, no retouching.
Lighting: soft daylight from the left, neutral color balance.
Constraints: <KEEP> Exactly five fingers on each hand, fingers wrapped naturally around the
product, natural proportions.
Avoid: extra or fused fingers, the product merging into the hand, wrong scale, beauty-filter
skin, a second product.
```

## 6. Model wearing or using

```
Use: fashion photo of a model wearing the item in image 1.
Scene: <setting: clean studio / outdoor natural / street / home>.
Subject: <model look: age range, build, hair, skin tone> wearing <PRODUCT STRING> exactly as
in the reference photo, <pose, e.g. standing relaxed, weight on one leg>.
Details: other clothing plain and neutral so the item stands out.
Composition: <full body / three-quarter / waist up / close-up on the product area>, <ratio>
frame.
Style: editorial photograph, 35 mm film look, natural skin texture, no retouching.
Lighting: <soft daylight from the left / overcast / studio softbox>, neutral color balance.
Constraints: <KEEP> Same print, pattern, seams, buttons, logo placement and fit as the
reference.
Avoid: a changed print or logo, a similar but different garment, extra fingers, a second
person.
```

## 7. Conceptual (levitating, splash, surreal)

```
Use: conceptual advertising image of the product from image 1.
Scene: <plain seamless backdrop in <brand color>, or a minimal surreal set>.
Subject: <PRODUCT STRING>, <levitating above the ground, tilted about 30 degrees, label
toward the camera>.
Details: <effect, e.g. a ring of water frozen mid-air around the product, fruit slices
orbiting it>. The effect stays around the product and never covers the label.
Composition: product centered and large, <ratio> frame, room around it.
Style: high-end product campaign photograph, crisp frozen motion.
Lighting: <hard rim light from behind and a soft front fill>, true product colors.
Constraints: <KEEP> The label is fully visible and dry.
Avoid: liquid or particles on the label, the product bending or melting, a changed shape.
```

## 8. Restyle and seasonal

Pass the existing image as image 1. Describe only the change.

```
Use: restyle of the image in image 1.
Change: <aesthetic or season, e.g. quiet luxury: warm neutral palette, soft shadows, a stone
surface / Christmas: red and green accents, pine branches, warm string lights out of focus>.
Lighting: <new mood, e.g. warm low evening light from the left>.
Constraints: <KEEP> Keep <the composition / the camera angle / the person> the same. Keep
everything else exactly the same: the product, its position, its size.
Avoid: changing the product's colors or label, words on props or banners, new people.
```

## 9. Pinterest pin

```
Use: airy vertical lifestyle-style image with a mood, featuring the product from image 1.
Scene: <mood scene, e.g. a cottagecore morning table with linen, dried flowers and a ceramic
cup>.
Subject: <PRODUCT STRING>, <where it sits>.
Composition: 2:3 vertical, product in the lower middle, a calm empty area in the top third
for a headline added later.
Style: soft editorial photograph, natural and unstaged.
Lighting: soft morning daylight from the left, warm but neutral.
Constraints: <KEEP>
Avoid: text in the image, a busy scene that buries the product, a second product.
```

## 10. Hero banner

```
Use: wide website hero image featuring the product from image 1.
Scene: <setting or plain backdrop in the brand palette>.
Subject: <PRODUCT STRING>, on the <right> third of the frame.
Composition: wide <16:9 / 21:9> frame. The <left> 40 percent is a calm, uncluttered area for a
headline and a button added later.
Style: clean campaign photograph.
Lighting: <direction and quality>, neutral color balance.
Constraints: <KEEP> The product is whole and not cropped by the frame.
Avoid: props in the empty area, text in the image, the product pushed against the edge.
```

## 11. Carousel slide

One plan item per slide. Paste the same STYLE BLOCK into every slide. Give each slide one job.

```
Use: slide <n> of <total> in a carousel about the product from image 1. Job: <hook / detail /
in use / benefit scene / space for a call to action>.
Scene: <this slide's scene>.
Subject: <PRODUCT STRING>.
Composition: <this slide's framing>, <ratio> frame.
<STYLE BLOCK>
Constraints: <KEEP>
Avoid: text in the image, a different palette or light from the style block, a second product.
```

## 12. Ad variant

One plan item per variant. Same STYLE BLOCK in all of them. Change the scene, angle, light
or palette accent between variants.

```
Use: static ad image for <placement> featuring the product from image 1.
Scene: <this variant's scene>.
Subject: <PRODUCT STRING>.
Composition: <layout: large calm area above the product for a headline / product centered
with clear space on both sides for callouts / split frame, product on the left and a plain
unbranded generic item on the right>, <ratio> frame.
<STYLE BLOCK>
Lighting: <this variant's light>.
Constraints: <KEEP>
Avoid: any text in the image, a competitor's product or logo, a second branded product.
```

## 13. Listing set images

Main image: use template 1. Secondary images:

- Multi-angle: template 1 with "<side/back/three-quarter> view". Pass a real photo of that
  side as a reference. If you have none, the side is invented: say so.
- Detail: template 4.
- Lifestyle: template 2.
- What is in the box: template 3, with a photo of every item passed as a reference and the
  line "Image <n>: <item>" for each.
- Infographic base: template 1 with "the product on the left, plain empty space on the
  right for text added later".

## Repair prompts

When one thing is wrong in an otherwise good result, pass the good result (downloaded, looked
at, then uploaded with `upload_file`) and the original photo, and describe only the fix:

```
Use: correction of image 1. Image 2 is the original product photo.
Change: <only the fix, e.g. restore the label layout to match image 2 / make the cap flat
as in image 2 / fix the right hand to five natural fingers>.
Constraints: Keep everything else exactly the same: the scene, the light, the angle, every
other object. <KEEP>
```

A repair counts as one attempt: change one thing per attempt, and after two failed attempts
on the same item, stop and show the person what you have. If the fix is on a face or skin, do
not edit the result: regenerate from the original references instead (every edit softens
skin). If it drifts again, go back to the original prompt and add a second reference, as in
the "When the product is wrong" list in SKILL.md.

## Text-only variant (no product photo)

Use only when the person has no photo and accepts the result is a product like theirs, not
theirs. Use text-to-image (`gpt-image-2-text-to-image`). Take any template above and:

- Replace `Subject` with the person's description, in the same style as a product string.
- Drop the keep clause and "image 1" mentions.
- Leave all logos and label words out. Add `Avoid: logos, brand names, readable text.`
- Plan to add the real label in a design tool afterward.
