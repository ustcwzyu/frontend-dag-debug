import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export function loadMarkdown(fileArg, label = "artifact") {
  const path = resolve(fileArg);
  try {
    return { path, text: readFileSync(path, "utf8") };
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`);
  }
}

export function frontmatter(text) {
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

export function metadata(text, name) {
  const block = frontmatter(text);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(`^${escaped}:[ \\t]*["']?([^"'\\r\\n]+)["']?[ \\t]*$`, "m"))?.[1].trim();
}

export function headings(text, level) {
  const prefix = "#".repeat(level);
  const matches = [...text.matchAll(new RegExp(`^${prefix}\\s+(.+)$`, "gm"))];
  return matches.map((match, index) => ({
    title: match[1].trim(),
    start: match.index,
    text: text.slice(match.index, matches[index + 1]?.index ?? text.length),
  }));
}

export function canonical(title) {
  return title.replace(/^\d+(?:\.\d+)*[.、]?[ \t]*/, "").trim();
}

export function section(text, level, title) {
  return headings(text, level).find((item) => canonical(item.title) === title)?.text;
}

export function sections(text, level, title) {
  return headings(text, level).filter((item) => canonical(item.title) === title);
}

export function hasSubstance(block) {
  if (!block) return false;
  return block.split(/\r?\n/).slice(1).some((line) => line.trim() && !/^\|?[-:| ]+\|?$/.test(line.trim()));
}

export function field(block, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(`^-[ \\t]*${escaped}[：:][ \\t]*(.+)$`, "m"))?.[1].trim().replace(/[。.]$/, "");
}

export function storyBlocks(block, prefix) {
  if (!block) return [];
  const matches = [...block.matchAll(new RegExp(`^###\\s+(${prefix}-\\d{3,})\\s+(.+)$`, "gm"))];
  return matches.map((match, index) => ({
    id: match[1],
    title: match[2].trim(),
    text: block.slice(match.index, matches[index + 1]?.index ?? block.length),
  }));
}

export function outputSpecBlocks(block, prefix) {
  return storyBlocks(block, prefix);
}

export function validateStorySpecCoverage(stories, specs, errors, label) {
  const storyIds = stories.map((item) => item.id);
  const specIds = specs.map((item) => item.id);
  for (const id of new Set(storyIds)) if (storyIds.filter((value) => value === id).length > 1) errors.push(`Duplicate story ID: ${id}.`);
  for (const id of new Set(specIds)) if (specIds.filter((value) => value === id).length > 1) errors.push(`Duplicate output specification: ${id}.`);
  for (const id of storyIds) if (!specIds.includes(id)) errors.push(`${label} is missing output specification for ${id}.`);
  for (const id of specIds) if (!storyIds.includes(id)) errors.push(`${label} contains output specification for unknown story ${id}.`);
}

export function acceptanceBlocks(story, prefix) {
  const matches = [...story.text.matchAll(new RegExp(`^####\\s+(${prefix}-\\d{3,})\\s+(.+)$`, "gm"))];
  return matches.map((match, index) => ({
    id: match[1],
    title: match[2].trim(),
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

export function assertHeadings(text, level, required, errors, owner) {
  for (const title of required) {
    const matches = sections(text, level, title);
    if (matches.length !== 1) errors.push(`${owner} must contain exactly one ${title} heading.`);
    else if (!hasSubstance(matches[0].text)) errors.push(`${owner} section ${title} must not be empty.`);
  }
}

export function printResult(label, path, errors) {
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
  if (dirname(artifact.path) !== expected) {
    errors.push(`Artifact must be located under ${expected}.`);
  }
  if (expectedName && basename(artifact.path) !== expectedName) {
    errors.push(`Artifact filename must be ${expectedName}.`);
  }
}
