# Reference sheets, storyboard panels and frames

Use this when the same character, product or place has to look the same across several images,
and when you build the stills that start a video clip. The prompts to fill in are in
[templates](templates.md). The formula and the model limits are in [SKILL.md](../SKILL.md).

Every generation here goes through the plan workflow of the `generate-media` skill. Do not call
a paid tool directly.

## Why a sheet, not one image

A single reference lets the model reinterpret every angle it was not shown, and the
reinterpretation is a slightly different subject. A small sheet of views fixes enough angles that
later images land on the same subject. More views is not better: every extra generation is
another chance to drift. Build few, build carefully. A weak sheet spreads into every image made
from it.

A sheet is a menu. Whatever is on it will be used, so leave off anything that should not appear.

## Write the locked description first

Before the first image, write one paragraph per character, place and product (see the top of
[templates](templates.md)). Paste it word for word into every prompt. Keep the small
imperfections (a scar, freckles, an asymmetry): the model averages them away when you do not
name them. For a place or product, the prompt of its first sheet is the locked wording: repeat it.

## Character sheets

| Sheet | Path | References | Aspect | Build when |
|---|---|---|---|---|
| Portrait | text-to-image, or edit of a real photo the person supplied | none, or the photo | 3:4 | Always. It is the identity anchor. |
| Turnaround (2x2: front, three-quarter, profile, back) | image-to-image | the portrait | 1:1 | Always. It covers angles the storyboard will need. |
| Expression sheet | image-to-image | the portrait | 1:1 | Only if the script needs emotions the neutral portrait lacks. |
| Hand sheet | image-to-image | the portrait | 1:1 | Only if a shot shows a hand holding, lifting or gesturing. |
| Full body | image-to-image | the portrait | as the shot needs | Only if a shot needs full-body framing. |

Chain every derivative from the portrait, never from another derivative. Portrait to turnaround
and portrait to expression sheet are right. Turnaround to expression sheet is wrong, because
drift compounds with every hop.

Three or four views is the sweet spot.

## Location plates

Make one plate per distinct camera angle the shots actually use, always empty. A person in the
plate becomes a second, competing identity. Match the plate's framing to the shot that will use
it: an overhead desk shot needs an overhead desk plate, not an eye-level room.

- Shoot at a three-quarter angle, not straight on. A frontal plate becomes flat wallpaper and the
  model invents the rest.
- Keep one distinctive anchor object in view.
- Reflections, signage and strong symmetric lines expose drift. Avoid them.
- A real place starts from its real photo. Edit the photo (references: the photo) and say what
  stays: "keep the exact same room, same furniture layout, same wall colour". Never invent the
  building.

## Product sheets

Packaging accuracy is all or nothing: a bottle that reshapes between images makes the video
unusable. Build front, held and in-use views as the shots need, one view per generation. If the
person has a real product photo, always build from it (image-to-image with the product
preservation clause) and keep the same logo and text as the photo. Never redesign packaging from
imagination when a photo exists. With no real photo, never ask for a readable brand wordmark:
leave it blank and overlay the real logo in post.

## Rules for every sheet

- Plain grey background, soft even light, no baked-in shadows or background blur. Baked light is
  inherited and amplified in every later image.
- One person per sheet.
- No captions, labels, numbers or text anywhere on the sheet.
- Same light and scale across all panels.

## Build order and cost

Plans take one to six independent items, so build in two rounds:

1. Round one: the portrait, plus any location plate and product sheet (they do not depend on the
   portrait). Download each, look at it, fix it.
2. Round two: upload the approved portrait with `upload_file`, then build the turnaround and the
   expression and hand sheets in one plan, each with the portrait in `input_urls`.

At 1K, GPT Image 2 costs 6 credits per image, so portrait, turnaround and one plate is 18
credits. A 2x2 sheet gives each panel a quarter of the pixels (about 627 px on a 1254 px square).
If panel detail matters, 2K (10 credits) may help; that is untested.

Uploads live about 24 hours. Results live 14 days. Download every approved sheet and keep it
under a clear name (for example `Char_Name_Portrait_v1.png`); upload it again when you need a
fresh public URL.

