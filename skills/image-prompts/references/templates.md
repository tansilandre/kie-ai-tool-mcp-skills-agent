# Image prompt templates

Eleven templates, one per image type. Each follows the formula in [SKILL.md](../SKILL.md). Replace
the bracketed parts and keep every other line. Cut a line when it does not matter for the image.
These were written for GPT Image 2. They are a starting point, not a guarantee: pilot one image
at 1K and look at it.

Sheet and frame templates also say how to build the plan item. References always go in the
image-to-image model's `input_urls`; confirm the field with `get_model_schema`.

## Locked descriptions and clauses

A **locked description** is a short paragraph you write once for a character, a place or a
product, and then paste word for word into every prompt that shows it. Never paraphrase it.

- `<LOCKED CHARACTER>`: age, build, face shape, features with their small imperfections (a scar,
  freckles, an asymmetry), hair, skin tone, base outfit. Example (made up): "a woman in her late
  20s, round face, small scar above the left eyebrow, shoulder-length wavy black hair, warm
  medium-brown skin with a few freckles across the nose, wearing a mustard cardigan over a
  white tee".
- `<LOCKED PLACE>`: what the space is, materials, colours, two to four fixed objects, light
  direction and time of day.
- `<LOCKED PRODUCT>`: shape, material, colours, label layout, size relative to a hand. Say
  "no readable brand wordmark" when there is no real photo, unless the text is the point. With a
  real photo, the logo and text stay as in the photo.

**Face preservation clause** (image-to-image, whenever a face must survive):

```
Keep the same face, the same facial bone structure, the same eye shape, the same nose, the same
lips, the same skin tone and texture, the same hair, and the same age. The face must match the
reference images exactly: same jawline, same eyebrow thickness, same eye size and shape. It must
read as the identical person, not a similar-looking model. Do not retouch, smooth, or beautify
the face.
```

**Product preservation clause:**

```
Keep the exact same shape, material and label layout. Do not change the packaging. Change only
<the background / the lighting / the surface>.
```

**Keep clause** (any edit):

```
Keep everything else exactly the same: lighting, camera angle, walls, floor, every other object.
```

## 1. Character portrait (text-to-image, the identity origin)

The image every later view is built from. It is the origin, so there is nothing to run
image-to-image against yet. If the person gave you a real photo, edit that photo instead and use
the face preservation clause. Aspect `3:4`. References: none.

```
Use: character reference portrait, the identity anchor for every later image of this person.
Scene: plain flat light-grey seamless background, no props.
Subject: <LOCKED CHARACTER>, neutral relaxed expression, facing camera, standing.
Details: wearing <base outfit>.
Composition: waist-up portrait, centred, eye level, chest-height camera.
Style: phone photo, candid, unposed, looks like a real phone photo.
Lighting: soft natural daylight from the left.
Constraints: natural skin texture, visible pores, no beauty filter, no smoothing.
Avoid: studio-perfect symmetry, airbrushed skin, jewellery or wardrobe not listed above, text, logos.
```

## 2. Turnaround, 2x2 (image-to-image from the portrait)

One image with four panels, made together so the face and wardrobe stay consistent between
angles. That is more reliable than four separate generations. References: the portrait. Aspect `1:1`.

```
Use: character turnaround sheet, four consistent angles of the same person.
Scene: same plain flat light-grey seamless background as the reference, repeated in all 4 panels.
Subject: <LOCKED CHARACTER>, same as the reference image exactly.
Details: a clean 2x2 grid of four panels: top-left front view, top-right three-quarter view
(head turned 45 degrees), bottom-left full profile facing left, bottom-right back view. Equal
size panels, thin crisp white gaps, no captions, no labels, no text anywhere.
Composition: same scale and eye line across all four panels.
Style: phone photo, candid.
Lighting: soft natural daylight from the left, identical across all 4 panels.
Constraints: <face preservation clause>
Avoid: a different outfit or hairstyle in any panel, panel borders, frames or numbers, mismatched lighting between panels.
```

