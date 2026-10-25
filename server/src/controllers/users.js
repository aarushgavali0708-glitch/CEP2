// Users / Profile controller
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// ── Complete onboarding ───────────────────────
const completeOnboarding = async (req, res, next) => {
  try {
    const { skills, interests, bio, githubUrl, linkedinUrl, portfolioUrl, weeklyHours } = req.body;
    const userId = req.user.id;

    // Upsert skills
    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!existingProfile) return res.status(404).json({ error: 'Profile not found' });

    // Delete old skills and re-create
    await prisma.userSkill.deleteMany({ where: { profileId: existingProfile.id } });

    for (const s of skills) {
      let skill = await prisma.skill.findFirst({ where: { name: { equals: s.name } } });
      if (!skill) {
        skill = await prisma.skill.create({ data: { name: s.name, category: s.category || 'General' } });
      }
      await prisma.userSkill.create({
        data: {
          profileId: existingProfile.id,
          skillId: skill.id,
          level: s.level || 'Beginner',
        },
      });
    }

    // Compute profile strength
    let strength = 0;
    if (bio) strength += 20;
    if (skills.length > 0) strength += 25;
    if (interests?.length > 0) strength += 15;
    if (githubUrl || linkedinUrl || portfolioUrl) strength += 20;
    if (weeklyHours) strength += 10;
    strength += 10; // base for completing onboarding

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: {
        bio,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        weeklyHours: parseInt(weeklyHours) || 10,
        interests: JSON.stringify(interests || []),
        onboardingDone: true,
        profileStrength: strength,
      },
      include: { userSkills: { include: { skill: true } } },
    });

    res.json({ profile: updated });
  } catch (err) {
    next(err);
  }
};

// ── Get student profile ───────────────────────
const getProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        institution: true,
        studentProfile: {
          include: {
            userSkills: {
              include: {
                skill: true,
                endorsements: {
                  include: { endorser: { select: { fullName: true, role: true } } },
                },
              },
            },
          },
        },
        userBadges: { include: { badge: true } },
        teamMemberships: {
          include: {
            project: { select: { id: true, title: true, domain: true, status: true } },
            role: { select: { title: true } },
          },
        },
        peerReviewsReceived: {
          include: { reviewer: { select: { fullName: true } } },
        },
        recommendationsRequested: {
          where: { status: 'approved' },
        },
        certificates: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Institution isolation
    if (requestingUser?.role === 'student' && user.institutionId !== requestingUser.institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Apply privacy settings
    const profile = user.studentProfile;
    const privacy = {
      projects: profile?.privacyProjects || 'public',
      skills: profile?.privacySkills || 'public',
      reviews: profile?.privacyReviews || 'public',
      recommendations: profile?.privacyRecommendations || 'public',
    };

    const isOwn = requestingUser?.id === userId;
    const isSameInstitution = requestingUser?.institutionId === user.institutionId;

    function canSee(setting) {
      if (isOwn) return true;
      if (setting === 'public') return true;
      if (setting === 'institution') return isSameInstitution;
      return false;
    }

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: isOwn ? user.email : undefined,
        institution: user.institution,
        studentProfile: profile,
        userSkills: canSee(privacy.skills) ? profile?.userSkills : [],
        teamMemberships: canSee(privacy.projects) ? user.teamMemberships : [],
        peerReviews: canSee(privacy.reviews) ? user.peerReviewsReceived : [],
        recommendations: canSee(privacy.recommendations) ? user.recommendationsRequested : [],
        userBadges: user.userBadges,
        certificates: user.certificates,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Update profile ────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { bio, githubUrl, linkedinUrl, portfolioUrl, weeklyHours, interests,
      privacyProjects, privacySkills, privacyReviews, privacyRecommendations } = req.body;

    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Recompute strength
    let strength = 10; // onboarding base
    if (bio) strength += 20;
    const skillCount = await prisma.userSkill.count({ where: { profileId: profile.id } });
    if (skillCount > 0) strength += 25;
    const interestsArr = JSON.parse(profile.interests || '[]');
    if (interestsArr.length > 0) strength += 15;
    if (githubUrl || linkedinUrl || portfolioUrl) strength += 20;
    if (weeklyHours) strength += 10;

    const updated = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: {
        bio,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        weeklyHours: weeklyHours ? parseInt(weeklyHours) : profile.weeklyHours,
        interests: interests ? JSON.stringify(interests) : profile.interests,
        profileStrength: strength,
        privacyProjects: privacyProjects || profile.privacyProjects,
        privacySkills: privacySkills || profile.privacySkills,
        privacyReviews: privacyReviews || profile.privacyReviews,
        privacyRecommendations: privacyRecommendations || profile.privacyRecommendations,
      },
    });

    res.json({ profile: updated });
  } catch (err) {
    next(err);
  }
};

// ── Update skills ─────────────────────────────
const updateSkills = async (req, res, next) => {
  try {
    const { skills } = req.body; // [{ name, level, category }]
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });

    await prisma.userSkill.deleteMany({ where: { profileId: profile.id } });

    for (const s of skills) {
      let skill = await prisma.skill.findFirst({ where: { name: { equals: s.name } } });
      if (!skill) {
        skill = await prisma.skill.create({ data: { name: s.name, category: s.category || 'General' } });
      }
      await prisma.userSkill.create({
        data: { profileId: profile.id, skillId: skill.id, level: s.level || 'Beginner' },
      });
    }

    const updated = await prisma.studentProfile.findUnique({
      where: { id: profile.id },
      include: { userSkills: { include: { skill: true } } },
    });

    res.json({ profile: updated });
  } catch (err) {
    next(err);
  }
};

// ── Search students ───────────────────────────
const searchStudents = async (req, res, next) => {
  try {
    const { q, skill, department } = req.query;
    const institutionId = req.user.institutionId;

    const where = { institutionId, role: 'student', isActive: true };

    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { studentProfile: { bio: { contains: q } } },
      ];
    }

    const students = await prisma.user.findMany({
      where,
      include: {
        studentProfile: {
          include: { userSkills: { include: { skill: true } } },
        },
      },
      take: 20,
    });

    let filtered = students;
    if (skill) {
      filtered = students.filter(s =>
        s.studentProfile?.userSkills?.some(us =>
          us.skill.name.toLowerCase().includes(skill.toLowerCase())
        )
      );
    }
    if (department) {
      filtered = filtered.filter(s =>
        s.studentProfile?.department?.toLowerCase().includes(department.toLowerCase())
      );
    }

    res.json({ students: filtered.map(s => ({
      id: s.id,
      fullName: s.fullName,
      department: s.studentProfile?.department,
      avatarUrl: s.studentProfile?.avatarUrl,
      bio: s.studentProfile?.bio,
      skills: s.studentProfile?.userSkills?.map(us => ({ name: us.skill.name, level: us.level })),
    })) });
  } catch (err) {
    next(err);
  }
};

// ── Get leaderboard ───────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;
    const entries = await prisma.leaderboardEntry.findMany({
      where: { institutionId },
      include: {
        user: {
          select: {
            fullName: true,
            studentProfile: { select: { avatarUrl: true, department: true, xp: true, level: true } },
          },
        },
      },
      orderBy: { xp: 'desc' },
      take: 50,
    });

    res.json({ leaderboard: entries });
  } catch (err) {
    next(err);
  }
};

module.exports = { completeOnboarding, getProfile, updateProfile, updateSkills, searchStudents, getLeaderboard };
