---
name: generate-media
description: >-
  Plan, price, and generate images, video, music, speech, sound effects, avatars,
  lip-sync clips, and media edits through Kie.ai, with any of the 200+ models in its
  live catalog. Use for media creation or editing, model selection, model health,
  credit balance, generation price questions, and pricing audits. Always prepare and
  present a plan before any paid generation, then wait for explicit user approval.
---

# Generate media

Use the server's approval-bound workflow for every paid media request. MCP does not
expose or allow direct image, video, or audio tool calls unless its operator sets
`KIE_AI_ALLOW_DIRECT_GENERATION=true`, which deliberately bypasses approval
safeguards. Do not request that bypass for a user-requested generation.

## Workflow

1. Pick a model. These calls are free:
   - `search_models` searches kie.ai's live catalog of 200+ models by words, task type
     or provider (for example `query: "veo"` or `taskType: "Image to Video"`) and shows
     kie.ai's price text for each.
   - `get_model_status` shows a model's current price text and its success rate over
     the last hour and day. Avoid a model whose health is `degraded`.
   - `get_model_schema` lists a model's input fields, which are required, allowed
     values and defaults, with a minimal example. Never guess field names.
   - `list_models` lists only the hand-tuned tools (such as `gpt_image_2` or
     `kling_video`), which add safe defaults. Prefer one of those when it covers the
     request; otherwise use `run_model` with any catalog model.
   - `get_balance` shows the credits left.
2. Call `prepare_media_generation` with one to six independent `{ tool, args }`
   items. For a catalog model use `{ "tool": "run_model", "args": { "model": "<id>",
   "input": { ... } } }`. It validates every item (run_model inputs against the model's
   live schema), applies only missing safe policy defaults, resolves model and mode,
   quotes verified credit formulas or shows kie.ai's price text, and stores a plan. It
   does not create provider tasks. Media inputs must be public URLs: upload local files
   with `upload_file` first.
3. Present the complete returned plan. For each item, show the tool, model, mode,
   user settings, applied defaults, effective settings, output count where applicable,
   reference inputs, price state (and kie.ai's price text when there is no exact quote),
   and any warnings, such as a field the model's schema doesn't list. Do not present USD unless the user configured an
   account-specific conversion outside this skill.
4. Get approval. The `status` and `next_step` that prepare returns say which mode the
   server is in (the person who runs it chooses; you can't change it):
   - **Form mode (default):** the app shows the person an approval form. Only an accepted
     form changes the plan to `approved`. If they decline, or the app can't show forms, the
     plan stays `prepared`: tell them how to approve it (in a terminal with the CLI, or by
     setting `KIE_AI_APPROVAL=chat`), and do not submit.
   - **Chat mode:** show the person every item with its price and the total, and ask a plain
     yes or no. Only after they say yes to this exact plan, call `approve_media_generation`
     with the `planId` (add `acceptUnknownPrice: true` only if you told them a price is
     unknown). Never approve on their behalf, and never reuse an earlier yes.
   - **Auto mode:** plans within the auto-approve limit come back `approved` already; others
     need a person as above.
   - **Blocked:** a plan over a credit cap comes back `status: "blocked"` with the reason and
     is not saved. Offer cheaper settings or fewer items; only the person who runs the server
     can raise a cap.
   Never treat an earlier request to generate as approval of a plan the person hasn't seen.
5. After approval only, call `submit_media_generation` with the `planId`. Do not supply
   replacement request arguments. A plan expires, its hash detects changes, and it can be
   submitted only once; submit checks the caps again. If some items fail, the result still
   lists the tasks that were created and are being charged: wait for those, and plan only the
   failed items again. Never resubmit work that already has a task ID.
6. Use `wait_for_task` (or `get_task_status`) for each task ID. Report `creditsConsumed`, the
   real charge, next to the plan's quote or estimate.

The CLI uses the same tools. In a terminal, submit shows the plan and asks the person to type a
code; an agent's shell has no terminal, so in form mode an agent can't approve through the CLI:

```bash
# Prepare only. This creates no provider tasks.
node bundle/kie-cli.mjs prepare_media_generation \
  --items '[{"tool":"nano_banana_image","args":{"prompt":"A red panda coding"}}]' --json

# A person, in their own terminal: shows the plan and asks for a code.
node bundle/kie-cli.mjs submit_media_generation --planId <plan-id>

# Chat mode only, after the person said yes in chat:
node bundle/kie-cli.mjs submit_media_generation --planId <plan-id> --approve <plan-id> --json
```

## Prices and caps

- `exact`: a verified rate-card formula. `estimated`: an upper bound from kie.ai's price text
  for the requested resolution and duration (the real charge is usually lower; when kie.ai lists
  several modes the request can't choose, it is the dearest). `unknown`: say so plainly.
- Caps, set by the person who runs the server: `KIE_AI_MAX_CREDITS_PER_PLAN` (default 150) and
  `KIE_AI_MAX_CREDITS_PER_DAY` (default 600, counting real charges where known).

## Safe policy defaults

- Nano Banana: Lite model and 1K where the request did not select a model or resolution.
- Seedance 2.5: 720p, 5 seconds, audio disabled.
- Kling 3.0: `std`, 5 seconds, audio disabled.
- Veo: `veo3_fast`.
- MiniMax H3: 5 seconds, and 16:9 for text-to-video.

Every applied default must appear in the prepared plan. An explicit user value always
wins over policy.

## Pricing operations

`/generate-media price <generation request>`: prepare the request, show its credit
state, and wait for approval before submission.

`/generate-media pricing audit`: run `npm run pricing:audit`. This reports catalog
coverage, unknown tools, and stale verified evidence. It does not fetch or write data.

`/generate-media pricing refresh`: run `npm run pricing:refresh` for a read-only report
of source freshness and current formula evidence. It does not fetch, scrape, or mutate
anything.

`/generate-media pricing refresh --apply`: run `npm run pricing:refresh -- --apply`.
Without a validated proposal file this is an explicit no-op. With `--proposals <file>`,
it can write only `packages/core/src/pricing/evidence-manifest.json`, never rate-card
TypeScript. Each exact-credit proposal must include its scope, HTTPS source URL,
fingerprint, verification date, and existing test-file references. Code-review and a
separate tested edit remain required before copying a proposal into `rate-card.ts`. Do
not scrape pages to invent rates, add estimates, or add a fixed USD conversion.

Current exact formulas are intentionally limited to Nano Banana 2 Lite at four credits
per image and MiniMax H3 reference-to-video at 768p, at 16 credits per second. Every
other request is `unknown` until verified.

## Field notes

Before planning work on a model, skim [kie.ai field notes](references/kie-field-notes.md): API
errors, file lifetimes, content-filter rewording and per-model traps seen on the live API.
