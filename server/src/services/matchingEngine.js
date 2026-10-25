/**
 * TeamConnect Matching Engine
 * ============================================================
 * Computes a match score (0–100) for every (student, role) pair.
 *
 * Weights:
 *   60% — Skill coverage
 *   15% — Interest alignment
 *   15% — Credibility (completed projects, endorsements, reviews)
 *   10% — Availability fit
 *
 * Skill levels: Beginner=1, Intermediate=2, Advanced=3
 * Skill importance: must-have weight=2, nice-to-have weight=1
 */

const LEVEL_MAP = { Beginner: 1, Intermediate: 2, Advanced: 3 };

// Built-in skill similarity map (pairs and partial credit %)
const SKILL_SIMILARITY = [
  // Frontend
  ['React', 'Next.js', 0.85],
  ['React', 'Vue.js', 0.6],
  ['React', 'Angular', 0.55],
  ['JavaScript', 'TypeScript', 0.8],
  ['JavaScript', 'React', 0.65],
  ['JavaScript', 'Vue.js', 0.65],
  ['CSS', 'Tailwind CSS', 0.75],
  ['CSS', 'SCSS', 0.8],
  ['Figma', 'UI/UX', 0.85],
  ['Figma', 'Adobe XD', 0.8],
  // Backend
  ['Node.js', 'Express', 0.85],
  ['Node.js', 'NestJS', 0.7],
  ['Python', 'Django', 0.75],
  ['Python', 'Flask', 0.75],
  ['Python', 'FastAPI', 0.75],
  ['Java', 'Spring Boot', 0.75],
  ['PostgreSQL', 'MySQL', 0.75],
  ['PostgreSQL', 'SQLite', 0.7],
  ['MongoDB', 'Firebase', 0.6],
  // ML/AI
  ['Python', 'Machine Learning', 0.6],
  ['Python', 'Data Science', 0.65],
  ['Machine Learning', 'Deep Learning', 0.75],
  ['TensorFlow', 'PyTorch', 0.75],
  // Mobile
  ['React Native', 'Flutter', 0.6],
  ['React', 'React Native', 0.7],
  // DevOps
  ['Docker', 'Kubernetes', 0.65],
  ['AWS', 'GCP', 0.65],
  ['AWS', 'Azure', 0.65],
  // Design
  ['UI/UX', 'Graphic Design', 0.5],
  ['Illustrator', 'Figma', 0.6],
];

/**
 * Build a quick lookup map: `${skillA}|${skillB}` -> similarity score
 */
function buildSimilarityMap(extraPairs = []) {
  const map = new Map();
  const all = [...SKILL_SIMILARITY, ...extraPairs];
  for (const [a, b, score] of all) {
    const key1 = `${a.toLowerCase()}|${b.toLowerCase()}`;
    const key2 = `${b.toLowerCase()}|${a.toLowerCase()}`;
    map.set(key1, score);
    map.set(key2, score);
  }
  return map;
}

const DEFAULT_SIMILARITY_MAP = buildSimilarityMap();

/**
 * Get the partial similarity credit for two skills.
 * Returns 1 if same skill, else the map value, else 0.
 */
function getSimilarity(skillA, skillB, similarityMap = DEFAULT_SIMILARITY_MAP) {
  if (skillA.toLowerCase() === skillB.toLowerCase()) return 1;
  return similarityMap.get(`${skillA.toLowerCase()}|${skillB.toLowerCase()}`) || 0;
}

/**
 * Compute skill coverage score for a single required skill
 * against all of the student's skills.
 * Returns { coverage: 0-1, matchType, studentSkillName, similarity }
 */
function computeSkillCoverage(requiredSkillName, requiredLevel, studentSkills, similarityMap) {
  const requiredLevelNum = LEVEL_MAP[requiredLevel] || 1;
  let best = { coverage: 0, matchType: 'missing', studentSkillName: null, similarity: 0 };

  for (const us of studentSkills) {
    const skillName = us.skill?.name || us.skillName || '';
    const studentLevelNum = LEVEL_MAP[us.level] || 1;
    const sim = getSimilarity(skillName, requiredSkillName, similarityMap);

    if (sim === 0) continue;

    // Direct match or similar skill
    const levelRatio = Math.min(studentLevelNum / requiredLevelNum, 1);
    const coverage = sim * levelRatio; // 0-1

    const matchType =
      sim === 1 && levelRatio === 1 ? 'full' :
      sim === 1 && levelRatio < 1 ? 'partial' :
      'similar';

    if (coverage > best.coverage) {
      best = { coverage, matchType, studentSkillName: skillName, similarity: sim, levelRatio };
    }
  }

  return best;
}

