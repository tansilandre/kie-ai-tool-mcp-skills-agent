# Spend controls

Status: built in roadmap step 4 (2026-10-02). Code: `packages/core/src/spend-policy.ts`, `pricing/estimate.ts`, the spend ledger in `database.ts`, `tools/approve_media_generation.ts`, and `packages/cli/src/submission-approval.ts`.

## Problem

1. **Apps without MCP forms can't generate at all.** Approval is an MCP form (elicitation).
   Claude Code shows it in interactive sessions. Headless runs, and apps that don't support
   forms, cancel it, and the plan can never be submitted. The only way out today is
   `KIE_AI_ALLOW_DIRECT_GENERATION=true`, which removes approval entirely.
2. **No credit caps.** Nothing stops a 370-credit 4K video, or a hundred small ones, once
   approved. A plan whose price is unknown can be approved like any other.
3. **The CLI's approval is a flag anything can type.** `submit_media_generation --approve <id>`
   is accepted from any process. The 28 per-model CLI commands spend with no plan at all.
4. **Prices are "unknown" for almost everything**, so caps have nothing to compare against.

## Design

### Approval modes: `KIE_AI_APPROVAL`

| Mode | Who says yes | How | For |
|---|---|---|---|
| `form` (default) | The human | MCP form dialog. CLI: typing a short random code in a terminal | Claude Code interactive, apps with forms, the CLI used by a person |
| `chat` | The human, relayed by the agent | The agent shows the plan, the human says yes in chat, the agent calls `approve_media_generation` | Apps without forms: Cursor, Codex, WorkBuddy, headless runs |
| `auto` | Nobody | Approved automatically when the estimate is under `KIE_AI_AUTO_APPROVE_CREDITS` | Unattended pipelines with a dedicated, capped key |

- Only the person who starts the server picks the mode, through the environment or the
  plugin setting. An agent can't change it.
- `chat` trusts the agent to report the human's answer honestly. It stops accidents, not a
  hostile agent. The caps below are the hard limit, and the README recommends a kie.ai sub-key
  with its own credit limit (kie.ai error 433) for agents.
- In `form` mode, when an app can't show the form, the refusal tells the human exactly which
  setting to change.

### Caps: always on, in every mode

| Setting | Default | Meaning |
|---|---|---|
| `KIE_AI_MAX_CREDITS_PER_PLAN` | 150 | No plan above this estimate can be approved or submitted |
| `KIE_AI_MAX_CREDITS_PER_DAY` | 600 | Spent in the last 24 h (real charges where known, estimates otherwise) plus this plan |
| `KIE_AI_AUTO_APPROVE_CREDITS` | 0 | Auto mode only: the largest plan approved without asking |

- A plan whose price can't be estimated counts as over every cap. In `form` and `chat` modes
  the human may approve it anyway with an explicit "unknown price" acknowledgement. In `auto`
  mode, never.
- Caps are checked twice: at approval, and again at submit (a parallel plan may have used up
  the day's budget in between).
- Not built: refusing when the kie.ai balance is below the estimate. Estimates are upper bounds
  (a Veo 3.1 request is estimated at its dearest mode), so this would refuse affordable work,
  and kie.ai already answers 402 without charging when the balance is short.

### Price estimates

kie.ai's per-model price text is the source. A conservative parser gives an **upper bound**:

1. Find every `N credits` with its nearby resolution (`1K`, `720p`, …) and unit (per image,
   per video, per second).
2. Use the request's resolution, or the schema default when the request leaves it out. Keep
   only the numbers that match it; if none match, keep them all.
3. Take the highest remaining number. When modes are listed (Lite/Fast/Quality) and the
   request can't select one, this is the dearest mode.
4. Per-second prices are multiplied by the duration (or the schema's maximum duration).
5. Multiply by the output count.

The result is labelled `estimated (upper bound)`, and the plan shows it next to kie.ai's text.
Exact rate-card formulas still win when they exist. Every finished task records
`creditsConsumed`, the real charge, in a spend ledger.

### CLI

- `submit_media_generation` in a terminal shows the plan and asks the person to type a random
  4-character code, in any mode. An agent's shell has no terminal, so it can't answer; an agent
  that drives a pseudo-terminal could, which is why this is friction and the caps are the limit.
  Without a terminal, only `chat` mode accepts `--approve <planId>` (and
  `--accept-unknown-price` for an unknown price). A plan auto mode already approved needs nothing.
- The 28 per-model commands go through the same gate as `run_model`: a plan, unless
  `KIE_AI_ALLOW_DIRECT_GENERATION=true`. This breaks scripts that called them directly; the
  changelog says so.

## Tests that must exist

- Each mode, against each cap, with a known, an estimated and an unknown price.
- The daily window counts real charges and pending estimates, and ignores spend older than 24 h.
- Two plans racing for the last of the daily budget: only one is submitted.
- The price parser on every catalog price text saved as a fixture, never below the real
  charge seen live (gpt-image-2 1K: 6 credits; Seedance 1.5 Pro 480p 4 s silent: 7).
- CLI: no terminal + `form` mode refuses; a wrong code refuses; the right code submits once.
