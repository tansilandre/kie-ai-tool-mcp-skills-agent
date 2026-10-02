# The motion prompt formula, layer by layer

The deep dive behind `SKILL.md`. Use it when writing a prompt from scratch or when a clip feels
wrong. The rules apply to Veo 3.1, Seedance 1.5 Pro, Gemini Omni Flash and Kling unless a line
names one model. Field names and limits per model: [models](models.md).

Order inside the prompt: **camera, action, performance, audio, locks**. Keep the body to 50 to 100
words. Earlier words weigh more, so put the thing the shot depends on most first. Fields accept
far more (Seedance 3 to 20,000 characters, Gemini Omni Flash 20,000), but a long prompt gives the
model more to contradict the frame with. Short is the default; the advice that models distort on
very long prompts comes from another provider's guide and is not measured on kie.ai.

## Basics

- Be concrete and sensory. Verbs that work for motion: pushes in, glides left, pans, tilts up,
  rises, settles. Subject motion in physical terms: "smoke rises slowly", "the dancer spins".
- A frame is attached: the prompt describes motion only. "A man with brown hair in a leather
  jacket holding coffee, moving" competes with the frame. "He lifts the cup and takes a sip" does
  not.
- Phrase positively. Not "no blur": "tack sharp". Not "no people": "empty street, nobody in
  frame". See [avoid list](avoid-list.md).
- Use the aspect ratio the video is for: `16:9` landscape, `9:16` social, `1:1` square. Which
  ratios a model accepts differs; read the schema. Match the clip's `aspect_ratio` to the frame.
- Everything on screen that is text, a logo or a number is added in the edit, never asked of the
  video model.

## Layer 1: Camera (one move, with an end)

Say the shot type, the one move, its speed or duration, where it ends, and the hold:

```
Handheld phone video at chest height, a friend walking half a step behind her; the camera keeps
pace, then settles and holds for the last 2 seconds.
Slow lateral glide left along the kitchen counter over 6 seconds, ending with the island centred;
hold 1.5 seconds.
Locked-off tripod shot, no camera movement.
```

- Every move needs an **end frame**. Without one it drifts, overshoots or reverses.
- One primary move plus at most one texture ("slight handheld drift"). Never two primary moves.
- Speed as time or distance ("over 6 seconds", "about one metre forward"), never "fast".
- Field of view in degrees when it matters: 107 degrees architectural ultra-wide (verticals
  straight, no fisheye), 84 wide, 63 normal-wide, 47 normal, 29 short tele.
- Named moves and wording: [camera moves](camera-moves.md).

## Layer 2: Action (one beat, ending in a state)

**One physical action per 4 to 6 s, present tense, ending in a completed, visible state.**

| Abstract (avoid) | Physical (use) |
|---|---|
| she demonstrates the product | she lifts it into frame, turns it so the front faces the lens, and holds it still |
| she talks about the place | she speaks to the lens, glances toward the window on the last words, and looks back |
| the drone shows the area | the camera glides forward 40 m above the rooftops and stops with the park centred |
| she opens the door | her hand presses the handle down, the door swings in to about 90 degrees, and stays open |

- Chain actions **in one direction**. A clip with time left over plays the action back in reverse.
- For manipulation (opening, pouring, pressing), write the chain: what the object is, what holds
  it, where the force goes, how the material reacts, the end state. A verb alone gives a mime.
- Walking: heel strikes, feet alternate, one foot always down; the same pace in every clip of the
  walk.
- Marketing verbs (demonstrates, showcases, presents, elegantly) pull toward a staged ad. Avoid them.
- Two actions need two shots, or timed phases in an 8 s clip: "0 to 3 s ..., 3 to 8 s ...".

## Layer 3: Performance (people only)

- **Micro-life:** a visible micro-event every 1 to 2 s: a blink every 2 to 4 s, a breath before
  speaking, a weight shift before moving, a loose strand of hair and the shirt moving a fraction
  behind.
- **Eyes with a task:** "her eyes check the viewer's reaction after the price", "she glances at the
  window as if checking the light". Eyes reach a target before the head turns.
- **Physics, not labels:** "the corners of her mouth lift, eyes crinkle, a short exhale through the
  nose" instead of "she looks delighted". Emotion keeps inertia: breathing stays uneven after a
  big moment.
- **Business:** give the person a physical task (a hand runs along the counter, she opens a blind)
  and let her talk over it. The moment she stops the task is the accent.
- UGC register: slight off-lens glances, loose imperfect framing. Avoid the fixed "endorsement
  smile" into the lens.

Physics verb bank: heel strikes, weight shifts, exhales through the nose, eyes crinkle, jaw
relaxes, breath before the line, hair settles a beat late, fabric trails the step, hand rests,
grip tightens, eyes reach the target before the head.

## Layer 4: Audio

Talking shot:

