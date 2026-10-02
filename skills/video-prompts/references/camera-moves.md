# Camera moves: the library

One move per clip. Each entry gives the wording, the speed, what must not happen and where it
fits. Names follow the common camera-control vocabulary of video tools; the wording is for
prompts on kie.ai models. Speeds are starting points for a 6 to 8 s clip.

## How to write any move

`<move> <direction>, <distance or duration>, <easing>, ending <end frame>; hold <1.5 to 2 s>.
<What stays still>.`

- The **end frame** is what the viewer sees when the move stops. Without it the model drifts,
  overshoots or plays the move back.
- The **hold** gives the editor a clean cut point and reads as intentional.
- Say what does *not* move when it matters ("no pan, no tilt", "horizon stays level").
- A model with a camera-lock field (Seedance `fixed_lens`) is told to hold the camera by that
  field; still write "locked-off, no camera movement" in the prompt for a static shot.

## The moves

| Move | Wording (example) | Speed | Fits | Must not |
|---|---|---|---|---|
| **Static** | locked-off tripod, no camera movement | none | detail inserts, lip-sync lines, before and after | drift, zoom |
| **Handheld** (texture) | handheld, slight natural sway, framing never changes | none | UGC talking, selfie | chaotic shake, reframing |
| **Selfie follow** | selfie at arm's length while walking, arm sways with each step | walking pace | UGC hook, vlog | the phone becoming visible |
| **Friend follow** | friend-held phone walking backwards in front of her, keeps her chest-up | walking pace | walk and talk, lifestyle | speed changes between clips |
| **Push-in (dolly in)** | slow push-in of about one metre over 6 s, eases out, ends with the window centred | 0.15 to 0.2 m/s | reveals, emphasis, interiors | zoom look, warping walls |
| **Pull-out (dolly out)** | slow pull back from the detail over 6 s, ends showing the whole room | 0.15 to 0.2 m/s | detail to place reveal | new objects appearing at the edges |
| **Lateral glide (truck)** | gimbal glides left parallel to the counter over 6 s, ends with the island centred | slow | kitchens, facades, bedrooms | parallax errors, bending lines |
| **Pan** | pans right about 30 degrees over 5 s, stops on the door | about 6 degrees/s | following a view, scanning a room | whip, overshoot |
| **Tilt up** | tilts up from the floor to the ceiling over 5 s, stops on the skylight | about 10 degrees/s | tall ceilings, stairs, facades | pan mixed in |
| **Arc (orbit segment)** | arcs 20 degrees right around the island at 2 m distance over 6 s | slow | islands, products, a standing presenter | a full 360 degrees, speed changes |
| **Crane up / jib** | rises from 1 m to 3 m over 6 s, revealing the garden behind the wall | slow | gardens, reveals over an obstacle | tilt mixed in |
| **Threshold walk** | walks through the doorway at walking pace, crosses the threshold at 3 s, eases to a stop | walking pace | room to room, entry reveal | doors bending, the door opening itself |
| **Window approach** | moves slowly toward the window until the view fills the frame | slow | view reveal | the view changing |
| **Drone approach** | aerial, 120 m, tilted 40 degrees down, glides forward over the rooftops, stops with the park centred | constant | establishing, location | rotation, tilted horizon |
| **Drone rise / pullback** | rises and pulls back from the facade to reveal the neighbourhood | constant | endings, context | spinning |
| **Top-down** | overhead, looking straight down, slow drift across the desk | slow | layouts, food, desks | perspective change |
| **Hyperlapse** | hyperlapse forward along the boulevard, dawn light turning to morning | n/a | transitions, time passing | people morphing |
| **Focus pull** | focus shifts from the foreground detail to the room behind | n/a | details, depth | the camera moving |

Moves that rarely work and read as "AI demo": crash zoom, 360 degree orbit, bullet time, whip pan,
dolly zoom, FPV weaving through interiors. Use them only when a shot is designed around them.

## Space to move map (interiors, buildings, places)

| Space | Move | Note |
|---|---|---|
| Exterior or facade | drone approach, or lateral glide along the facade | end on the entrance |
| Entry | threshold walk | cross the doorway at about 3 s |
| Living room | slow arc or lateral glide | end on the best view |
| Kitchen | lateral glide along the counter, or a short arc around the island | end with the island centred |
| Bedroom | slow push-in toward the bed or window | short move |
| Bathroom | threshold, then a short push-in | reflections are risky: keep mirrors out of the move |
| Window or view | window approach | the view is the payoff |
| Tall ceiling or stairs | tilt up | |
| Garden or terrace | crane up, or pull-out | |
| Details (lock, tap, material) | static macro, or pull-out with focus shift | raking light shows texture |

**Anti-warp ladder.** Architecture bends when the model fills too much motion:

1. One slow move, about 5 to 6 s, easing in and out.
2. Furniture melting: shorten the push-in.
3. Doorway or wall bending: switch to a lateral glide.
4. Still bending: static camera with a light change only, or skip the room.

## Genre defaults

| Register | Use | Avoid |
|---|---|---|
| UGC and vlog | handheld, selfie follow, friend follow, static | dolly, crane, drone in the same shot |
| Property and place tour | push-in, glide, arc, threshold, tilt, crane, drone | handheld shake, fast moves |
| Product and detail | static macro, slow arc, push-in | handheld |
| Landscape and area | drone approach, pullback, hyperlapse | tight shots |

Consecutive shots should not repeat both the shot size and the move. Vary one of them at each cut.

## Model notes

- **Veo 3.1:** holds architecture and light well in our notes. Name the move in plain words. With
  first and last frame, describe the transition only; the frames define the endpoints. A push-in
  can come back as a sideways glide when the subject is off-centre: name the end frame ("until the
  door fills the centre third"), or keep the glide if it reads as real footage.
- **Seedance 1.5 Pro:** picks a move on its own when the prompt is vague (observed). Always name
  one. For a locked shot set `fixed_lens` as the schema describes it.
- **Gemini Omni Flash:** motion is rated weaker in our notes. Keep moves small and slow.
- **Kling AI Avatar Pro:** the camera is not directed. The frame sets the framing; use a
  steady selfie-style frame and direct gaze and manner only.
