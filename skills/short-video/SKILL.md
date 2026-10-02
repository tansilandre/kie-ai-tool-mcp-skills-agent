---
name: short-video
description: >-
  Make a finished short vertical video (9:16, 15-60 s: reel, ad, explainer, talking
  presenter) from a brief with kie.ai models and ffmpeg. Covers the script and beat
  sheet, a shot list with a model per shot, a look review, storyboard frames, a
  sequence review of the whole reel as images before any video credits, a pilot clip,
  the clip batch, voice-over and music, assembly with captions and loudness, a final
  check and a cost report. Use when someone says "make a reel", "make a 30-second
  video", "TikTok / Reels / Shorts video", "vertical ad", "explainer video from this
  brief", "storyboard this and animate it", "add voice-over and captions", or "put
  these clips together into one video". NOT for one image (use image-prompts or
  generate-media), one clip or its motion prompt (use video-prompts), product photo
  sets (product-photoshoot) or a YouTube thumbnail (youtube-thumbnail).
---

# Short video

Turn a brief into one finished vertical MP4: script, shot list, images, clips, voice,
music, captions. Every kie.ai generation goes through the `generate-media` plan
workflow. Everything else (trim, join, mix, captions, checks) runs locally with
`ffmpeg` and `ffprobe`. Run `ffmpeg -version` first. If they are missing, tell the
person to install them before you start.

Prompt craft lives in other skills. Use `image-prompts` for every image prompt and
`video-prompts` for every clip prompt and for model-specific motion rules. This skill
sets the order of work, the two approvals and the edit.

## Rules

1. **Plans, never direct calls.** `prepare_media_generation` (free; one to six items,
   returns an exact quote, an upper bound or "unknown"), then show the whole plan, then
   get the person's approval as the server's mode requires, then
   `submit_media_generation`, then `wait_for_task`. More than six items means more than
   one plan. Show each plan's estimate. Credit caps apply: if one blocks a plan, ask the
   person. See `generate-media`.
2. **Images before video, two approvals.** The person approves the look (style frames),
   then the whole reel as images (sequence). No storyboard image before the look is
   approved. No video plan before the sequence is approved. These approvals answer "is
   this what I want?". The plan approval answers "may you spend this?". You need both,
   creative approval first.
3. **Only the person approves.** Wait for a clear yes in chat. A question, a note or
   silence is not a yes. If you change a frame, the on-screen text, the narration or the
   timing after a yes, show it again.
4. **Look at every output.** Download it (`curl -L -o <file> "<url>"`) and open it. For
   a clip, view at least the first, a middle and the last frame (see
   [assembly](references/assembly.md)). You cannot hear audio: check sound with
   numbers and ask the person to listen to the pilot and the draft.
5. **Download everything you keep, right after `wait_for_task`.** Results are kept 14
   days. Uploads (`upload_file`) last about 24 hours. Keep rejected takes until the cost
   report is done.
6. **Start cheap.** 1K images, the shortest clip, the lowest resolution that answers
   the question, one pilot before a batch. A regenerated clip costs again: fix the
   first frame or the prompt first. Trimming in the edit is free.
7. **Speech is fragile.** Plan at most one or two short on-camera lines per reel (the
   hook, the call to action). The rest is voice-over on silent clips. People in b-roll
   keep their mouths closed.
8. **What is real stays real.** If the brief says a product, a place, a map or a
   disclaimer is real footage or a graphic, do not generate a fake. Use the real photo
   as the reference image, or leave the beat for the edit.
9. **Prompts in English.** Spoken lines and on-screen text in the video's language.
10. **A failed or slow task is not re-submitted.** Check `get_task_status` first. A new
    submission is a new plan, a new approval and a new charge.

## Folder layout

Use the project's own layout if it has one. Otherwise:

