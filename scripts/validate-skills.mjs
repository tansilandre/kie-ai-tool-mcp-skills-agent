// Checks every skill under skills/ so a broken one fails CI instead of
// failing silently inside an agent. Each skill must install on its own
// (`npx skills add`, Claude Code plugins, Codex), so links stay inside it.
//
// Run: npm run skills:check

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize, relative } from "node:path";

const ROOT = "skills";
const MAX_SKILL_LINES = 300;
const MAX_DESCRIPTION = 1024;
const problems = [];

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return undefined;
  const fields = {};
  let key;
  for (const line of match[1].split("\n")) {
    const pair = /^([a-zA-Z_-]+):\s*(.*)$/.exec(line);
    if (pair) {
      key = pair[1];
      fields[key] = pair[2].replace(/^>-?\s*$/, "").trim();
    } else if (key && /^\s+\S/.test(line)) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
    }
  }
  for (const [k, v] of Object.entries(fields)) {
    fields[k] = v.replace(/^["']|["']$/g, "");
  }
  return fields;
}

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith(".md") ? [path] : [];
  });
}

for (const name of readdirSync(ROOT)) {
  const dir = join(ROOT, name);
  if (!statSync(dir).isDirectory()) continue;
  const skillFile = join(dir, "SKILL.md");
  if (!existsSync(skillFile)) {
    problems.push(`${dir}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(skillFile, "utf8");
  const meta = frontmatter(text);
  if (!meta) {
    problems.push(`${skillFile}: no frontmatter`);
    continue;
  }
  if (meta.name !== name) {
    problems.push(
      `${skillFile}: name "${meta.name}" must equal the folder name "${name}"`,
    );
  }
  const description = meta.description ?? "";
  if (!description) problems.push(`${skillFile}: missing description`);
  if (description.length > MAX_DESCRIPTION) {
    problems.push(
      `${skillFile}: description is ${description.length} characters (max ${MAX_DESCRIPTION})`,
    );
  }
  if (name !== "generate-media") {
    if (!/use when/i.test(description))
      problems.push(`${skillFile}: description needs a "Use when ..." part`);
    if (!/not for/i.test(description))
      problems.push(`${skillFile}: description needs a "NOT for ..." part`);
  }
  const lines = text.split("\n").length;
  if (lines > MAX_SKILL_LINES) {
    problems.push(
      `${skillFile}: ${lines} lines (max ${MAX_SKILL_LINES}); move detail to references/`,
    );
  }

  const linked = new Set();
  for (const file of markdownFiles(dir)) {
    const body = readFileSync(file, "utf8");
    for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      const resolved = normalize(join(file, "..", target));
      if (relative(dir, resolved).startsWith("..")) {
        problems.push(`${file}: link "${match[1]}" leaves the skill folder`);
        continue;
      }
      if (!existsSync(resolved)) {
        problems.push(`${file}: link "${match[1]}" points to a missing file`);
        continue;
      }
      linked.add(resolved);
    }
  }
  const refs = join(dir, "references");
  if (existsSync(refs)) {
    for (const file of markdownFiles(refs)) {
      if (!linked.has(normalize(file))) {
        problems.push(
          `${file}: not linked from the skill (orphaned reference)`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(problems.map((p) => `✖ ${p}`).join("\n"));
  process.exit(1);
}
console.log(`Skills OK: ${readdirSync(ROOT).length} checked.`);