```
AUDIO: warm, clear woman's voice in her late twenties, casual Jakarta Indonesian, curious:
"Antrian di sini sudah panjang dari jam tujuh. Aku coba dulu, ya." — only this line, nothing
else. She keeps walking while she speaks, then smiles on the last word. Anyone else in frame:
lips at rest, jaw closed. Open-air street ambience with distant traffic under her voice. No
music, no subtitles.
```

(The line is 64 characters: it fits an 8 s clip, whose maximum is 76, and uses more than half of
it.)

- Name the language and register before the line. Spell numbers and abbreviations as spoken.
- Give a delivery tag: warm, curious, flat, whispered. One speaker per clip.
- Non-speakers get a positive mouth state: "lips at rest, jaw closed", not "listens without
  speaking".
- Dialogue fit rule, floor and lip-sync conditions: `SKILL.md`, "Dialogue and lip-sync".

Non-talking shot:

```
AUDIO: footsteps on polished tile as the camera moves in; faint street sound through the window.
Nobody speaks. No music, no subtitles.
```

If the audio line would be only negations, add a sound to generate (see `SKILL.md`, "Audio in
generated clips"). One dominant sound per action, tied to what is visible. Reuse the same ambience
sentence in every clip of the same space so the cuts do not jump.

## Layer 5: Locks (positive constraints)

```
LOCKS: her face, hair and shirt stay identical to the first frame; verticals stay straight; the
light stays constant; the room keeps its layout.
```

Only a few short bans where the model's default is the failure:
`No music, no subtitles, no on-screen text.` Full guidance: [avoid list](avoid-list.md).

## No frame: text to video

With no still, the prompt carries the look, so spend words on it, still in this order:

1. Subject and setting in one sentence ("a barista in a small corner cafe at 7 a.m.").
2. Look as measurable facts: lens or field of view, light direction and colour temperature,
   handheld or locked.
3. Then the layers above: camera, action, performance, audio, locks.

If the look must be the same across clips or must match a brand, make a still first with
`image-prompts` and animate that: images are cheaper than clips and a still can be judged before
any video credit is spent.

## First and last frame

Use two frames when the clip must travel from one known state to another (a doorway to the room
beyond, a before and after, an object closed then open).

- The frames define the endpoints. Describe only the transition: one continuous move or action
  between them.
- Both frames must share space and light.
- Veo: put both images in `image_urls`. Seedance: both in `input_urls`. Omni: older notes list a
  `last_frame_url` field; confirm with `get_model_schema` before planning a last frame for Omni.
  Veo with two frames: use 8 s unless a 4 or 6 s pilot shows otherwise (the need for 8 s is
  unverified).
- A true before and after is also a locked camera plus a cut in the edit; no model call needed.

## Shot recipes

Each shot has a job. Pick the recipe, then write the prompt.

| Shot | Job | Frame and move | Length | Sound | Watch out |
|---|---|---|---|---|---|
| Talking hook | stop the scroll with a line | selfie or friend-held, medium close-up; handheld texture, framing never changes | 6 to 8 s; first word before about 0.8 s | the line only | fit rule and floor; one face |
| Visual hook | stop the scroll with an image | the start of a reveal; door opens, window approach, pull-out from a detail | 4 to 6 s, cut to 1.5 to 3 s | one sound | the payoff must be visible in 2 s |
| Talking call to action | the offer and what to do | medium close-up, steady; static or very slow push-in | 6 to 8 s | the line only | settle to a steady frame at the end |
| Walk and talk | move through a place while talking | chest-up, friend-follow at walking pace | 8 s | line plus footsteps | gait physics; same pace in every clip |
| Lifestyle b-roll | the life around the subject, under voice-over | presenter in the world; slow glide or static | 4 to 8 s, cut to 2 to 3 s | ambience, mouth closed | no lips moving |
| Room or place reveal | show a real space | real photo as the first frame; push-in, glide or arc | 6 s, cut to 2 to 3 s | room tone, one sound | the prompt names only camera and light |
| Threshold reveal | move between two spaces | first and last frame; walk through a doorway | 8 s | footsteps changing surface | door geometry |
| View reveal | the view from a window | inside, window in frame; window approach | 6 s | birds, street outside | the view must stay the same |
| Detail insert | prove a feature | macro, raking light; static or pull-out with focus shift | 4 s, cut to 1.5 to 2 s | one tactile sound | hands; no text |
| Aerial establishing | where it is | drone approach or pullback | 8 s, cut to 3 to 4 s | wind, distant traffic | invented geography: start from a real photo |
| Transition | bridge two looks or places | first and last frame; one continuous move | 4 to 8 s | a natural sound, no whoosh | the two frames must share light |
| Photo move | a real photo that must not be AI-animated | none: slow push or pan in the edit | 2 to 4 s | music or voice-over | free and safe |

Typical sequences: a place or product tour runs hook, aerial or wide establishing, three to five
reveals and details, lifestyle b-roll, call to action. A UGC review runs talking hook, walk and
talk or b-roll (the claim), reveal or detail (the proof), call to action. Vary the shot size or
the move at every cut.

## Worked examples

### UGC talking head, Veo 3.1, 8 s, first frame only

```
Handheld selfie video, arm's length, parked car with the engine off; slight sway from her arm,
the framing never changes. She speaks to the lens with genuine curiosity, one eyebrow lifting on
the question; on the last words she glances at the side window and back to the lens, then holds
a small smile for the final 1.5 seconds. Blink every few seconds, a breath before she starts.
AUDIO: warm, clear woman's voice in her late twenties, casual Jakarta Indonesian, curious:
"Antrian di sini sudah panjang dari jam tujuh. Aku coba dulu, ya." — only this line, nothing
else. Quiet car cabin, no engine. No music, no subtitles.
LOCKS: her face and shirt stay identical to the first frame; the car does not move.
```

### Room from a real photo, Veo 3.1, 6 to 8 s

```
Slow push-in of about one metre over 6 seconds from the doorway toward the living room window,
eye height 1.5 m, 107 degree rectilinear view, verticals stay straight; the move eases in and
out and holds for the last 2 seconds with the window centred. Late-afternoon sun from the
window, about 5000 K, soft shadows across the floor.
AUDIO: quiet room tone, a faint bird outside. Nobody speaks. No music, no subtitles.
LOCKS: every wall, door, furniture piece and material stays exactly as in the first frame;
nothing is added or removed.
```

Do not describe the room. The photo is the room. On a real-photo first frame never ask for
foreground parallax ("the tree in front slides past"): the model invents objects to supply it.
Write "nothing new enters the frame".

### Threshold reveal, first and last frame, 8 s

```
Steady forward walk through the doorway at walking pace, the camera crossing the threshold at 3
seconds and continuing into the bright kitchen, easing to a stop with the island centred as in
the last frame; hold 1.5 seconds. Warm hallway light gives way to cool daylight in the kitchen.
AUDIO: two soft footsteps on wood, then tile. No music, no subtitles.
LOCKS: both rooms keep their layout and materials from the two frames.
```

### Detail insert, Seedance 1.5 Pro, silent, 4 s

```
Locked-off macro shot, 29 degree view, on the brushed-steel smart lock; a finger presses the
keypad once, the green light blinks, the handle turns down and stops. Raking light from the left
shows the brushed texture.
LOCKS: one hand, one finger; the lock and door stay identical to the first frame.
```

Silent means `generate_audio` off, which halves the price per second.

### Aerial establishing, Veo 3.1, 8 s

```
Aerial drone shot, 120 m, camera tilted 40 degrees down; constant slow forward glide over the
warehouse roof and across the highway over 7 seconds, stopping with the green park centred;
level horizon, no rotation. Bright mid-afternoon sun from the left.
AUDIO: wind and a distant traffic hum. No music, no voice, no subtitles.
LOCKS: buildings and roads keep their shapes; cars stay in their lanes.
```

### Lifestyle b-roll with a person, no speech

```
Friend-held phone at chest height walking backwards in front of her; she walks toward the lens
at an easy pace, heels landing first, one foot always on the ground; she glances left at the
palm trees, then back to the lens with a small smile. Mouth closed, not speaking. Hair and shirt
move a fraction behind her steps.
AUDIO: footsteps on paving, birds, distant traffic. No music, no subtitles.
```

### Pouring: a manipulation chain, 6 s

```
Locked-off medium close-up on a ceramic teapot held by its handle in her right hand; she tips it
forward about 30 degrees until a steady stream of tea falls into the glass on the table, the
glass fills to the line, she tips the pot back upright and sets it down, hand resting on the
handle. Steam rises from the glass.
AUDIO: tea pouring into glass, one soft clink as the pot lands. Nobody speaks. No music, no
subtitles.
LOCKS: one hand, five fingers; the teapot and glass stay identical to the first frame.
```

### Lip-sync direction, Kling AI Avatar Pro

```
She talks directly to the viewer through the phone camera: her eyes stay on the lens the whole
time and never look down or away, like talking to a friend on a video call; an open friendly
expression, small natural nods, quick natural blinks. Her face, hair, outfit, the background and
the light stay exactly as in the picture.
```

The audio carries the words. The first frame carries the eye contact.

## Diagnosing bad output

Full table and the stop rule: [diagnosing](diagnosing.md). The five most common:

| Symptom | Fix |
|---|---|
| Looks staged, like an AI ad | name a real camera situation (phone, friend holding it); delete slop words; add micro-life |
| Camera drifts or reverses | add the end frame and a hold |
| Motion stiff or floaty | physics verbs, completed state, micro-events, one beat |
| Extra mumbled words | line too short for the clip: shorten the clip or add a silent action; "only this line" |
| Room warps | shorter, slower move; lateral glide instead of push-in; stop re-describing the room |
