---
name: video-prompts
description: >-
  Write the motion prompt that turns a still image (or plain text) into a short video clip on kie.ai models (Veo 3.1, Seedance 1.5 Pro, Gemini Omni Flash, Kling) and on lip-sync shots (Kling AI Avatar Pro). Teaches the core rule (the frame carries the look; the prompt describes only what changes: camera, action, performance, sound, timing), per-model notes, first and last frames, camera moves, how long a spoken line can be (the dialogue fit rule), hooks for the first seconds of social video, and diagnosing bad clips, including content-filter rejections. Use when the user says "make it move", "animate this image", "write the video prompt", "image to video", "camera move", "lip-sync this", "how long can the line be", "the motion looks stiff", "the clip was rejected". NOT for making the still (image-prompts), planning, pricing or running a generation (generate-media), product stills (product-photoshoot), thumbnails (youtube-thumbnail) or planning a whole reel (short-video).
---

# Video prompts

You write the prompt for one clip and check the clip that comes back. This skill never spends
credits. Every generation goes through the plan workflow of the `generate-media` skill:
`prepare_media_generation` (free; returns the plan with an exact quote, an upper-bound estimate
or "unknown") → the person's approval → `submit_media_generation` → `wait_for_task`. Credit caps
apply. Put your prompt into the plan item and show it with the plan. Never call a video tool any
other way.

## The one rule

**The frame carries the look. The prompt describes only what changes: camera, action,
performance, sound and timing.**

Never re-describe the face, clothes, room or product that is already in the frame. Two competing
descriptions make the model drift. A real photo of a room animated with a push-in needs the camera
move and the light, nothing about the room.

With no frame (text to video) the prompt must carry the look. See
[prompt formula](references/prompt-formula.md), "No frame".

## Workflow

1. **Pick the shot's job and the model** (table below). Call `get_model_schema` for it: `run_model`
   refuses a field the schema does not list. `get_model_status` gives price text and health.
2. **Get the frame first.** Images before video: a 1K GPT Image 2 still costs 6 credits. The
   cheapest clip here is 7 (Seedance, 480p, silent, 4 s); Gemini Omni Flash starts at 63. Veo 3.1
   Lite through the hand-tuned `veo3_generate_video` tool (`model: "veo3_lite"`, 720p) has an
   exact price of 30 credits per clip up to 8 s (35 at 1080p). The catalog model `veo-3-1`
   through `run_model` can't choose a tier, so plans estimate its dearest tier. Open and look at
   the still: a drifted face, fused fingers or bad light will be in the clip, and no prompt fixes
   it. Fix the frame (`image-prompts`). Inputs must be public URLs: upload local files with
   `upload_file`, after downsizing ([models](references/models.md), "Input images").
   Under MCP, `upload_file` takes `file_base64` (a base64 string or data URL, up to 10 MiB);
   `file_path` works only in the CLI. Apps that support it can also use `upload_widget`.
3. **Write the body** with the formula below: 50 to 100 words.
4. **If anyone speaks, run the dialogue fit check.** It sets the clip duration.
5. **Prepare the plan** with the shortest duration and lowest resolution that answers the
   question. One pilot clip before a batch. Plan item:
   `{ "tool": "run_model", "args": { "model": "<id>", "input": { ... } } }`, or a hand-tuned tool
   from `list_models`. For video pass `timeout_seconds` up to 600 to `wait_for_task` (the default
   is 180, and Veo, Kling Avatar and Omni can take 2–8 minutes). A timeout is not a failure: call
   `wait_for_task` again with the same task id; don't resubmit.
6. **Look at what came back.** Download the result (`wait_for_task` returns `result_urls`;
   results are kept 14 days) and open it:
   ```bash
   curl -L -o clip.mp4 "<result url>"
   ffmpeg -ss 0 -i clip.mp4 -frames:v 1 first.png        # first frame
   ffmpeg -sseof -0.1 -i clip.mp4 -frames:v 1 last.png   # last frame
   ffmpeg -i clip.mp4 -vf "fps=1,scale=360:-1,tile=4x2" sheet.png   # one frame a second
   ```
   Judge it as a viewer first ("does this look filmed?"), then use
   [diagnosing](references/diagnosing.md). Listen to the audio when the clip has speech.
