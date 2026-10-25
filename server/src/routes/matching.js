const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { computeMatchScore, computeProjectMatchScore, getLearningResources } = require('../services/matchingEngine');

// What-if simulator — toggle skills and see score change
router.post('/whatif', authenticate, async (req, res, next) => {
  try {
    const { roleId, toggledSkills } = req.body;
    // toggledSkills: [{ name, level, add: true/false }]

    const role = await prisma.projectRole.findUnique({
      where: { id: roleId },
      include: { roleSkills: { include: { skill: true } }, project: true },
    });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: { include: { userSkills: { include: { skill: true } } } } },
    });

    // Apply toggles
    let skills = [...(student.studentProfile?.userSkills || [])];
    for (const t of toggledSkills) {
      if (t.add) {
        // Find or fake the skill
        const skill = await prisma.skill.findFirst({ where: { name: t.name } });
        if (skill) {
          const already = skills.find(s => s.skillId === skill.id);
          if (!already) {
            skills.push({ skill, level: t.level || 'Beginner' });
          }
        }
      } else {
        skills = skills.filter(s => s.skill.name !== t.name);
      }
    }

    const modifiedStudent = {
      ...student,
      studentProfile: { ...student.studentProfile, userSkills: skills },
    };

    const result = computeMatchScore(modifiedStudent, role, role.project);
    const originalResult = computeMatchScore(student, role, role.project);

    res.json({
      original: originalResult,
      modified: result,
      delta: result.score - originalResult.score,
    });
  } catch (err) {
    next(err);
  }
});

// Get match score for a specific role
router.get('/role/:roleId', authenticate, async (req, res, next) => {
  try {
    const { roleId } = req.params;

    const role = await prisma.projectRole.findUnique({
      where: { id: roleId },
      include: { roleSkills: { include: { skill: true } }, project: true },
    });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: { include: { userSkills: { include: { skill: true } } } } },
    });

    const result = computeMatchScore(student, role, role.project);
    const missingWithResources = result.explanation.missing.map(skill => ({
      skill,
      resources: getLearningResources(skill),
    }));

    res.json({ ...result, missingWithResources });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