```
<project>/
  brief/    the brief, product photos, logos, references (never edit; copy to work)
  script/   Script_v1.md, Shotlist_v1.md
  frames/   look/ (style frames), S01_first_v1.png, S01_last_v1.png, ...
            seq/ (the chosen frame per shot, in shot order, as 001.png, 002.png, ... for the review)
  clips/    S01_v1.mp4 (raw downloads, never edited); clips/norm/ (working copies)
  audio/    narration takes, music, sound effects
  final/    contact sheet, animatic, drafts, <Project>_v1.0.mp4, .srt, Cost_Report.md
```

Name files `S01_first_v1.png`, `S01_v2.mp4`. A new take gets the next number; never
overwrite. Shot ids (S01, S02, ...) are the same in every folder and every table.

## Stages

| # | Stage | Done when |
|---|---|---|
| 1 | Brief | goal, one message, platform, length, language, real assets, budget cap written down |
| 2 | Script and beat sheet | one beat per shot; narration written; fit rule passes |
| 3 | Shot list | a model, a first frame and a clip length for every shot |
| 4 | **Look review** | the person said the look is approved |
| 5 | Storyboard frames | every first frame (and needed last frame) looked at and accepted |
| 6 | Voice and music | the person picked the voice; takes measured; shot lengths adjusted |
| 7 | **Sequence review** | the person said the reel as images is approved |
| 8 | Pilot clip | one clip generated, downloaded, checked, accepted |
| 9 | Remaining clips | every clip downloaded, checked, accepted or re-planned |
| 10 | Assembly | one MP4 with captions and loudness at about -14 LUFS |
| 11 | Final check | frames, sound numbers and spec checked; the person watched the draft |
| 12 | Delivery | file, .srt, cost report handed over |

Between stages, send a short note: what was made, credits spent so far, what is next.

### 1. Brief

Collect: the goal and the one sentence a viewer should repeat; platform (TikTok, Reels,
Shorts); length (15, 30 or 60 s); voice and text language; what is real (product
photos, logo, place, people, claims, mandatory text); budget cap. Read the brief files
before asking. Ask only what is missing and say the defaults you will use otherwise.
Call `get_balance` once. Copy inputs into `brief/`.

### 2-3. Script, beat sheet, shot list

Follow [script and beats](references/script-and-beats.md): structure, pacing, narration
rules, the dialogue fit rule, the look block and the shot-list table. Choose each
shot's model from the table below, then read `get_model_status` (health, price text)
and `get_model_schema` (fields) for each model you plan to use. Before the person
reviews anything, give a rough total from the price text and the shot lengths.

### 4-5. Look review, then storyboard frames

Follow [storyboard and reviews](references/storyboard-review.md). Make one or two style
frames, show them with the written look, ask one question ("Is this the look of the
whole reel?") and loop until approved. Then make one 9:16 first frame per shot (and a
last frame only where the shot needs a pinned end), each referenced to the approved
style frames. Look at every frame yourself before showing it.

### 6. Voice and music

The voice sets the timing, so make it before the sequence review. Narration is
text-to-speech over silent clips (except on-camera lines; see the model table).

- Speech on kie.ai is unreliable. ElevenLabs models on kie.ai failed with 500 errors or
  stayed "waiting" for hours on 2026-09-28 (0 credits charged). Call `get_model_status`
  first, then make one short test take before you plan the full narration. Have a
  fallback: a voice the person records, or a text-to-speech service they already use.
  On macOS, `say` gives a temporary voice for timing only. kie.ai's ElevenLabs
  text-to-dialogue v3 addresses its preset voices by voice ID, not by name.
- Generate two or three voice takes of the same sentence, side by side. Let the person
  pick by ear. Use one voice for the whole reel. Save to `audio/` (one take per beat as
  `vo_S01.mp3`, and the joined track as `audio/narration_track.wav`).
- Measure every take (`ffprobe`). If a take is longer than its shot, shorten the line
  or lengthen the shot. Do this now, before any clip is paid for.
