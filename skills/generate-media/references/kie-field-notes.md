# kie.ai field notes

Things that cost time or credits on the live API, each seen at least once between 2026-09-24
and 2026-10-02. Models change: confirm fields with `get_model_schema` and health with
`get_model_status` before relying on a note.

## The API

- kie.ai answers HTTP 200 and puts the error in the body's `code`: 401 means a wrong key, 402
  not enough credits, 422 a field it rejects, 429 slow down, 433 a sub-key's own limit, 455 the
  service is unavailable. The toolkit reports these; don't retry a 401, 402 or 433.
- "The API key is not authorized to use this model" means the key has a model allowlist. The
  user enables the model for their key at https://kie.ai/api-key. kie.ai checks the request
  before the allowlist, so an invalid request can't tell you whether a model is allowed.
- The schema endpoint rate-limits after a few quick calls. The toolkit caches schemas for 24 hours
  and retries with back-off; avoid looping over many models' schemas at once.
- A task that hits kie.ai's 20-minute limit in a busy queue fails with code 524 and is not
  charged. Check `get_model_status` and try later, or pick another model.

## Files

- Inputs must be public URLs. `upload_file` hosts a local file on kie.ai's upload server; it is
  deleted after about 24 hours, so upload again for a later job.
- Results are kept 14 days. Download everything you keep.
- InfiniTalk (`infinitalk/from-audio`) rejects WAV: send MP3, 44.1 kHz stereo.

## Content filters

- A fast "500 Internal Error" (under about 90 seconds) on a shot with a person has been a
  content-filter rejection, not an outage. Twice, rewording the action fixed it: "selfie in the
  driver's seat with a phone" became "in a parked car, engine off"; "woman filmed from behind
  walking away" became "a friend films her walking alongside; she turns to camera". Don't resend
  the same prompt.

## Models

- GPT Image 2 (`gpt-image-2-text-to-image`, `gpt-image-2-image-to-image`): 6 / 10 / 16 credits at
  1K / 2K / 4K, charged exactly as listed. 1:1 can't be 4K; "auto" aspect ratio only gives 1K;
  2K and 4K drop some ratios (see the schema). No seed. About 60 seconds per image.
- Gemini Omni Flash (`google/gemini-omni-flash-1-1`): `first_frame_url` can't be combined with
  `image_urls`, `character_ids`, `audio_ids` or `video_list`; `duration` is a string. Character
  mode failed 9 of 9 times on 2026-09-24; first-frame mode worked. It has also had runs of
  provider-side 500 errors (charged 0): check its health first.
- Veo 3.1 (`veo-3-1`): kie.ai's price text lists Lite, Fast and Quality modes, but the schema has
  no mode field, so a plan's estimate is the dearest mode for the resolution. Voices differ
  between separate clips.
- Seedance 1.5 Pro (`bytedance/seedance-1.5-pro`): `aspect_ratio` and `duration` are required.
  Audio doubles the per-second price.
- Kling AI Avatar Pro (`kling/ai-avatar-pro`): reliable lip-sync, 16 credits per second; give it
  an eye-contact first frame and a gaze line in the prompt.
- ElevenLabs on kie.ai (text-to-dialogue v3, multilingual v2, speech-to-text) failed with 500
  errors or stayed "waiting" for hours on 2026-09-28 (0 charged). Check health before planning
  narration around it, and have a fallback.

## Dialogue

- Measured fit: spoken characters ≤ (clip seconds − 0.7) × 10.5. Longer lines are rushed or cut:
  shorten the line or lengthen the clip.