## 3. Expression sheet (image-to-image from the portrait)

Build it only if the storyboard needs emotions the neutral portrait does not cover. Use fewer
panels if you need two or three expressions. References: the portrait. Aspect `1:1`.

```
Use: character expression sheet for storyboard reference.
Scene: same plain background as the reference.
Subject: <LOCKED CHARACTER>, same as the reference image exactly, front-facing in every panel.
Details: a clean 2x2 grid: [surprised, eyebrows raised] / [amused, slight smile] / [concerned,
brow slightly furrowed] / [neutral, relaxed]. Replace these with the expressions this project
needs. Equal size panels, thin white gaps, no labels.
Composition: same framing and scale as the reference in every panel.
Style: phone photo, candid.
Lighting: identical to the reference.
Constraints: keep the same face, hair and wardrobe as the reference in all 4 panels. <face preservation clause>
Avoid: exaggerated cartoon expressions, a different person emerging in any panel.
```

## 4. Hand sheet (image-to-image from the portrait)

Fused fingers and extra digits are the most common failure, and a bad hand in a still gets worse
once it is animated. Build this whenever a shot has a hand holding, lifting or gesturing.
References: the portrait. Aspect `1:1`.

```
Use: hand reference sheet. Check every hand-bearing frame against this before approving it.
Scene: same plain background as the reference.
Subject: <LOCKED CHARACTER>'s hand and forearm only, same skin tone and any visible accessories
(rings, bracelets) as the reference.
Details: a clean 2x2 grid: open palm facing camera / holding a phone naturally / relaxed at the
side / both hands loosely clasped. Equal size panels, thin white gaps, no labels.
Composition: the hand fills most of each panel.
Style: phone photo, candid, close-up.
Lighting: identical to the reference, soft natural daylight.
Constraints: exactly five fingers per hand, natural proportions, natural skin texture.
Avoid: extra or fused fingers, unnatural bends, objects merging into the hand.
```

## 5. Location plate (text-to-image, or image-to-image from a real photo)

The environment anchor. Make it empty: a person in the plate competes with the character's
identity. Match the camera angle the shots will use, at a three-quarter angle rather than straight
on. Aspect: the video's ratio (for example `9:16`). References: none, or the real photo.

```
Use: empty location plate, the environment anchor for every shot in this scene.
Scene: <LOCKED PLACE>.
Subject: the space itself, empty, no people.
Details: <2-4 specific objects that make the place look lived in>, one distinctive anchor object in view.
Composition: <camera height and angle matching the storyboard>, three-quarter angle, vertical.
Style: phone photo, candid, looks like a real phone photo.
Lighting: <direction, time of day> matching the locked place, neutral daylight about 5500 K.
Constraints: no people, no legible text, no signage.
Avoid: clutter, brand logos, screens showing content, a person entering the frame, a straight-on symmetric view.
```

From a real photo, replace `Subject` and `Details` with: "Keep the exact same room, same furniture
layout, same wall colour. Change only <what is changing>." then the keep clause.

## 6. Product sheet (text-to-image, or image-to-image from a real product photo)

Packaging accuracy is all or nothing: a bottle that reshapes between images makes the video
unusable. One view per generation (flat on a surface, held in a hand, or in use). Aspect `1:1`.

```
Use: product reference sheet, the packaging accuracy anchor.
Scene: plain light wood surface or plain background, no props competing for attention.
Subject: <LOCKED PRODUCT>.
Details: <front, flat on the surface | held in a hand | in use>. Pick one.
Composition: chest-height looking down, the product fills most of the frame.
Style: phone photo, candid, looks like a real phone photo.
Lighting: soft natural daylight from the left.
Constraints: exact packaging shape and label layout as described, no readable brand wordmark
(the real logo is overlaid in post).
Avoid: invented brand text, a different bottle or box shape than described, a second product.
```