- Music: an instrumental bed under the voice, with a quiet part, a short build and a
  drop on the reveal if the reel has one. Find a music model with `search_models`. Make
  two or three takes, reject any with a dead stretch, and pick the one whose structure
  fits the beat sheet. Or use a track the person owns.

### 7. Sequence review

Follow [storyboard and reviews](references/storyboard-review.md): contact sheet and
animatic built with ffmpeg from the approved stills and the real narration. Judge the
reel as a whole (one world, one light, one grade; the hook is paid off; the product
gets screen time; text never covers a face). Tell the person the expected video cost
before asking. Only on a clear yes, move on.

### 8-9. Pilot, then the batch

Agree the delivery resolution with the person first (480p 9:16 is 496x864, upscaled to
1080x1920 in the edit). Pick the riskiest shot for the pilot (a person, hands, speech,
a camera move), not the easiest. Write its prompt with `video-prompts`, prepare a
one-item plan, show it, run it, download the clip, extract first, middle and last
frames, look at them. Fix the prompt or the first frame if needed. Only then prepare
the remaining clips, up to six per plan. Look at every clip. A clip that is wrong gets a
new plan and a new approval; try trimming or a different cut first. For video pass
`timeout_seconds` up to 600 to `wait_for_task` (the default is 180, and Veo, Kling Avatar
and Omni can take 2–8 minutes). A timeout is not a failure: call `wait_for_task` again
with the same task id; don't resubmit.

### 10-12. Assembly, check, delivery

Follow [assembly](references/assembly.md): normalise the clips, trim to the narration,
join (hard cuts by default), mix voice and music, normalise loudness, burn captions,
export. Then check: frame samples and a contact sheet of the final, `ffprobe` for
size, fps, duration and streams, loudness and silence numbers. Send the person the
draft to watch and listen to. Fix what they flag, then deliver:

- the final `<Project>_v1.0.mp4` (a later change is `v1.1`; never overwrite), the
  `.srt`, and the folder of kept clips and frames;
- a cost report, `final/Cost_Report.md`: one row per generation with model, items,
  quoted credits and actual `creditsConsumed` from `wait_for_task`; the total in
  credits; `get_balance` before and after; what was re-rolled or discarded and why.
  Report credits. Give dollars only if the person asks (1 credit is about US$0.005);
- what you did not do: nothing is posted or uploaded unless the person asks.

## Choosing a model per shot

Fields and prices change. Read `get_model_schema` and `get_model_status` before you
plan. `list_models` shows the hand-tuned tools. Use `run_model` for any catalog id.
Reference images must be public URLs: a local file goes through `upload_file`. Under MCP,
`upload_file` takes `file_base64` (a base64 string or data URL, up to 10 MiB); `file_path`
works only in the CLI. Apps that support it can also use `upload_widget`. Download the
result, look at it, then `upload_file` it to use it as an input. Passing kie.ai result links
straight in is not confirmed to work, and uploading also makes you look first.

