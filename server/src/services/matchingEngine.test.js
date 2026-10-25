/**
 * Unit Tests for TeamConnect Matching Engine
 * Tests: Full match, Partial match, No match, Related skills (similarity map)
 */

const {
  computeMatchScore,
  computeProjectMatchScore,
  getSimilarity,
  buildSimilarityMap,
} = require('./matchingEngine');

describe('TeamConnect Matching Engine', () => {
  const baseStudent = {
    studentProfile: {
      userSkills: [
        { skill: { name: 'React' }, level: 'Advanced' },
        { skill: { name: 'JavaScript' }, level: 'Advanced' },
        { skill: { name: 'Node.js' }, level: 'Intermediate' },
      ],
      interests: JSON.stringify(['Web Dev', 'Mobile']),
      weeklyHours: 15,
    },
    completedProjects: 2,
    endorsementsCount: 4,
    avgPeerRating: 4.5,
  };

  test('1. Full match: student exceeds or meets all required skills at target level', () => {
    const role = {
      title: 'Frontend Lead',
      hoursPerWeek: 12,
      roleSkills: [
        { skill: { name: 'React' }, requiredLevel: 'Intermediate', importance: 'must-have' },
        { skill: { name: 'JavaScript' }, requiredLevel: 'Advanced', importance: 'must-have' },
      ],
    };
    const project = { domain: 'Web Dev' };

    const result = computeMatchScore(baseStudent, role, project);

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.explanation.matched).toContain('React');
    expect(result.explanation.matched).toContain('JavaScript');
    expect(result.explanation.missing.length).toBe(0);
    expect(result.explanation.interestMatch).toBe(true);
    expect(result.explanation.availabilityOk).toBe(true);
  });

  test('2. Partial match: student has the skill but lower proficiency than required', () => {
    const student = {
      studentProfile: {
        userSkills: [
          { skill: { name: 'Node.js' }, level: 'Beginner' }, // 1
        ],
        interests: JSON.stringify(['Backend']),
        weeklyHours: 10,
      },
      completedProjects: 0,
      endorsementsCount: 0,
      avgPeerRating: 0,
    };

    const role = {
      title: 'Senior Backend Engineer',
      hoursPerWeek: 10,
      roleSkills: [
        { skill: { name: 'Node.js' }, requiredLevel: 'Advanced', importance: 'must-have' }, // 3
      ],
    };
    const project = { domain: 'Backend' };

    const result = computeMatchScore(student, role, project);

    // Beginner / Advanced = 1/3 = 0.33 skill coverage
    expect(result.breakdown.skill).toBe(33);
    expect(result.score).toBeLessThan(50);
    expect(result.explanation.partial.length).toBe(1);
    expect(result.explanation.partial[0].required).toBe('Node.js');
    expect(result.explanation.partial[0].levelGap).toBeTruthy();
  });

  test('3. Related skills match: student has similar skill (e.g. JavaScript ~ TypeScript)', () => {
    const studentWithJS = {
      studentProfile: {
        userSkills: [
          { skill: { name: 'JavaScript' }, level: 'Advanced' }, // level 3
        ],
        interests: JSON.stringify(['Web Dev']),
        weeklyHours: 15,
      },
      completedProjects: 1,
      endorsementsCount: 2,
      avgPeerRating: 4.0,
    };

    const roleRequiringTS = {
      title: 'TypeScript Frontend Developer',
      hoursPerWeek: 10,
      roleSkills: [
        { skill: { name: 'TypeScript' }, requiredLevel: 'Intermediate', importance: 'must-have' },
      ],
    };
    const project = { domain: 'Web Dev' };

    const result = computeMatchScore(studentWithJS, roleRequiringTS, project);

    // JavaScript to TypeScript similarity is 0.8
    expect(result.skillDetails[0].similarity).toBe(0.8);
    expect(result.skillDetails[0].matchType).toBe('similar');
    expect(result.explanation.partial.length).toBe(1);
    expect(result.explanation.partial[0].have).toBe('JavaScript');
  });

  test('4. No match: student has none of the required skills', () => {
    const designer = {
      studentProfile: {
        userSkills: [
          { skill: { name: 'Figma' }, level: 'Advanced' },
          { skill: { name: 'UI/UX' }, level: 'Advanced' },
        ],
        interests: JSON.stringify(['Design']),
        weeklyHours: 10,
      },
      completedProjects: 0,
      endorsementsCount: 0,
      avgPeerRating: 0,
    };

    const mlRole = {
      title: 'Deep Learning Researcher',
      hoursPerWeek: 15,
      roleSkills: [
        { skill: { name: 'PyTorch' }, requiredLevel: 'Advanced', importance: 'must-have' },
        { skill: { name: 'Machine Learning' }, requiredLevel: 'Intermediate', importance: 'must-have' },
      ],
    };
    const project = { domain: 'Healthcare AI' };

    const result = computeMatchScore(designer, mlRole, project);

    expect(result.breakdown.skill).toBe(0);
    expect(result.score).toBeLessThan(35);
    expect(result.explanation.missing).toContain('PyTorch');
    expect(result.explanation.missing).toContain('Machine Learning');
  });

  test('5. Project-level match: returns score of the best-matching open role', () => {
    const project = {
      domain: 'Web Dev',
      roles: [
        {
          id: 'r1',
          title: 'React Dev',
          seats: 1,
          filledSeats: 0,
          hoursPerWeek: 10,
          roleSkills: [{ skill: { name: 'React' }, requiredLevel: 'Intermediate', importance: 'must-have' }],
        },
        {
          id: 'r2',
          title: 'Rust Engineer',
          seats: 1,
          filledSeats: 0,
          hoursPerWeek: 10,
          roleSkills: [{ skill: { name: 'Rust' }, requiredLevel: 'Advanced', importance: 'must-have' }],
        },
      ],
    };

    const projectResult = computeProjectMatchScore(baseStudent, project);

    expect(projectResult.bestRole.title).toBe('React Dev');
    expect(projectResult.score).toBeGreaterThan(70);
  });
});
