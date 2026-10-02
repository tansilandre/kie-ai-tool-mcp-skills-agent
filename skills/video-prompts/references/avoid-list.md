# Locks and the few bans worth writing

The words in a prompt summon things, including the words inside a "no". A long `Avoid:` list of
failures (morphing face, extra fingers, flicker) mostly adds noise and can pull the named failure
in. State what must stay true (positive locks) and ban only what the model does by default when
left alone.

## 1. Positive locks (write these)

One `LOCKS:` line at the end of the body, one to three clauses, specific to the shot:

| Shot | Lock |
|---|---|
| Person from a first frame | her face, hair and clothes stay identical to the first frame |
| Talking head | one face in frame; others: lips at rest, jaw closed |
| Hands | one hand (or: both hands, hers), five fingers each, the object stays in her hand |
| Interior or place from a photo | walls, doors, furniture and materials stay exactly as in the first frame; nothing is added or removed; verticals stay straight |
| Aerial or exterior | buildings and roads keep their shapes; cars stay in their lanes; level horizon |
| First and last frame | the space and light match both frames; one continuous move between them |
| Light | the light direction and colour stay constant |

## 2. Rephrase a negative as a positive

| Instead of | Write |
|---|---|
| no blur | tack sharp |
| no people | empty street, nobody in frame |
| no camera shake | locked-off tripod shot |
| no cuts | one continuous shot |
| no yellow | the only warm light is the lamp at frame right |

Not every model has a negative-prompt field, and Gemini Omni Flash has no real one. A positive
phrasing works on all of them.

## 3. Bans worth writing (the model's default is the failure)

Short, at the end of the AUDIO line or the LOCKS line:

- `No music, no subtitles.` (video models add both by default)
- `No on-screen text.` (add text in the edit instead)
- `Nobody speaks.` or `Mouth closed, not speaking.` on shots without dialogue (with a sound to
  generate next to it: see `SKILL.md`, "Audio in generated clips")
- `Real-time speed, no slow motion` on action
- `No cuts, one continuous shot` when a model tends to cut inside a clip

For Veo, if you do add negatives, write them as plain nouns ("text, watermark, frame border"),
not as instructions ("no walls").

## 4. Don't

- Don't paste a baseline list of 20 failure words into every prompt.
- Don't write "photorealistic", "8K" or "high quality" as fixes. They are noise.
- Don't fix a bad still with prompt words. A drifted face, fused fingers or bad light usually
  comes from the first frame. Regenerate the frame (`image-prompts`).
- Don't name real public figures, sexual content, or trademarked and branded characters. Filters
  on video models reject them (stated in another provider's guide; not measured on kie.ai).

## When a shot keeps failing

1. Read the task's failure reason. A content-filter rejection needs different words (describe
   role, clothes and action; avoid words for minors (girl, boy, young, teen), though an adult age
   like "in her late 20s" is fine; see [diagnosing](diagnosing.md)), not more constraints.
2. Simplify: one move, one action, a shorter clip.
3. Check the frame, not the prompt.
4. One re-roll of an unchanged prompt is fine for a random miss. After that, change one thing per
   attempt. After two failed attempts on the same shot, stop and show the person what you have,
   then rewrite the prompt or fix the still.
