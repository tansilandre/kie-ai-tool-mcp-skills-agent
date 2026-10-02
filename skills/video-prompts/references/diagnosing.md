# Diagnosing a clip: symptom, cause, fix

Watch every clip yourself before you show it: download it, open the first and last frame and a
frame a second (commands in `SKILL.md`, workflow step 6), and listen to speech. Judge it as a
viewer first ("does this look filmed?"), then use the table.

## The stop rule

1. One re-roll of an unchanged prompt is fine for a random miss. After that, change **one thing**
   per attempt and note what changed.
2. After two failed attempts on the same item, stop and show the person what you have. The prompt
   or the still is wrong: rewrite, or regenerate the frame (`image-prompts`).
3. Still failing after a rewrite: **simplify the shot** (shorter, one move, one action, a different
   angle), not the wording.
4. Every re-roll is a new plan the person approves: `prepare_media_generation`, the approval,
   `submit_media_generation`. A plan can be submitted only once. Say what the retry costs.
   Whether a failed task was charged is in `creditsConsumed` in the `wait_for_task` result. If a
   credit cap refuses the plan, tell the person; do not split the call to get around the cap.
5. Salvage first. A "failed" take often has one to three good seconds an editor can use.

## Table

| Symptom | Likely cause | Fix |
|---|---|---|
| A sign, logo, tree or other object appears that is not in the real photo | the prompt asked for foreground parallax ("the tree in front slides past") and the model invented objects to supply it | on a real-photo first frame never ask for foreground elements; write "nothing new enters the frame" and lock signs, trees and people; use the clean stretch of the clip |
| A push-in comes back as a sideways glide | the model read the composition (subject off-centre) as a truck move | name the end frame ("until the door fills the centre third"); or keep the glide if it reads as real footage |
| Fails with "unable to generate audio for this request" (seen on Veo) | the audio line was only negations ("Nobody speaks. No music, no subtitles.") | give it a sound to generate: "soft outdoor ambience, a light breeze, distant birds"; keep "mouth closed" under PERFORMANCE; mute the clip in the edit if the video's sound is made separately |
| A loud invented sound (for example a glass crash under a selfie) | the model fills the audio track with whatever it guesses | listen to every clip; mute its audio in the edit when the video has its own narration and music |
| Looks like a staged AI ad | glossy still; ad words; no micro-life | film-photography still (`image-prompts`); a real camera situation in the prompt (phone, friend holding it); micro-events; delete slop words |
| Plastic, airbrushed skin | the still was beautified or edited twice | regenerate the still with "matte skin, visible pores, no retouching"; never re-edit a face twice |
| Clips do not look like one film | different light and grade per shot | frames chosen for matching light; the same camera treatment in every prompt (light words only for text-to-video); one grade pass in the edit |
| Stiff or floaty motion | emotion words, no physics | physics verbs, completed state, blink, breath and weight shift |
| Action plays forward, then backward | the clip is longer than the action | chain same-direction actions; end state; shorter clip |
| Camera drifts, overshoots or reverses | no end frame | name the end frame, add a hold |
| Jitter, morphing | two moves or too many beats | one move; one beat per 4 to 6 s |
| Walls, doorways or furniture bend | move too long or too fast for architecture | anti-warp ladder ([camera moves](camera-moves.md)) |
| Room grows, objects appear | the prompt described the room; the model invents | describe only motion; lock "nothing added or removed"; use the real photo |
| Gliding walk, sliding feet | walking written as a verb | heel strike, alternation, one foot down; same pace across clips |
| Extra fingers, orphan hands | hands in a busy action | waist-up framing, or hand count and owner; one simple hand action |
| Extra mumbled words, line said twice | the line is too short for the clip | shorter clip, scripted pause or silent action, "only this line" |
| Speech cut off or rushed | the line is too long | the fit rule: split the line or lengthen the clip; check with the tail-silence test below |
| Lips out of sync | head motion, wide framing, a long line | medium close-up, locked camera, no head-turn words, a 3 to 8 s line |
| Person talks to themselves, not the viewer (lip-sync) | the first frame looks away | new first frame with eyes fully on the lens; add the gaze line to the prompt |
| Voice differs between clips | no voice lock on Veo | same voice description word for word; or lip-sync one recorded voice (Kling AI Avatar Pro) |
| Music or subtitles appeared | default behaviour | "No music, no subtitles." |
| Garbled text in the frame | text asked of the video model | remove it; add text in the edit |
| Fast rejection or a quick 500 | content filter | reword (next section) |
| Same defect in every take | the still or the prompt | fix the still; rewrite |

## Content-filter rejections