7. **Retries.** One re-roll of an unchanged prompt is fine for a random miss. After that, change
   one thing per attempt. Every re-roll is a new plan the person approves. After two failed
   attempts on the same item, stop and show the person what you have.

## Which model, and what it wants

Details, price lists and quirks: [models](references/models.md).

| Model (id) | Frame input | Write it like this |
|---|---|---|
| **Veo 3.1** (`veo-3-1`) | `image_urls`: 1 image = start frame, 2 = first and last; or text only | Order: subject action, camera, composition and lens, light and ambience, audio. Dialogue in quotes with a delivery tag. One speaker per clip. No voice lock: voices differ between clips, so repeat the same voice description word for word. Duration 4, 6 or 8 s. |
| **Seedance 1.5 Pro** (`bytedance/seedance-1.5-pro`) | `input_urls`: 0 to 2 (1 = start, 2 = first and last) | Always name one camera move; it picks its own when the prompt is vague (observed). State the dialogue, its language, the sound effects, and the music mood or "No music". `generate_audio` doubles the price. `fixed_lens` locks the camera. Duration 4 to 12 s. Its vendor lists Indonesian lip-sync (unverified on kie.ai): pilot before relying on it. |
| **Gemini Omni Flash** (`google/gemini-omni-flash-1-1`) | `first_frame_url` (hard first frame) | For Gemini Omni Flash use `run_model` with `google/gemini-omni-flash-1-1`; the hand-tuned `gemini_omni` tool has no first-frame input, and first-frame mode is the one that worked (character mode failed 9 of 9 attempts). `duration` is a string ("4", "6", "8", "10"). Motion is rated weaker in our notes: small, slow moves. A fast 500 on a shot with a person was a content filter. |
| **Kling** (video) | see `list_models` and `get_model_schema` | No verified prompting notes here. Use the rules in this skill and a short pilot. |
| **Kling AI Avatar Pro** (`kling/ai-avatar-pro`) | `image_url` + `audio_url` + `prompt` | Lip-sync. The audio drives the mouth; the prompt directs gaze and manner only. See "Lip-sync" below. |

## How a prompt is built

Short and physical: **50 to 100 words**. Earlier words weigh more, so the thing the shot depends
on goes first. For a busier shot, use short labelled lines in this order and skip any the shot
does not need:

```
CAMERA: <one named move, its speed or duration, its end frame, then a hold>
ACTION: <the one physical beat, present tense, ending in a visible completed state>
PERFORMANCE: <micro-life and eyes; physics, not emotion words>
AUDIO: <dialogue block, one dominant sound tied to the action, ambience; "No music, no subtitles.">
LOCKS: <positive constraints: what must stay as it is>
```

Layer-by-layer guide and worked examples: [prompt formula](references/prompt-formula.md).
Named camera moves with wording: [camera moves](references/camera-moves.md).

For several clips in one video, repeat the same camera treatment (handheld or locked), ambience
sentence and voice description in every prompt, so the cuts match. Light and lens come from the
frames in image-to-video; repeat light words only in text-to-video clips.

## Rules that make the difference

1. **Measurable words only.** Could a camera, light meter or stopwatch measure it? "Hard key
   light 45 degrees from camera left, about 4000 K", not "cinematic lighting". "Over 6 seconds",
   not "slowly". "107 degree rectilinear ultra-wide, verticals straight", not "wide". Delete
   cinematic, epic, stunning, breathtaking, masterpiece, 8K, ultra-realistic, premium, luxury,
   beautiful.
2. **One camera move per clip,** with an **end frame** ("until the window fills the frame") and a
   **hold** of 1.5 to 2 s at the end. No end frame and the camera drifts or reverses. A compound
   move only as timed phases ("rises 0 to 3 s, holds, then pushes in 4 to 8 s").
