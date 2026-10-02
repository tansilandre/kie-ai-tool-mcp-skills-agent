# Video models on kie.ai: fields, limits, prices, quirks

Facts here were checked against the live API between 2026-09-24 and 2026-10-02. Prices and
catalogs change. Before a plan, call `get_model_schema` (input fields, required, allowed values)
and `get_model_status` (price text, success rate). `run_model` refuses a field the schema does
not list, so never guess a field name. Where a line says "unverified", nobody has confirmed it on
kie.ai.

All media inputs must be public URLs: use `upload_file` for local files. Uploads live about 24
hours; generated results are kept 14 days. Download what you keep (`curl -L -o clip.mp4 <url>`).
Every generation goes through the `generate-media` plan workflow; credits are quoted there.

## Input images

- Send a modest file. On 2026-09-24 every Gemini Omni Flash task given full-size 2K PNGs (5 to 8
  MB) ran 200 to 500 s and then failed with a 500 (charged 0). The same frames as JPEGs of about
  0.3 to 0.6 MB, around 1080 px, succeeded in about 136 s. kie.ai's workers fetch inputs from a
  temporary file host and time out. The cause was found on Omni; the advice is sensible for every
  model.
- Downsize before uploading: `ffmpeg -i frame.png -vf scale=1080:-2 -q:v 3 frame.jpg` for a
  portrait frame (`scale=-2:1080` for landscape). Look at the result.
- Match the clip's `aspect_ratio` to the frame.

## Veo 3.1 (`veo-3-1`)

| Field | Notes |
|---|---|
| `prompt` | the motion prompt |
| `image_urls` | 1 image = start image; 2 = first and last frame |
| `generation_type` | `TEXT_2_VIDEO`, `FIRST_AND_LAST_FRAMES_2_VIDEO`, `REFERENCE_2_VIDEO`. Read the schema for which value goes with one start image; do not guess |
| `aspect_ratio` | 16:9, 9:16, Auto |
| `resolution` | 720p, 1080p, 4k |
| `duration` | 4, 6 or 8 seconds |

- **Price:** kie.ai's price text lists Lite, Fast and Quality modes: 720p 30 / 60 / 250, 1080p 35 /
  65 / 255, 4K 150 / 180 / 370 credits per video. Veo 3.1 Lite through the hand-tuned
  `veo3_generate_video` tool (`model: "veo3_lite"`, 720p) has an exact price of 30 credits per clip
  up to 8 s (35 at 1080p): prefer it as the cheap Veo path. The catalog model `veo-3-1` through
  `run_model` can't choose a tier, so plans estimate its dearest tier. The same tool also covers
  `veo3` and `veo3_fast` (see `list_models`).