/**
 * Core matching function.
 *
 * @param {object} student - { studentProfile: { userSkills: [{skill, level}], interests, weeklyHours },
 *                             completedProjects, credibilityScore }
 * @param {object} role    - { title, hoursPerWeek, roleSkills: [{skill, requiredLevel, importance}] }
 * @param {object} project - { domain }
 * @param {Map}    similarityMap - optional custom map from DB
 *
 * @returns {object} { score: 0-100, breakdown, explanation }
 */
function computeMatchScore(student, role, project, similarityMap = DEFAULT_SIMILARITY_MAP) {
  const profile = student.studentProfile || {};
  const userSkills = profile.userSkills || [];
  const interests = JSON.parse(profile.interests || '[]');
  const weeklyHours = profile.weeklyHours || 10;

  const roleSkills = role.roleSkills || [];
  const hoursPerWeek = role.hoursPerWeek || 10;
  const projectDomain = project?.domain || '';

  // ── 1. Skill Coverage (60%) ─────────────────────────────────────
  let totalWeight = 0;
  let coveredWeight = 0;
  const skillDetails = [];

  for (const rs of roleSkills) {
    const skillName = rs.skill?.name || rs.skillName || '';
    const importance = rs.importance || 'must-have';
    const requiredLevel = rs.requiredLevel || 'Beginner';
    const weight = importance === 'must-have' ? 2 : 1;

    totalWeight += weight;

    const { coverage, matchType, studentSkillName, similarity, levelRatio } =
      computeSkillCoverage(skillName, requiredLevel, userSkills, similarityMap);

    coveredWeight += weight * coverage;

    skillDetails.push({
      skill: skillName,
      requiredLevel,
      importance,
      coverage,       // 0-1
      matchType,      // full | partial | similar | missing
      matchedWith: studentSkillName,
      similarity,
      levelRatio,
    });
  }

  const skillScore = totalWeight > 0 ? (coveredWeight / totalWeight) : 0.5; // 0-1

  // ── 2. Interest Alignment (15%) ──────────────────────────────────
  const normalizedInterests = interests.map(i => i.toLowerCase());
  const domainMatch = normalizedInterests.some(i =>
    projectDomain.toLowerCase().includes(i) || i.includes(projectDomain.toLowerCase())
  );
  const interestScore = domainMatch ? 1 : 0; // simple binary for now

  // ── 3. Credibility (15%) ─────────────────────────────────────────
  // completedProjects (max 5 → full credit at 5)
  // endorsements count (max 10 → full credit)
  // peerReviews avg (max 5 stars)
  const completedProjects = student.completedProjects || 0;
  const endorsementsCount = student.endorsementsCount || 0;
  const avgPeerRating = student.avgPeerRating || 0;

  const credibilityScore =
    Math.min(completedProjects / 5, 1) * 0.4 +
    Math.min(endorsementsCount / 10, 1) * 0.3 +
    (avgPeerRating / 5) * 0.3;

  // ── 4. Availability Fit (10%) ────────────────────────────────────
  const availabilityScore = weeklyHours >= hoursPerWeek
    ? 1
    : weeklyHours / hoursPerWeek;

  // ── Weighted total ───────────────────────────────────────────────
  const rawScore =
    skillScore * 0.60 +
    interestScore * 0.15 +
    credibilityScore * 0.15 +
    availabilityScore * 0.10;

  const score = Math.round(rawScore * 100);

  // ── Explanation ──────────────────────────────────────────────────
  const matched = skillDetails.filter(s => s.matchType === 'full');
  const partial = skillDetails.filter(s => s.matchType === 'partial' || s.matchType === 'similar');
  const missing = skillDetails.filter(s => s.matchType === 'missing');

  const explanation = {
    matched: matched.map(s => s.skill),
    partial: partial.map(s => ({
      required: s.skill,
      have: s.matchedWith,
      similarity: s.similarity,
      levelGap: s.levelRatio < 1 ? `Your level is lower than required` : null,
    })),
    missing: missing.map(s => s.skill),
    interestMatch: domainMatch,
    availabilityOk: weeklyHours >= hoursPerWeek,
    credibilityNote: `${completedProjects} completed project(s), ${endorsementsCount} endorsement(s)`,
  };

  return {
    score,
    breakdown: {
      skill: Math.round(skillScore * 100),
      interest: Math.round(interestScore * 100),
      credibility: Math.round(credibilityScore * 100),
      availability: Math.round(availabilityScore * 100),
    },
    explanation,
    skillDetails,
  };
}

