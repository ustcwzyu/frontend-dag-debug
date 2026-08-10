import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export function load(fileArg, label) {
  const path = resolve(fileArg);
  try { return { path, text: readFileSync(path, "utf8") }; }
  catch (error) { throw new Error(`Cannot read ${label} ${path}: ${error.message}`); }
}

export function metadata(text, name) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return fm.match(new RegExp(`^${escaped}:[ \\t]*["']?([^"'\\r\\n]+)["']?[ \\t]*$`, "m"))?.[1].trim();
}

export function canonical(title) {
  return title.replace(/^\d+(?:\.\d+)*[.、]?[ \t]*/, "").trim();
}

export function headings(text, level) {
  const prefix = "#".repeat(level);
  const matches = [...text.matchAll(new RegExp(`^${prefix}\\s+(.+)$`, "gm"))];
  return matches.map((match, index) => ({ title: match[1].trim(), text: text.slice(match.index, matches[index + 1]?.index ?? text.length) }));
}

export function section(text, level, title) {
  return headings(text, level).find((item) => canonical(item.title) === title)?.text;
}

export function assertHeadings(text, level, required, errors, owner) {
  for (const title of required) {
    const found = headings(text, level).filter((item) => canonical(item.title) === title);
    if (found.length !== 1) errors.push(`${owner} must contain exactly one ${title} heading.`);
    else if (!found[0].text.split(/\r?\n/).slice(1).some((line) => line.trim() && !/^\|?[-:| ]+\|?$/.test(line.trim()))) {
      errors.push(`${owner} section ${title} must not be empty.`);
    }
  }
}

export function storyBlocks(text, prefix) {
  if (!text) return [];
  const matches = [...text.matchAll(new RegExp(`^###\\s+(${prefix}-\\d{3,})\\s+(.+)$`, "gm"))];
  return matches.map((match, index) => ({ id: match[1], text: text.slice(match.index, matches[index + 1]?.index ?? text.length) }));
}

export function outputSpecBlocks(text, prefix) {
  return storyBlocks(text, prefix);
}

export function acceptanceBlocks(story, prefix) {
  const matches = [...story.text.matchAll(new RegExp(`^####\\s+(${prefix}-\\d{3,})\\s+(.+)$`, "gm"))];
  return matches.map((match, index) => ({
    id: match[1],
    text: story.text.slice(match.index, matches[index + 1]?.index ?? story.text.length),
  }));
}

export function validateAcceptance(block, owner, errors) {
  const labels = ["Given", "When", "Then", "异常场景"];
  const positions = labels.map((label) => ({ label, index: block.search(new RegExp(`^${label}[：:]`, "m")) }));
  for (const item of positions) if (item.index < 0) errors.push(`${owner} is missing ${item.label}.`);
  if (positions.some((item) => item.index < 0)) return;
  const counts = positions.map((item, index) => {
    const end = positions[index + 1]?.index ?? block.length;
    return (block.slice(item.index, end).match(/^-\s+\S.+$/gm) ?? []).length;
  });
  if (counts[0] < 1 || counts[1] < 1 || counts[2] < 2 || counts[3] < 1) {
    errors.push(`${owner} must contain at least 1 Given, 1 When, 2 Then, and 1 exception bullet.`);
  }
  if (counts.reduce((sum, count) => sum + count, 0) < 6) errors.push(`${owner} must contain at least six concrete bullets.`);
  if (!/(?:不得|不应|禁止|保留|恢复|重试|兜底|回滚|disabled)/.test(block)) {
    errors.push(`${owner} must include an observable protection or recovery result.`);
  }
}

export function containsUnresolvedBlockingPriority(block) {
  if (!block) return false;
  return block.split(/\r?\n/).slice(1).some((line) => {
    const plain = line.trim().replace(/^[-*+]\s*/, "").replace(/^\[[ xX]\]\s*/, "");
    if (!/\bP[01]\b/.test(plain)) return false;
    if (/^(?:不存在|没有|无)(?:任何)?(?:尚未|未)?(?:解决|确认|关闭|完成)?(?:的)?\s*P[01]\b/.test(plain)) return false;
    if (/^P[01]\b/.test(plain)) return true;
    return /(?:pending(?:-blocking)?|unresolved|未解决|未确认|待确认|未决|阻塞)/i.test(plain);
  });
}

export function scopeIncludes(upstream, selected) {
  if (upstream === "both") return ["frontend", "backend", "both"].includes(selected);
  return upstream === selected;
}

export function field(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`^-[ \\t]*${escaped}[：:][ \\t]*(.+)$`, "m"))?.[1].trim().replace(/[。.]$/, "");
}

export function fieldBlock(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^-[ \\t]*${escaped}[：:][ \\t]*(.*)$`, "m").exec(text);
  if (!match) return "";
  const lineEnd = text.indexOf("\n", match.index);
  const rest = lineEnd < 0 ? "" : text.slice(lineEnd + 1);
  const next = rest.search(/^-\s*[^\r\n：:]+[：:]/m);
  return `${match[1]}\n${rest.slice(0, next < 0 ? rest.length : next)}`.trim();
}

export function tableValue(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`^\\|[ \\t]*${escaped}[ \\t]*\\|[ \\t]*([^|]+)\\|`, "m"))?.[1].trim();
}

export function apiBlocks(text) {
  const details = section(text, 2, "API 详情") ?? "";
  const matches = [...details.matchAll(/^###\s+(API-\d{3,})\s+(.+)$/gm)];
  return matches.map((match, index) => ({ id: match[1], title: match[2].trim(), text: details.slice(match.index, matches[index + 1]?.index ?? details.length) }));
}

export function print(label, path, errors) {
  if (errors.length) {
    console.error(`${label} validation failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`${label} validation passed: ${path}`);
}

export function validateArtifactLocation(artifact, errors, expectedName) {
  const requirementId = metadata(artifact.text, "requirement_id");
  const projectRootValue = metadata(artifact.text, "project_root");
  if (!requirementId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requirementId)) {
    errors.push("requirement_id must use lowercase letters, digits, and single hyphens.");
    return;
  }
  if (!projectRootValue) {
    errors.push("project_root is required.");
    return;
  }
  const projectRoot = resolve(dirname(artifact.path), projectRootValue);
  if (!existsSync(projectRoot) || !statSync(projectRoot).isDirectory()) {
    errors.push(`project_root does not resolve to an existing directory: ${projectRoot}`);
    return;
  }
  const expected = resolve(join(projectRoot, "docs", "product-analysis", requirementId));
  if (dirname(artifact.path) !== expected) errors.push(`Artifact must be located under ${expected}.`);
  if (expectedName && basename(artifact.path) !== expectedName) errors.push(`Artifact filename must be ${expectedName}.`);
}