- **Observed (Veo 3.1 Lite on kie.ai's legacy endpoint):** 30 credits (720p) or 35 (1080p) per 8 s
  clip; about 2.5 minutes; 5 of 5 first-try successes.
- **Voice:** no voice lock. Voices differ between clips. Repeat the same voice description word
  for word, keep spoken lines short, and use one speaker per clip. For one consistent voice across
  a video, use lip-sync with your own recorded audio (Kling AI Avatar Pro below).
- **Audio:** speech and sound come from the prompt. An audio line made only of negations made one
  clip fail with "unable to generate audio for this request": give it a sound to make.
- **Prompt order:** subject action, camera, composition and lens, light and ambience, audio.
  Dialogue in quotes with a delivery tag.
- **Unverified:** whether two frames require 8 s; whether dialogue quality is best in English.

## Seedance 1.5 Pro (`bytedance/seedance-1.5-pro`)

| Field | Notes |
|---|---|
| `prompt` | 3 to 20,000 characters |
| `input_urls` | 0 to 2 images: one = start frame, two = first and last |
| `aspect_ratio` | 1:1, 4:3, 3:4, 16:9, 9:16, 21:9. Required |
| `resolution` | 480p, 720p, 1080p |
| `duration` | 4 to 12 seconds. Required |
| `fixed_lens` | lock the camera |
| `generate_audio` | sound on or off |

Price per second, in credits:

| Resolution | Silent | With audio |
|---|---|---|
| 480p | 1.75 | 3.5 |
| 720p | 3.5 | 7 |
| 1080p | 7.5 | 15 |

A silent 4 s clip at 480p is 7 credits, the cheapest motion test in this skill. A 480p 9:16 clip
is 496x864. Audio doubles the price: turn it on only when the clip must make its own speech or
sound.

- It picks a camera move on its own when the prompt is vague (observed): always name one.
- Write the dialogue, its language, the sound effects, and the music mood or "No music"; 50 to 80
  words.
- Its vendor lists Indonesian lip-sync. This is unverified on kie.ai: pilot a short clip, listen,
  then decide.
- Price scales with seconds: pick the shortest duration that fits the line (`SKILL.md`, "The
  dialogue fit rule").

## Gemini Omni Flash (`google/gemini-omni-flash-1-1`)

| Field | Notes |
|---|---|
| `prompt` | up to 20,000 characters. Required |
| `duration` | a **string**: "4", "6", "8" or "10". An integer is rejected (422). Required |
| `first_frame_url` | one URL: a hard first-frame anchor |
| `image_urls` | up to 7, up to 20 MB each: a soft reference, not a hard frame |
| `character_ids`, `audio_ids`, `video_list` | identity, voice and video inputs |
| `aspect_ratio` | for example "9:16" |
| `resolution` | 360p, 720p, 1080p, 4k; default 720p |
| `seed` | integer, never a string |

Check the schema for the full, current list. Older notes list a `last_frame_url` field; confirm
with `get_model_schema` before planning a last frame for Omni.

- **Mode exclusivity:** `first_frame_url` cannot be combined with `image_urls`, `character_ids`,
  `audio_ids` or `video_list`. Pick one identity strategy per clip: a hard first frame (strongest
  anchor, one shot, no voice binding), a reusable character, or soft `image_urls` (weakest).
- **Use first-frame mode.** For Gemini Omni Flash use `run_model` with
  `google/gemini-omni-flash-1-1`; the hand-tuned `gemini_omni` tool has no first-frame input, and
  first-frame mode is the one that worked. Character mode failed 9 of 9 attempts (2026-09-24 and
  25). In first-frame mode the face is held by the frame and the voice is not locked.
- **Price:** 63 / 84 / 105 / 126 credits for 4 / 6 / 8 / 10 s at up to 1080p; 4K is 147 / 168 /
  189 / 210. Resolution up to 1080p does not change the price.
- **Quota arithmetic** (applies when you mix inputs): `image_urls` entries + 2 per `video_list`
  entry + `character_ids` entries must be 7 or fewer; `character_ids` alone is capped at 3. The
  schema and the plan's validation are authoritative.
- **Content filter:** a fast "500 Internal Error" (under about 90 s) on a shot with a person was a
  content-filter rejection twice. Rewording fixed it: [diagnosing](diagnosing.md).
- **Slow 500:** a 500 after several minutes with large inputs is the oversized-image timeout
  above, not the filter.
- **Naming trap:** `google/gemini-omni-flash-1-1` uses hyphens and the `google/` prefix. A
  separate model, `gemini-omni-video`, has no prefix and does not document `first_frame_url`. It is
  a different model: never add or drop the prefix to "fix" a typo.
- Motion is rated weaker than the others in our notes: keep moves small and slow. There is no
  documented prompting dialect: use the general rules.

## Kling (video)

The toolkit has a hand-tuned `kling_video` tool (see `list_models`; `generate-media` lists its
safe defaults) and the catalog may hold other Kling video models (`search_models` with
`query: "kling"`). This skill has no verified Kling video prompting notes, price or limits. Read
`get_model_schema` and `get_model_status`, apply the general rules, and pilot one short, cheap
clip first.

## Kling AI Avatar Pro (`kling/ai-avatar-pro`)

Lip-sync: it animates a still face to your audio.

| Field | Notes |
|---|---|
| `image_url` | the first frame; eye contact must already be in it |
| `audio_url` | the narration or line, as a public URL |
| `prompt` | gaze and manner only |

- **Price:** 16 credits per second. Output is 1072x1920 at 30 fps and took about 2.5 minutes. In
  one test it gave 4 of 4 first-try successes.
- The audio comes back unshifted. Lips close on "m". Eye contact holds with an eye-contact first
  frame plus a gaze line in the prompt.
- Cut the audio to the line: start 0.2 to 0.4 s before the first word, end in the pause after it.
- The prompt text to use is in [prompt formula](prompt-formula.md), "Lip-sync direction".
- Never swap in a different voice afterwards.

## InfiniTalk (`infinitalk/from-audio`)

Another lip-sync option. It rejects WAV: send MP3, 44.1 kHz stereo. Error 524 is kie.ai's
20-minute task limit in a busy queue; it is not charged. Read `get_model_schema` for its fields.

## Voices for lip-sync

Lip-sync needs recorded audio. ElevenLabs models on kie.ai (text-to-dialogue v3, multilingual v2,
speech-to-text) failed with 500 errors or stayed "waiting" for hours on 2026-09-28 (0 credits
charged). Check `get_model_status` before relying on them, and have a fallback: record a voice, or
use another speech service the person already has. Dialogue v3 has about 60 preset voices
addressed by voice ID, not by name.