3. **One action beat per 4 to 6 s** (one or two in 8 s). End it in a **completed state** ("sets the
   cup down, hand resting beside it"). Chain actions in one direction, or the model plays the
   action back to fill the clip.
4. **Micro-life on people.** A visible micro-event every 1 to 2 s: a blink every 2 to 4 s, a breath
   before speaking, a weight shift before moving, hair and fabric lagging a fraction behind.
   **Eyes need a task** ("checks whether the viewer is following"). Dead eyes are the first AI tell.
5. **Physics, not emotion labels.** "Jaw relaxes, a small exhale through the nose, eyes crinkle",
   not "she looks happy". Give a presenter a physical task and let them talk over it.
6. **Walking is the hardest move.** Write it as physics (heel strikes, feet strictly alternate, one
   foot always on the ground) and use the same pace in every clip of one walk.
7. **Hands.** Frame waist-up, or state the hand count and what each does. One simple action.
8. **Positive constraints, not negative lists.** "Face stays identical, verticals stay straight,
   light stays constant" beats "no morphing, no warping". Ban only what the model does by
   default: music, subtitles, on-screen text. See [avoid list](references/avoid-list.md).
9. **No text in the generation.** Add words in the edit. Text drawn by the video model is garbled.
10. **A verb alone gives a mime.** For opening, pouring or pressing, write the chain: what the
    object is, what holds it, where the force goes, how the material reacts, the end state.

## Dialogue and lip-sync

### The dialogue fit rule (measured)

```
spoken characters <= (clip seconds - 0.7) x 10.5
```

Count the characters of the quoted line. Over the limit, the line is rushed or cut. Shorten the
line or lengthen the clip. Never ask the model to "speak faster" and never time-stretch lip-synced
or on-camera audio.

| Clip seconds | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|
| Max characters | 34 | 45 | 55 | 66 | 76 | 87 | 97 | 108 | 118 |

The rule sets the duration of clips that generate their own speech: take the shortest allowed
duration whose maximum fits the line. Veo allows 4, 6 or 8 s; Seedance 4 to 12 s; Omni 4, 6, 8 or
10 s. A longer clip costs more credits; say so plainly. Over 76 characters on Veo means splitting
the line across two clips. With Kling AI Avatar Pro your audio sets the length.

**There is also a floor (observed).** A line far shorter than its clip makes the model invent
filler words or say the line twice. If the line uses less than about half the budget, shorten
the clip, script a pause ("she pauses, then..."), or give the spare time a silent action.

### Writing the audio block

```
AUDIO: <voice description, verbatim every clip>, in <language and register>, <delivery>:
"<exact line>" — only this line, nothing else. <Physical action while speaking>. <Facial reaction
after the line>. Anyone else in frame: lips at rest, jaw closed. <Room acoustic>. No music, no
subtitles.
```

- Spell numbers and abbreviations the way they are said. Give unusual names a phonetic spelling.
  The caption added later can keep the written form.
- Lip-sync works best at: a 3 to 8 s line, medium close-up or tighter, one face, a locked camera or
  a slow push-in, no nodding or head-turn words, speech slightly slower than natural.
- Keep lips out of most shots. One or two short on-camera lines per video; the rest is voice-over
  over b-roll. For b-roll with people, write "mouth closed, not speaking".
- One speaker per clip. Name a positive mouth state for others. "Listens without speaking" names
  speaking, so do not use it.
- Never replace a clip's lip-synced voice with a different voice afterwards: the mouth was
  animated for the original audio and the result reads as a bad dub.
- English dialogue is the best-supported case on Veo (unverified). Pilot other languages and listen.

### Lip-sync: your own narration on camera (Kling AI Avatar Pro)

Use this when the voice is recorded first. One voice for the whole video, no dubbing. Send the
first frame as `image_url`, the audio as `audio_url` (a public URL: `upload_file`), and a short
`prompt`. Where the voice comes from: [models](references/models.md), "Voices for lip-sync".

- **Cut the audio to the line.** Start 0.2 to 0.4 s before the first word (the mouth opens on the
  breath) and end in the pause after it. Price is 16 credits per second, so cut the audio tight.
- **Eye contact is made in the first frame, not the prompt.** A first frame where the person
  looks away gives a clip where they talk to themselves. Make a selfie-style frame: phone at
  arm's length, eyes fully on the lens, lips slightly parted as if about to speak.
- **The prompt directs gaze and manner only.** The prompt to use is in
  [prompt formula](references/prompt-formula.md), "Lip-sync direction, Kling AI Avatar Pro".
- **Check the clip against its sound.** Lips close on "m" (verified); look for round lips on u and
  w and an open mouth on the breath before the line. Eyes should stay on the lens.

## Audio in generated clips

Four layers: dialogue; **one dominant sound per action**, tied to what is visible ("heels on tile
as she steps in"); ambience, at most two or three elements in one sentence, reused word for word
in every clip of the same space; and no music (video models add music and subtitles by default:
"No music, no subtitles."). Name the room acoustic ("small tiled room, slight echo"). Add music
in the edit, not in the video model.

An audio line made only of negations ("Nobody speaks. No music.") made Veo fail once with
"unable to generate audio". Give it something to generate ("soft outdoor ambience, a light breeze,
distant birds") and say "mouth closed" under PERFORMANCE. Models sometimes invent loud sounds (a
glass crash under a selfie): if the video has its own narration and music, mute the clips' audio.

## The first seconds of social video

The first 1.5 to 3 seconds decide whether it is watched. A hook creates a tension the viewer wants
closed. Put the change in the first second of the clip, and the first word before about 0.8 s.
Eight spoken hook structures, matching first frames, and visual hooks:
[hook library](references/hook-library.md). Every hook promises something: name the shot that
pays it off.

## When a clip comes back wrong

[diagnosing](references/diagnosing.md) has the full table. Quick fixes: camera drifts, add an end
frame and a hold; motion stiff, physics verbs and one beat; walls bend, a shorter slower move or a
lateral glide; speech cut off, apply the fit rule. A fast 500 or refusal on a shot with a person
is a content filter: reword the action (drop unsafe behaviour and anything that reads as
following someone; describe role, clothes and action; avoid words for minors (girl, boy, young,
teen), though an adult age like "in her late 20s" is fine) instead of adding constraints.

## Self-check before you prepare the plan

- [ ] Written for the chosen model; nothing re-describes the frame; fields and values (duration
      type, frame field, aspect ratio) come from `get_model_schema`
- [ ] One camera move (speed or duration, end frame, hold); one action beat per 4 to 6 s, ending
      in a completed state
- [ ] People: micro-life, an eye task, physics instead of emotion words, hands handled
- [ ] Measurable words, no slop words, no on-screen text requested, positive LOCKS
- [ ] Speech: audio block in order, "only this line", fit rule and floor, numbers as spoken, mouth states
- [ ] Sound: one dominant sound per action, shared ambience sentence, "No music, no subtitles"
- [ ] Shortest duration, lowest resolution, one pilot first

## References

- [prompt formula](references/prompt-formula.md): every layer, no-frame prompts, first and last frame, word banks, worked examples
- [camera moves](references/camera-moves.md): named moves, speeds, end frames, space-to-move map, anti-warp ladder
- [models](references/models.md): fields, limits, prices and quirks per model, input images
- [avoid list](references/avoid-list.md): positive locks and the few bans worth writing
- [diagnosing](references/diagnosing.md): symptom, cause, fix; content filters; errors; speech checks
- [hook library](references/hook-library.md): hook structures for the opening seconds

## Sources

- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/SKILL.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/references/prompt-formula.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/references/camera-moves.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/references/shot-categories.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/references/avoid-list.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/references/diagnosing.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video-prompt/references/hook-library.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video/references/gemini-omni-flash.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-video/references/troubleshooting.md (by Andre Tansil).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/prompt-engineering.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-generate/references/troubleshooting.md (MIT, Copyright (c) 2026 Higgsfield AI).