| Shot | Model (catalog id) | Notes |
|---|---|---|
| Style and storyboard frames, 9:16 | `gpt-image-2-text-to-image`, `gpt-image-2-image-to-image` (references in `input_urls`, up to 16) | 1K / 2K / 4K = 6 / 10 / 16 credits. Start at 1K. No seed |
| Cheaper frames | `nano-banana-2-lite` (4 credits at 1K), `nano-banana-2` (8 / 12 / 18) | read the schema for fields |
| Silent b-roll, product, place, transition | `bytedance/seedance-1.5-pro` | `input_urls`: one image = start frame, two = first and last. `duration` 4-12, `aspect_ratio` `9:16`, `resolution`, `fixed_lens`, `generate_audio` false. Per second, silent: 480p 1.75, 720p 3.5, 1080p 7.5 credits (double with audio). 480p 9:16 is 496x864 |
| Clip with English speech or sound, or a precise first and last frame | `veo3_generate_video` with `model: "veo3_lite"`, or catalog `veo-3-1` | Prefer `veo3_generate_video` with `veo3_lite` as the cheap Veo path: an exact price of 30 credits per clip up to 8 s at 720p (35 at 1080p); check `list_models` for its fields. The catalog `veo-3-1` through `run_model` (`image_urls`, `generation_type`, `aspect_ratio` `9:16`, `duration` 4, 6 or 8) can't choose a tier, so plans estimate its dearest tier. Voices differ between clips |
| A person acting from a first frame | `google/gemini-omni-flash-1-1` | `first_frame_url`, `duration` is a string "4" to "10". 63 credits for 4 s. A fast "500" on a person shot was a content filter: reword the action. Character mode failed 9 of 9: use first-frame mode |
| A person saying the reel's own narration | `kling/ai-avatar-pro` | `image_url`, `audio_url`, `prompt`. 16 credits per second. Audio comes back unshifted. Use an eye-contact first frame and a gaze line |
| Another lip-sync option | `infinitalk/from-audio` | rejects WAV: send MP3, 44.1 kHz stereo |
| Voice-over, music | `search_models` (text to speech, music) | see stage 6 |

Veo 3.1 dialogue is best in English (unverified). Seedance's vendor lists Indonesian
lip-sync (unverified on kie.ai): pilot it before a batch. Unverified: Veo needing 8 s
when both first and last frames are set. Model-specific prompt rules are in
`video-prompts`.

Rough budget, arithmetic from the price text above (the plan's quote wins): a 30 s reel
of 8 shots needs about 10 images at 6 credits (60, about 90 with re-rolls) and 8 silent
Seedance clips of 5 s (70 credits at 480p, 140 at 720p), plus voice and music.

## Dialogue fit rule

Spoken characters <= (clip seconds - 0.7) x 10.5. Measured on generated on-camera
speech. Over that, the line is rushed or cut: shorten the line or lengthen the clip.
For text-to-speech narration, use it for a first guess and then measure the real take.
The table of limits is in [script and beats](references/script-and-beats.md).

## When something fails

| Symptom | Do |
|---|---|
| Code 401 / 402 / 429 in the body (HTTP is still 200) | 401 bad key, 402 not enough credits (stop, tell the person), 429 slow down and retry later |
| "The API key is not authorized to use this model" | the person enables that model at https://kie.ai/api-key |
| Fast "500" on a shot with a person | content filter: reword the action, then a new plan |
| Speech model errors or waits for hours | stop, try `get_model_status`, use the fallback in stage 6 |
| Task stuck | `get_task_status`; do not submit the same plan again |
| Clip drifts from the first frame | fix the frame or add `fixed_lens`; `video-prompts` has the motion rules |
| A reel that looks like five different films | back to the look: same world, light, grade and style words in every image prompt |

## References

- [script and beats](references/script-and-beats.md): structures, pacing, narration,
  fit rule, look block, shot list
- [storyboard and reviews](references/storyboard-review.md): style frames, first and
  last frames, continuity, contact sheet, animatic, the two approvals
- [assembly](references/assembly.md): ffmpeg commands for trim, join, crossfade, mix,
  loudness, captions, export and checks

## Sources

- Adapted from higgsfield-ai/skills, higgsfield-video-explainer/SKILL.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from higgsfield-ai/skills, higgsfield-video-explainer/references/prompts.md (MIT, Copyright (c) 2026 Higgsfield AI).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-director/SKILL.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-scene/SKILL.md and 1_Skills/vg-scene/references/beat-sheets.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-storyboard/SKILL.md (by Andre Tansil).
- Adapted from tansilandre/ai-videographer-kelas, 1_Skills/vg-edit/SKILL.md, 1_Skills/vg-edit/references/edit-spec.md and 1_Skills/vg-edit/references/edit-stack.md (by Andre Tansil).
