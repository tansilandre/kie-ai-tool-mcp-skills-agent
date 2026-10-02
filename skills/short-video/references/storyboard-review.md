# Storyboard frames and the two visual reviews

Stages 4, 5 and 7 of the `short-video` skill. The goal: the person approves the look,
then the whole reel as images, before any video credit is spent. Images are cheap
(GPT Image 2 at 1K is 6 credits) and a clip is not. A still with the wrong light, a
plastic face or an invented detail becomes a bad clip, and no video prompt rescues it.

Every image is a paid generation: use the `generate-media` plan workflow, up to six
items per plan, and show each plan's estimate. Write every image prompt with
`image-prompts`. Download each result (`curl -L -o frames/S01_first_v1.png "<url>"`)
and look at it before you show it to anyone. Show images in the conversation if the
client can render them. If not, give the file paths and tell the person how to open
them (`open <file>` on macOS).

## 1. Look review (first approval)

1. Write one or two style-frame prompts from the look block in
   [script and beats](script-and-beats.md). Say "style frame, the look of the whole
   reel". Copy the world, light and grade words verbatim. Typical pair: the presenter or
   product in the world; the world with no people.
2. One plan, 9:16, 1K. Download and look. Reject a frame with a different time of day
   than the look says, a plastic or distorted face, wrong hands, garbled text or an
   invented detail. Regenerate only the failed one.
3. Show the frames next to the look text (world, light, grade, graphics, register).
   Say what the plan cost. Ask one question: "Is this the look of the whole reel?"
4. Fix only what the person flags. Regenerate, show again, repeat until a clear yes.
5. Write the approval in `script/Shotlist_v1.md` ("Look approved <date>"). Changing a
   style frame or the look text afterwards voids it: show it again.

From now on every storyboard frame gets the approved style frames as references
(`input_urls`) and the style prefix. A shot that must not inherit the look (a flat map
graphic) is the exception: say so in its row.

## 2. First frames

Make one 9:16 first frame per `ai` shot with `gpt-image-2-image-to-image`
(references in `input_urls`, up to 16). The clip animates forward from this frame, so
it decides the video.

- **References per shot, not copied from the last shot.** Usually the approved style
  frame, plus the one image of a recurring person, product or place that this shot
  needs. If a person, product or place recurs, make one clean reference image of it
  first (front-facing, neutral light) and use it in every shot that has it. Repeat the
  same identity words in every prompt.
- **Real places and products start from the person's real photo.** Make the first
  frame image-to-image from that photo, not a generated one.
- **Frame the start of the action, not its climax.** Leave room for what the shot moves
  into (a push-in needs space to push into; a turn needs room on the turning side).

| Shot intent | Frame shows |
|---|---|
| she lifts the bottle | the bottle still on the desk, a hand entering the frame |
| she turns to camera | the head still turned away |
| she unscrews the cap | the cap still on |

- **One world.** Every frame at the look's time of day, light direction and grade.
  Put the frames side by side (section 5). A frame that breaks the light is redone now.
- **Bake stubborn looks into the frame** (grade, lens character) instead of hoping the
  clip prompt holds them.
- **Plan the cut into the frame.** End one shot and start the next on the same gesture
  or direction of travel when they cut together.

Group frames into plans by shared references, six at most per plan. Name them
`S01_first_v1.png`. A re-roll is `v2`, never an overwrite.

## 3. Last frames: only where needed

A last frame pins the end of the shot. It is a second image to pay for, and only some
models use it.

| Make a last frame for | Skip it for |
|---|---|
| a camera move (push-in, pull-out, pan) that ends on a different composition | a static or talking shot with no camera move |
| a reveal (product opened, result shown) | a shot that is one continuous gesture with no distinct end |
| a transition shot that feeds the next shot's first frame | any shot where letting the model find the middle is good enough |

Make it image-to-image from the first frame, with the first frame as the reference.
Describe only what changed by the end, not the scene again. Only models that take two
images use it: `bytedance/seedance-1.5-pro` (two `input_urls`) and `veo-3-1`
(`FIRST_AND_LAST_FRAMES_2_VIDEO`). Kling AI Avatar Pro (`image_url`) takes one image: do
not build a last frame for it. Gemini Omni Flash (`first_frame_url`): older notes list a
`last_frame_url` field; confirm with `get_model_schema` before planning a last frame for
Omni.

## 4. Continuity between shots

Hard cuts between unrelated framings are the norm in short video and need nothing.
Where two shots should flow (the same motion carrying across the cut), make the next
first frame echo the previous end: use the previous last frame as the reference and
write "same position and framing as the reference" plus what changes. You can also
take the real last frame of a finished clip with ffmpeg
(`ffmpeg -sseof -0.1 -i clips/S01_v1.mp4 -frames:v 1 -update 1 frames/S01_end.png`)
and send it through `upload_file`. That forces the clips to be made in order, so use it
only where the beat sheet wants it.