## Check every sheet

Open every image. Do not move to storyboard panels on a sheet you have not looked at.

| Check | Fail looks like |
|---|---|
| Identity | face does not match the portrait: rounder, different jaw, different eyebrows |
| Hands | fused or extra fingers, unnatural bends |
| Text artefacts | garbled lettering that was never meant to render |
| Logos | a mangled or invented wordmark (with a real photo it must match the photo; with none, leave it blank and overlay in post) |
| Wardrobe | outfit differs from the portrait's base outfit without a reason |
| Realism | smoothed, airbrushed skin; the realism constraints were missing |
| Panels | different light or scale between panels, captions, borders |

## Fix a drifted sheet

1. Add a second anchor before adding adjectives. Pass the portrait plus another approved view in
   `input_urls` instead of piling on description.
2. Re-roll as a new plan (new take, saved under a new file name; the old one stays).
3. Compare the takes and pick one. Later stages use the one you pick.
4. Still wrong: change one thing per attempt (add the preservation clause, name the failure in
   `Avoid:`). One re-roll of an unchanged prompt is fine for a random miss. Every re-roll is a new
   plan the person approves. After two failed attempts on the same item, stop and show the person
   what you have.

## Which references go into a shot

For a storyboard panel or frame, pass what the shot needs and no more:

- A person: the portrait and the turnaround (two anchors). Add the hand sheet if a hand is
  prominent.
- A place: its plate.
- A product: its product sheet.

Up to 16 images are allowed, but each one is a chance to pull the picture the wrong way. Say what
each is for in the prompt: "the first image is the character, the second is the room, the third
is the product".

## Storyboard panels and frames

A start frame sets the look of the clip. A still with bad light makes a bad video, and no video
prompt fixes it.

- Make each frame in the video model's aspect ratio. Veo 3.1 takes 16:9 and 9:16. Seedance 1.5
  Pro takes 1:1, 4:3, 3:4, 16:9, 9:16 and 21:9. Read the video model's schema.
- Choose stills by their light. Keep one light logic per location (one sun direction, never two).
  Lay the frames side by side and compare them before any video is generated.
- Name the white balance ("neutral daylight, about 5500 K"): GPT Image 2 skews warm and yellow on
  locations.
- Bake the look into the still. A grade or lens character that keeps drifting in video belongs
  in the start frame, where it holds.
- Storyboard panel: this shot's one action, framed at its start (a hand entering toward the
  product, not already holding it). Leave headroom for the movement.
- First frame: reuse the storyboard panel when its framing is already the starting point. Make a
  separate frame only to fix framing or a detail, and describe only the fix.
- Last frame: only when the end state differs (a camera move, a reveal). Reference the first
  frame and describe only the change. A static shot does not need one.
- Continuity across a cut: give the next shot's first frame the previous last frame as a
  reference.
- 9:16: keep faces and key subjects out of the top and bottom 10%. Keep text out of the top 10%
  and the bottom 20% of the frame (platform buttons and captions sit there).
- No text in images meant for video. Add words in the edit.
- A real place or product starts from its real photo, used as the first frame or edited
  lightly. Do not redescribe the room: that fights the photo and drifts the architecture.

How a frame is passed to a video model depends on the model: Veo 3.1 takes `image_urls` (one
image is the start frame, two are first and last), Seedance 1.5 Pro takes `input_urls` (0 to 2
images, same meaning), and Gemini Omni Flash takes `first_frame_url`. The `video-prompts` skill
covers the motion prompt, and `generate-media` covers the plan.

## Common mistakes

| Mistake | Fix |
|---|---|
| Six views "to be safe" | Three or four. Every extra view is a drift risk. |
| A location plate with a person in it | Regenerate it empty. |
| Chaining turnaround to expression sheet | Anchor both on the portrait. |
| Asking for a readable logo with no real photo | Leave it blank and overlay it in post. |
| Approving a sheet without opening it | Open every image first. |
| Editing an edit of a face | Go back to the original portrait. |
| Re-rolling the same prompt again and again | Change one thing: the prompt or the references. |
| Resending a prompt that got a fast 500 | That is usually the content filter. Reword the prompt. |