A rejection that comes back fast on a shot with a person is usually the content filter. On Gemini
Omni Flash it was a "500 Internal Error" in under about 90 s, twice, while other shots succeeded.
Rewording fixed both on the next try:

| Failed wording | What worked |
|---|---|
| selfie in the **driver's seat**, holding the phone ("in the car") | "recorded in a **parked car with the engine off**, the car is standing still" |
| woman **seen from behind, walking away**, "tracking from behind" | "friendly lifestyle vlog **filmed by a friend walking alongside her**; she turns toward the camera and smiles" |

Rules of thumb:

- Remove anything that reads as unsafe behaviour (phone use while driving) or as following or
  watching a person (tracking from behind).
- Describe a person by role, clothes and action. Avoid words for minors (girl, boy, young, teen);
  an adult age like "in her late 20s" is fine.
- Avoid real public figures, sexual content, and trademarked or branded characters.
- The image model (GPT Image 2) rejects the same patterns, so the same rewording helps when a
  still is refused.
- A job that ends "failed" is often a prompt-content or safety problem: rephrase before you retry.
- Do not respond to a rejection by adding more constraints. Change the words, then simplify.

## Provider errors

kie.ai answers HTTP 200 with the error in the body `code`.

| Code or message | Meaning | What to do |
|---|---|---|
| 401 | bad API key | tell the person to check the key |
| 402 | not enough credits | `get_balance`; tell the person; do not split a plan to dodge a cap |
| 429 | slow down | wait and retry later |
| "The API key is not authorized to use this model" | the model is not enabled for the key | the person enables it at https://kie.ai/api-key |
| 422 or a generic parameter rejection | payload does not match the model | re-read `get_model_schema`. On Omni: `duration` must be a string, `first_frame_url` excludes other image inputs, no more than 3 `character_ids`, images under 20 MB |
| 500 after several minutes | oversized input images (seen on Omni with 5 to 8 MB PNGs; charged 0), or a real outage | downsize inputs ([models](models.md)); if it persists, wait and retry as a new plan |
| 524 (InfiniTalk) | kie.ai's 20-minute task limit in a busy queue; not charged | retry later; send MP3 audio, not WAV |
| task stays "waiting" for hours (seen on ElevenLabs speech models) | queue or model problem | `get_model_status`; try a healthy model or another route |

## Truncated speech: measure it

Signature: the clip is `success`, has a full-length audio stream, but the sentence stops
mid-word. First confirm the file is fine:

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,sample_rate,channels \
  -show_entries format=duration -of default=noprint_wrappers=1 clip.mp4
```

If audio and video durations match the requested duration, the loss is in the model's output.
Measure where speech ends:

```bash
ffmpeg -v error -i clip.mp4 -ac 1 -ar 16000 -f s16le - | python3 -c "
import sys, array, math
a = array.array('h'); a.frombytes(sys.stdin.buffer.read())
sr = 16000; win = int(0.05*sr)
rms = [math.sqrt(sum(x*x for x in a[i:i+win])/win) for i in range(0, len(a)-win, win)]
th = (max(rms) or 1) * 0.15
end = max((j for j, v in enumerate(rms) if v >= th), default=-1)*0.05 + 0.05
dur = len(a)/sr
print(f'duration {dur:.2f}s  speech ends {end:.2f}s  tail silence {dur-end:.2f}s')
print('COMPLETES' if dur-end >= 0.25 else 'TRUNCATED')
"
```

| Tail silence | Meaning |
|---|---|
| 0.25 s or more | completed: safe |
| 0.10 to 0.25 s | completed with no headroom: tighten the line before reusing it |
| about 0 s | truncated: speech is still at full level at the cut |

Fix: shorten the line, or move to the next longer duration and recompute with the fit rule. Never
ask the model to "speak faster" and never time-stretch lip-synced or on-camera audio: a rushed or
stretched read is audible. A longer clip costs more credits; say so.

## Identity drift, fused fingers, warped hands

Fix the frame, not the prompt. These are almost always inherited from a weak first frame.

1. Open the frame that was sent. Is the defect already visible there? Then make a new frame
   (`image-prompts`).
2. If the frame is fine but the video drifts, simplify the motion (one clear beat) and shorten the
   clip. Drift compounds with duration.
3. Positive locks ([avoid list](avoid-list.md)) are a supporting guard, not a substitute for a
   clean frame.
4. A re-roll is a new video charge and needs a new plan and approval.

## Lip-sync clips: check against the sound

Compare the loudness of the audio every 0.1 s with a mouth close-up at the same moments. Lips
should close on m, b and p, round on u and w, and open on the breath before a line. Eyes should
stay mostly on the lens. If the mouth is wrong across the whole clip, look at the first frame and the
audio file before you reword the prompt.
