# Hook library

The first 1.5 to 3 seconds of a short-form video decide whether it gets watched at all. This
library is adapted from general short-form UGC practice. It is not specific to any model. The
structures and example lines below are in English for reference; write the actual line in the
language the viewers speak, and keep it inside the dialogue fit rule (`SKILL.md`).

A hook has one job: create an unresolved tension the viewer needs closed. If the first frame or
the first line resolves that tension immediately, the viewer scrolls past.

## The eight hook structures

### 1. Counter-intuitive claim
State something that contradicts what the viewer believes.
- Example line: "You've been doing this the wrong way the whole time."
- Works because disagreement is uncomfortable and people stay to resolve it.
- Risk: it must pay off later, or it reads as clickbait.
- First frame: face, direct to camera, subject not yet visible.

### 2. Pain-point callout
Name the specific problem the viewer is living with right now.
- Example line: "If this happens to you every time, here's why."
- Works because recognition is instant and personal.
- Risk: too broad and it lands on nobody. Name the specific symptom, not a category.

### 3. Result first
Show the outcome, then rewind to explain.
- Example line: "Okay, three weeks ago this looked completely different."
- Works because the payoff is visible before the ask.
- Risk: the result must be visually obvious. A subtle result is not a hook.

### 4. Deliberate withholding
Create an unfinished action or an unnamed object.
- Example line: "I wasn't going to post about this."
- Works because incomplete information is uncomfortable.
- Risk: overused. It needs a specific tease, not a generic one.

### 5. Identity callout
Name the group the video is for.
- Example line: "This is for anyone who's tried literally everything already."
- Works because self-selection is instant and strong.
- Risk: it narrows the audience. Fine for a targeted brief, weak for pure reach.

### 6. Gentle conflict
Introduce mild opposition.
- Example line: "My friend said this was a waste of money. I did it anyway."
- Works because social tension pulls attention.
- Risk: keep it light. Real conflict is uncomfortable and people scroll away.

### 7. Action in progress
Start mid-action, no preamble.
- Example: opens on hands already doing something, no greeting.
- Works because there is no ramp-up to skip past.
- Risk: it needs a visually interesting action from frame one.

### 8. Specific number
Anchor credibility with a concrete figure.
- Example line: "Three things. Twelve minutes. That's it."
- Works because specificity reads as evidence.
- Risk: the number must sound plausible. Round numbers sound invented.

## What never works

| Opening | Why it fails |
|---|---|
| "Hi guys, welcome back" | pure preamble, zero tension |
| "Today I want to talk about..." | announces instead of engaging |
| "This is amazing" | resolves the tension immediately |
| A logo or title card first | dead time before the hook starts |

The first second needs a claim, a problem, an action or a number. Nothing else earns the second
second of attention.

## Matching the hook to the first frame

| Hook structure | First frame should be |
|---|---|
| Counter-intuitive | face, direct to camera, subject not yet in frame |
| Pain-point | face, tighter framing, mild frustration |
| Result first | the result itself, in close-up |
| Withholding | hands holding something partially hidden |
| Identity callout | face, direct address, medium framing |
| Conflict | face, amused or defiant expression |
| Action in progress | hands mid-action |
| Specific number | face, with the number added as a caption in the edit |

Make this frame first (`image-prompts`), then write the clip prompt around it.

## Permission to be imperfect

Dialogue for a hook should have the texture of real speech, not a polished script line: filler
words, a short self-correction, a slightly wrong word left uncorrected. That reads as a person, not
an ad read. Keep every line inside the fit rule: a "real" line that runs long is cut off like any
other.

## Writing the hook into the clip prompt

- The first word lands before about 0.8 s. Say it in the prompt: "she starts speaking within the
  first second, no greeting".
- Put the most important change in the first second of the clip, not the last. Timing inside the
  first 2 seconds: 0 to 0.5 s the image lands and the viewer knows where they are; 0.5 to 1 s the
  change starts (movement, light, the first word); 1 to 2 s the promise is clear.
- A talking hook clip runs 6 to 8 s; a visual hook clip 4 to 6 s and is usually cut to 1.5 to
  3 s in the edit.
- On-screen text, if any, lands within about 0.5 s. It is added in the edit, never in the video
  model.

## Visual hooks (no line needed)

A hook can be a picture that makes a promise. It must pay off within about 2 seconds of screen
time.

| Visual hook | First frame | Move (see [camera moves](camera-moves.md)) |
|---|---|---|
| Door opens onto the interior | closed door from the hallway | threshold walk as the door swings in |
| Light floods a dark room | dim room, curtains closed | static; curtains open, light sweeps the floor |
| Window view reveal | inside, window small in frame | window approach until the view fills the frame |
| Detail pulls back to the whole | macro of a material, object or fixture | pull-out with a focus shift |
| Drone drop to the place | wide aerial of the area | drone descent ending on the entrance |
| Before to after flash | the "before" frame | locked camera; hard cut to the same framing "after" |
| Result first | the finished result | slow push-in; then rewind in the edit |

## Every hook names its payoff shot

If the hook promises "I'll check it myself", a later shot must show the person checking, on
screen, at the place. When you write a hook clip, write down which shot pays it off.
