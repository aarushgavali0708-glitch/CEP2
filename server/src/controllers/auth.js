// Auth controller — register, login, admin login
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authLimiter } = require('../middleware/rateLimit');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// ── Student / Faculty Register ────────────────
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, password, institutionId, department, year } = req.body;

    // Check institution exists
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      return res.status(400).json({ error: 'Institution not found' });
    }

    // Enforce email domain match
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain !== institution.domain.toLowerCase()) {
      return res.status(400).json({
        error: `Email domain must match your institution's domain: @${institution.domain}`,
      });
    }

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        passwordHash,
        institutionId,
        role: 'student',
        studentProfile: {
          create: {
            department: department || null,
            year: year ? parseInt(year) : null,
          },
        },
      },
      include: { studentProfile: true, institution: true },
    });

    const token = signToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
        institution: user.institution,
        studentProfile: user.studentProfile,
        onboardingDone: user.studentProfile?.onboardingDone || false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Student / Faculty Login ───────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        studentProfile: {
          include: {
            userSkills: { include: { skill: true, endorsements: true } },
          },
        },
        institution: true,
      },
    });

    if (!user || user.role === 'admin') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account suspended. Contact your admin.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
        institution: user.institution,
        studentProfile: user.studentProfile,
        onboardingDone: user.studentProfile?.onboardingDone || false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Admin Login ───────────────────────────────
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { institution: true },
    });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = signToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
        institution: user.institution,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get current user ──────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        institution: true,
        studentProfile: {
          include: {
            userSkills: { include: { skill: true, endorsements: true } },
          },
        },
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ── Get all institutions (for registration dropdown) ──
const getInstitutions = async (req, res, next) => {
  try {
    const institutions = await prisma.institution.findMany({
      select: { id: true, name: true, domain: true, location: true },
      orderBy: { name: 'asc' },
    });
    res.json({ institutions });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, adminLogin, getMe, getInstitutions };