Run this check across all frames before the sequence review. Fix conflicts now, not in
the edit.

| Check | Failure looks like |
|---|---|
| Identity words reused verbatim | the face or features shift from shot to shot |
| Same environment | walls or surfaces change colour or layout |
| Light direction | window light on the left in S01, on the right in S02 |
| Colour temperature | warm morning light, then cool office light |
| Wardrobe | the outfit changes with no story reason |
| Product state moves forward only | opened in S02, sealed again in S04 |
| Time of day | daylight in S02, night in S03 with no transition beat |
| Hands and props | holding the product in S03, empty-handed in S04, no action between |
| At least one direct-to-camera shot (if the brief has a presenter) | a reel of only b-roll reads as an ad |

## 5. Sequence review (second approval)

Before any video prompt, the person approves the whole reel as images. All first frames
exist, the narration is measured (stage 6), and the shot lengths are set. Run these
from the project folder. Copy the chosen frame of every shot into `frames/seq/` as
`001.png`, `002.png`, ... in shot order, with no gaps, so the `%03d` input does not stop
early. A shot with no generated frame (live footage, a graphic) gets a placeholder card in
its slot, for example
`ffmpeg -y -f lavfi -i color=c=gray:s=1080x1920 -frames:v 1 -update 1 frames/seq/004.png`.

**Contact sheet** (the reel on one image, in order):

```bash
ffmpeg -y -framerate 1 -start_number 1 -i frames/seq/%03d.png \
  -vf "scale=270:480:force_original_aspect_ratio=decrease,pad=270:480:(ow-iw)/2:(oh-ih)/2,tile=4x2:padding=8:margin=8:color=white" \
  -frames:v 1 -update 1 final/Contact_Sheet_v1.png
```

Change `tile=4x2` to columns x rows that hold your shot count (empty cells stay white).

**Animatic** (stills at edit timing with the real narration, no video model involved).
Write `final/animatic.txt`, one `file` and `duration` pair per shot. No clips exist yet,
so time the stills from the planned durations in the shot list (the `Edit s` column).
Paths in this file are relative to the file itself, hence `../`. List the last file twice,
the second time without a duration, or ffmpeg drops its duration:

```
file '../frames/seq/001.png'
duration 2.4
file '../frames/seq/002.png'
duration 3.1
file '../frames/seq/003.png'
duration 2.0
file '../frames/seq/003.png'
```

```bash
ffmpeg -y -f concat -safe 0 -i final/animatic.txt -i audio/narration_track.wav \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" \
  -c:v libx264 -crf 20 -c:a aac -b:a 160k -shortest final/Animatic_v1.mp4
```

If the narration is several takes, build `audio/narration_track.wav` first (see
[assembly](assembly.md), "Narration track and phrase starts"), placing each take at its
shot's planned start from the same `Edit s` column. If your ffmpeg has the `subtitles`
filter, burn the draft captions in as well (same filter as the final); if not, list each
beat's text and line in your message next to the contact sheet.

Watch it as a viewer, not as a checker:

- One world, one light, one grade across every shot?
- Does the story pay off the hook, with a named shot?
- Does the product or place get its share of screen time?
- One graphic style, text off the faces and out of the top 10% and the bottom 20%?
- Does any frame look like a placeholder (apart from the cards you added on purpose), or
  two frames like different films?
- Does the cut rhythm vary (1.5-3 s on b-roll), with no three same-size cuts in a row?

Then send the person the contact sheet, the animatic, a per-beat list (shot, seconds,
spoken line, on-screen text, model, clip length) and the expected video cost: the sum
of clip seconds times the price from `get_model_status`, or the price text for models
that do not quote. Say the exact quote comes with the plan after approval. Ask: "Is the
reel approved as images? Tell me what to change, by shot."

Fix only the shots they flag. Regenerate those frames, rebuild the contact sheet and
the animatic, and show them again. Repeat until a clear yes. Write it in
`script/Shotlist_v1.md` ("Sequence approved <date>"). A change to any frame, the
on-screen text, the narration or the timing after that voids the approval: show it
again. Only then write clip prompts and prepare a video plan.

## Common mistakes

| Mistake | Fix |
|---|---|
| Reusing the previous shot's references without checking | pick references per shot |
| A frame at the climax of the action | reframe to the start of the action |
| A last frame for a static shot, or for a model that takes one image | skip it |
| A first frame from a fresh text prompt when a style frame or a real photo exists | image-to-image from the reference |
| Skipping the continuity check because it will probably be fine | it is the cheapest check in the whole process |
| Asking for approval of images you have not looked at | look first, always |