/**
 * Compute project-level match score for a student.
 * Returns the best-matching open role's score.
 */
function computeProjectMatchScore(student, project, similarityMap = DEFAULT_SIMILARITY_MAP) {
  const openRoles = (project.roles || []).filter(
    r => r.filledSeats < r.seats
  );

  if (openRoles.length === 0) {
    return { score: 0, bestRole: null, roleScores: [] };
  }

  const roleScores = openRoles.map(role => ({
    role,
    ...computeMatchScore(student, role, project, similarityMap),
  }));

  roleScores.sort((a, b) => b.score - a.score);
  const best = roleScores[0];

  return {
    score: best.score,
    bestRole: best.role,
    roleScores,
    breakdown: best.breakdown,
    explanation: best.explanation,
  };
}

/**
 * Get learning resources for a missing skill.
 * Returns 2-3 free resource links.
 */
function getLearningResources(skillName) {
  const skill = skillName.toLowerCase();
  const resources = {
    'react': [
      { title: 'React Docs', url: 'https://react.dev/learn', source: 'Official' },
      { title: 'Full Stack Open', url: 'https://fullstackopen.com', source: 'University of Helsinki' },
      { title: 'React Tutorial - freeCodeCamp', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', source: 'YouTube' },
    ],
    'node.js': [
      { title: 'Node.js Docs', url: 'https://nodejs.org/en/learn', source: 'Official' },
      { title: 'The Odin Project', url: 'https://www.theodinproject.com/paths/full-stack-javascript', source: 'The Odin Project' },
    ],
    'python': [
      { title: 'Python.org Tutorial', url: 'https://docs.python.org/3/tutorial/', source: 'Official' },
      { title: 'CS50P', url: 'https://cs50.harvard.edu/python/', source: 'Harvard' },
      { title: 'Automate the Boring Stuff', url: 'https://automatetheboringstuff.com', source: 'Free Book' },
    ],
    'machine learning': [
      { title: 'fast.ai', url: 'https://course.fast.ai', source: 'fast.ai' },
      { title: 'ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course', source: 'Google' },
      { title: 'Coursera ML by Andrew Ng', url: 'https://www.coursera.org/specializations/machine-learning-introduction', source: 'Coursera' },
    ],
    'figma': [
      { title: 'Figma Learn', url: 'https://help.figma.com/hc/en-us/categories/360002042553', source: 'Official' },
      { title: 'Figma Crash Course', url: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8', source: 'YouTube' },
    ],
    'ui/ux': [
      { title: 'Google UX Design Certificate', url: 'https://grow.google/certificates/ux-design/', source: 'Google' },
      { title: 'NN/g UX Training', url: 'https://www.nngroup.com/training/', source: 'Nielsen Norman' },
    ],
    'javascript': [
      { title: 'javascript.info', url: 'https://javascript.info', source: 'javascript.info' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript', source: 'MDN' },
    ],
    'typescript': [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', source: 'Official' },
      { title: 'Total TypeScript', url: 'https://www.totaltypescript.com', source: 'Matt Pocock' },
    ],
    'docker': [
      { title: 'Docker Getting Started', url: 'https://docs.docker.com/get-started/', source: 'Official' },
      { title: 'Play with Docker', url: 'https://labs.play-with-docker.com', source: 'Interactive Lab' },
    ],
  };

  const defaultResources = [
    { title: `${skillName} on freeCodeCamp`, url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(skillName)}`, source: 'freeCodeCamp' },
    { title: `${skillName} on Khan Academy`, url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(skillName)}`, source: 'Khan Academy' },
    { title: `${skillName} on YouTube`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skillName + ' tutorial')}`, source: 'YouTube' },
  ];

  return resources[skill] || defaultResources;
}

module.exports = {
  computeMatchScore,
  computeProjectMatchScore,
  getLearningResources,
  buildSimilarityMap,
  getSimilarity,
  LEVEL_MAP,
};
