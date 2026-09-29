/**
 * Skill normalization utilities.
 *
 * Skill matching must be deterministic and explainable — the platform shows a
 * transparent "you have / you need" comparison, not a magic AI score. To make
 * string comparison reliable we canonicalize skill names (lowercase, trim,
 * collapse whitespace) and resolve common aliases through the Skill catalog.
 */

export function normalizeSkillName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;]+$/, '');
}

export function dedupeSkills(names) {
  const seen = new Set();
  const out = [];
  for (const raw of names) {
    const n = normalizeSkillName(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/**
 * Compares a student's skill set against a job's requirement set.
 * Returns an explicit, UI-ready breakdown — every item is explainable.
 */
export function compareSkillSets(studentSkills, requiredSkills, niceToHaveSkills = []) {
  const student = new Set(dedupeSkills(studentSkills));
  const required = dedupeSkills(requiredSkills);
  const niceToHave = dedupeSkills(niceToHaveSkills);

  const matched = required.filter((s) => student.has(s));
  const missing = required.filter((s) => !student.has(s));
  const bonusMatched = niceToHave.filter((s) => student.has(s));
  const bonusMissing = niceToHave.filter((s) => !student.has(s));

  const coverage = required.length === 0 ? 0 : Math.round((matched.length / required.length) * 100);

  return {
    matched,
    missing,
    bonusMatched,
    bonusMissing,
    coveragePercent: coverage,
    summary: `You match ${matched.length} of ${required.length} required skills (${coverage}%).`,
  };
}

/** Maps extracted/alias skill names to catalog canonical names. */
export function resolveSkillsWithCatalog(names, aliasMap) {
  return dedupeSkills(names).map((n) => aliasMap.get(n) || n);
}