With a real photo: image-to-image, reference the photo, add the product preservation clause and
drop "no readable brand wordmark": the logo and text stay as in the photo.

## 7. Storyboard panel (image-to-image from the sheets)

The video model's starting frame for one shot. References: the sheets this shot needs (portrait
and turnaround for the person, the plate for the place, the product sheet for the product).
Aspect: the video's ratio.

```
Use: storyboard panel, the video model's starting frame for this shot.
Scene: <LOCKED PLACE>.
Subject: <LOCKED CHARACTER>, if a person is in this shot.
Details: this shot's one action framed at its START, not its climax, for example "hand entering
the frame toward the product, product still on the desk".
Composition: <shot size and camera position: selfie / chest height / eye level / desk level>,
vertical, with headroom for the movement the shot will make. Keep faces and key subjects out of
the top and bottom 10%.
Style: phone photo, candid, looks like a real phone video still.
Lighting: <direction>, matching the place and the other shots in the scene.
Constraints: natural skin texture, visible pores, no beauty filter. Wardrobe and props match the
sheets. <face preservation clause>
Avoid: the action already completed, a second person, legible text, mirror reflections.
```

Name each reference's role in the prompt: "the first image is the character, the second is the room".

## 8. First frame

Two paths:

- Reuse the storyboard panel as is. It costs nothing. This is the default when the panel's
  framing is already the video's starting point.
- A separate image only when the first frame needs different framing or more precision (the panel
  proved the composition but drifted on a hand or a product angle). Write it like a storyboard
  panel. References: the panel plus the sheet that needs correcting. Describe only what changes:
  "same as the reference, but fix the right hand to match the hand sheet."

## 9. Last frame (image-to-image from the first frame)

Only when the end state differs from the start (a camera move, a reveal, a transition). Skip it
for a static shot. References: the first frame. Describe only the change.

```
Use: last frame, the end state of this shot's motion.
Scene: same as the reference image, unchanged.
Subject: same as the reference image, unchanged.
Details: <only what has moved or changed by the end, e.g. "she has turned fully to face the
camera" or "the bottle is now upright and open">.
Composition: same framing as the reference, unless the shot is a push-in or pull-out. Then state
the new framing.
Style: same as the reference.
Lighting: same as the reference.
Constraints: keep everything else (face, wardrobe, background, lighting) identical to the reference.
Avoid: new objects or people, changing anything not named in Details.
```

For continuity across a cut, give the next shot's first frame this last frame as a reference.

## 10. Edit one thing (image-to-image)

Describe the change, not the whole picture. References: the image to edit. Same aspect as the
original. For a face edit, never edit an edit: go back to the original portrait.

```
Use: edit of the reference image.
Change: <the one change, e.g. "replace the grey sofa with a green velvet sofa">.
Keep: everything else exactly the same: lighting, camera angle, walls, floor, every other object.
<face preservation clause, if a person is in the image>
Avoid: <anything the change might drag in, e.g. "a different room layout, new people, text">.
```

For a style change, say only the style: "transform into flat vector illustration, vibrant colours,
soft shading", and keep the clause if the content must not move.

## 11. Text inside the image (a graphic where the words are the point)

Unproven on kie.ai: pilot one 1K image and read every letter. Do not use this for stills that
will become video. Keep the text to a few words.

```
Use: title card, vertical poster.
Scene: plain dark teal background with a little grain, nothing else.
Subject: one line of text in the centre.
Text: "NIGHT MARKET" in large bold sans-serif capitals, off-white, centred, in the middle third of the frame.
Composition: vertical, text centred, generous margin on every side, nothing in the top 10% or the bottom 20%.
Style: flat graphic design, clean, minimal.
Constraints: the text is spelled exactly as written, on one line. No other text.
Avoid: extra words, logos, watermarks, misspelled or garbled letters, decorative borders.
```

If a letter is wrong: shorten the text, enlarge it, simplify the background, or add the text in
post. Leave room for a real logo and add it in post.
