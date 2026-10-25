/**
 * TeamConnect Seed Script
 * Creates realistic demo data for 2 institutions, 12 students,
 * 3 teachers, 10 projects, 4 ideas, 2 community challenges.
 *
 * Demo credentials:
 *   Student: alice@dpu.edu.in / demo1234
 *   Admin:   admin@dpu.edu.in / admin1234
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TeamConnect database...\n');

  // ── Institutions ───────────────────────────────────────────────
  const legacyInstitution = await prisma.institution.findFirst({
    where: { OR: [
      { domain: 'mit.edu' },
      { name: 'MIT Institute of Technology' },
      { name: 'Massachusetts Institute of Technology' },
    ] },
  });
  if (legacyInstitution) {
    const legacyUsers = await prisma.user.findMany({ where: { email: { endsWith: '@mit.edu' } } });
    for (const user of legacyUsers) {
      const email = user.email.replace(/@mit\.edu$/i, '@dpu.edu.in');
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== user.id) {
        throw new Error(`Cannot migrate ${user.email}: ${email} is already in use`);
      }
      await prisma.user.update({ where: { id: user.id }, data: { email } });
    }
    await prisma.institution.update({
      where: { id: legacyInstitution.id },
      data: {
        name: 'DYP DPU',
        domain: 'dpu.edu.in',
        description: 'Dr. D. Y. Patil Vidyapeeth, Pune',
        location: 'Pune, Maharashtra, India',
      },
    });
  }

  const dypDpu = await prisma.institution.upsert({
    where: { domain: 'dpu.edu.in' },
    update: {
      name: 'DYP DPU',
      description: 'Dr. D. Y. Patil Vidyapeeth, Pune',
      location: 'Pune, Maharashtra, India',
    },
    create: {
      name: 'DYP DPU',
      domain: 'dpu.edu.in',
      description: 'Dr. D. Y. Patil Vidyapeeth, Pune',
      location: 'Pune, Maharashtra, India',
    },
  });

  const stanford = await prisma.institution.upsert({
    where: { domain: 'stanford.edu' },
    update: {},
    create: {
      name: 'Stanford University',
      domain: 'stanford.edu',
      description: 'World-class research university in Silicon Valley',
      location: 'Palo Alto, CA',
    },
  });

  console.log('✅ Institutions created');

  // ── Skills ─────────────────────────────────────────────────────
  const skillsData = [
    // Frontend
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'Vue.js', category: 'Frontend' },
    { name: 'Angular', category: 'Frontend' },
    { name: 'JavaScript', category: 'Frontend' },
    { name: 'TypeScript', category: 'Frontend' },
    { name: 'HTML/CSS', category: 'Frontend' },
    { name: 'Tailwind CSS', category: 'Frontend' },
    { name: 'SCSS', category: 'Frontend' },
    // Backend
    { name: 'Node.js', category: 'Backend' },
    { name: 'Express', category: 'Backend' },
    { name: 'Python', category: 'Backend' },
    { name: 'Django', category: 'Backend' },
    { name: 'Flask', category: 'Backend' },
    { name: 'FastAPI', category: 'Backend' },
    { name: 'Java', category: 'Backend' },
    { name: 'Spring Boot', category: 'Backend' },
    { name: 'Go', category: 'Backend' },
    { name: 'PostgreSQL', category: 'Backend' },
    { name: 'MySQL', category: 'Backend' },
    { name: 'MongoDB', category: 'Backend' },
    { name: 'Redis', category: 'Backend' },
    { name: 'GraphQL', category: 'Backend' },
    // ML/AI
    { name: 'Machine Learning', category: 'ML/AI' },
    { name: 'Deep Learning', category: 'ML/AI' },
    { name: 'TensorFlow', category: 'ML/AI' },
    { name: 'PyTorch', category: 'ML/AI' },
    { name: 'Data Science', category: 'ML/AI' },
    { name: 'NLP', category: 'ML/AI' },
    { name: 'Computer Vision', category: 'ML/AI' },
    // Design
    { name: 'Figma', category: 'Design' },
    { name: 'UI/UX', category: 'Design' },
    { name: 'Adobe XD', category: 'Design' },
    { name: 'Illustrator', category: 'Design' },
    { name: 'Graphic Design', category: 'Design' },
    // Mobile
    { name: 'React Native', category: 'Mobile' },
    { name: 'Flutter', category: 'Mobile' },
    { name: 'Android', category: 'Mobile' },
    { name: 'iOS', category: 'Mobile' },
    { name: 'Swift', category: 'Mobile' },
    { name: 'Kotlin', category: 'Mobile' },
    // DevOps
    { name: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', category: 'DevOps' },
    { name: 'AWS', category: 'DevOps' },
    { name: 'GCP', category: 'DevOps' },
    { name: 'Azure', category: 'DevOps' },
    { name: 'CI/CD', category: 'DevOps' },
    { name: 'Git', category: 'DevOps' },
    // Other
    { name: 'Blockchain', category: 'Other' },
    { name: 'WebSocket', category: 'Other' },
    { name: 'REST API', category: 'Other' },
    { name: 'Agile/Scrum', category: 'Other' },
    { name: 'Technical Writing', category: 'Other' },
  ];

  const skills = {};
  for (const s of skillsData) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    skills[s.name] = skill;
  }
  console.log(`✅ ${Object.keys(skills).length} skills created`);

  // ── Skill Similarities ─────────────────────────────────────────
  const similarities = [
    ['React', 'Next.js', 0.85],
    ['React', 'Vue.js', 0.6],
    ['JavaScript', 'TypeScript', 0.8],
    ['JavaScript', 'React', 0.65],
    ['CSS', 'Tailwind CSS', 0.75],
    ['Figma', 'UI/UX', 0.85],
    ['Figma', 'Adobe XD', 0.8],
    ['Node.js', 'Express', 0.85],
    ['Python', 'Django', 0.75],
    ['Python', 'Machine Learning', 0.6],
    ['Machine Learning', 'Deep Learning', 0.75],
    ['TensorFlow', 'PyTorch', 0.75],
    ['React Native', 'Flutter', 0.6],
    ['React', 'React Native', 0.7],
    ['Docker', 'Kubernetes', 0.65],
    ['PostgreSQL', 'MySQL', 0.75],
  ];

  for (const [a, b, score] of similarities) {
    if (skills[a] && skills[b]) {
      try {
        await prisma.skillSimilarity.upsert({
          where: { skillAId_skillBId: { skillAId: skills[a].id, skillBId: skills[b].id } },
          update: { score },
          create: { skillAId: skills[a].id, skillBId: skills[b].id, score },
        });
      } catch (_) {}
    }
  }
  console.log('✅ Skill similarities created');

  // ── Badges ─────────────────────────────────────────────────────
  const badgesData = [
    { name: 'First Project', description: 'Joined your first team project!', xpValue: 50 },
    { name: 'Team Player', description: 'Contributed to 3+ completed projects', xpValue: 150 },
    { name: 'Mentor', description: 'Endorsed skills of 5+ teammates', xpValue: 100 },
    { name: 'Top Contributor', description: 'Ranked in top 10 of your institution', xpValue: 200 },
    { name: 'Idea Champion', description: 'Had an idea picked up and turned into a project', xpValue: 75 },
    { name: 'Early Bird', description: 'One of the first 10 students to join', xpValue: 30 },
  ];

  const badges = {};
  for (const b of badgesData) {
    const badge = await prisma.badge.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    });
    badges[b.name] = badge;
  }
  console.log('✅ Badges created');

  // ── Admin Users ────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin1234', 12);

  const dpuAdmin = await prisma.user.upsert({
    where: { email: 'admin@dpu.edu.in' },
    update: {},
    create: {
      email: 'admin@dpu.edu.in',
      passwordHash: adminHash,
      fullName: 'Dr. Sarah Chen',
      role: 'admin',
      institutionId: dypDpu.id,
    },
  });

  const stanfordAdmin = await prisma.user.upsert({
    where: { email: 'admin@stanford.edu' },
    update: {},
    create: {
      email: 'admin@stanford.edu',
      passwordHash: adminHash,
      fullName: 'Prof. James Miller',
      role: 'admin',
      institutionId: stanford.id,
    },
  });

  console.log('✅ Admin users created');

  // ── Faculty / Teachers ─────────────────────────────────────────
  const teacherHash = await bcrypt.hash('teacher1234', 12);
  await Promise.all([
    prisma.user.upsert({
      where: { email: 'prof.rahman@dpu.edu.in' },
      update: {},
      create: {
        email: 'prof.rahman@dpu.edu.in',
        passwordHash: teacherHash,
        fullName: 'Prof. Arif Rahman',
        role: 'faculty',
        institutionId: dypDpu.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'dr.patel@dpu.edu.in' },
      update: {},
      create: {
        email: 'dr.patel@dpu.edu.in',
        passwordHash: teacherHash,
        fullName: 'Dr. Priya Patel',
        role: 'faculty',
        institutionId: dypDpu.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'prof.kim@stanford.edu' },
      update: {},
      create: {
        email: 'prof.kim@stanford.edu',
        passwordHash: teacherHash,
        fullName: 'Prof. Ji-yeon Kim',
        role: 'faculty',
        institutionId: stanford.id,
      },
    }),
  ]);

  // ── DYP DPU Students ───────────────────────────────────────────────
  const studentHash = await bcrypt.hash('demo1234', 12);

  const dpuStudentsData = [
    {
      email: 'alice@dpu.edu.in', fullName: 'Alice Johnson', department: 'Computer Engineering', year: 3,
      bio: 'Passionate React developer who loves building intuitive interfaces. Always looking for challenging projects.',
      githubUrl: 'https://github.com/alicejohnson', linkedinUrl: 'https://linkedin.com/in/alicejohnson',
      weeklyHours: 15, interests: ['Web Dev', 'Mobile', 'Design'],
      xp: 450, level: 3,
      skills: [
        { name: 'React', level: 'Advanced' },
        { name: 'JavaScript', level: 'Advanced' },
        { name: 'Tailwind CSS', level: 'Intermediate' },
        { name: 'Node.js', level: 'Intermediate' },
        { name: 'Figma', level: 'Beginner' },
      ],
    },
    {
      email: 'bob@dpu.edu.in', fullName: 'Bob Chen', department: 'Electronics', year: 4,
      bio: 'ML enthusiast and Python developer. Building models that solve real-world problems.',
      githubUrl: 'https://github.com/bobchen', weeklyHours: 10, interests: ['ML/AI', 'Data Science'],
      xp: 320, level: 2,
      skills: [
        { name: 'Python', level: 'Advanced' },
        { name: 'Machine Learning', level: 'Intermediate' },
        { name: 'TensorFlow', level: 'Intermediate' },
        { name: 'Data Science', level: 'Intermediate' },
        { name: 'PostgreSQL', level: 'Beginner' },
      ],
    },
    {
      email: 'carol@dpu.edu.in', fullName: 'Carol Martinez', department: 'Design', year: 2,
      bio: 'UX designer obsessed with accessibility and clean interfaces. Portfolio at caroldesign.io.',
      portfolioUrl: 'https://caroldesign.io', weeklyHours: 12, interests: ['Design', 'Mobile', 'Web Dev'],
      xp: 180, level: 1,
      skills: [
        { name: 'Figma', level: 'Advanced' },
        { name: 'UI/UX', level: 'Advanced' },
        { name: 'Adobe XD', level: 'Intermediate' },
        { name: 'Illustrator', level: 'Beginner' },
        { name: 'HTML/CSS', level: 'Intermediate' },
      ],
    },
    {
      email: 'david@dpu.edu.in', fullName: 'David Kim', department: 'Computer Engineering', year: 3,
      bio: 'Full-stack developer with DevOps experience. Love Docker, Kubernetes, and cloud architecture.',
      githubUrl: 'https://github.com/davidkim', weeklyHours: 20, interests: ['DevOps', 'Backend', 'Web Dev'],
      xp: 500, level: 3,
      skills: [
        { name: 'Node.js', level: 'Advanced' },
        { name: 'Docker', level: 'Advanced' },
        { name: 'PostgreSQL', level: 'Advanced' },
        { name: 'React', level: 'Intermediate' },
        { name: 'AWS', level: 'Intermediate' },
        { name: 'Git', level: 'Advanced' },
      ],
    },
    {
      email: 'emily@dpu.edu.in', fullName: 'Emily Wang', department: 'Computer Engineering', year: 1,
      bio: 'First-year CS student eager to learn and contribute. Interested in mobile app development.',
      weeklyHours: 8, interests: ['Mobile', 'Web Dev'],
      xp: 50, level: 1,
      skills: [
        { name: 'JavaScript', level: 'Beginner' },
        { name: 'React Native', level: 'Beginner' },
        { name: 'HTML/CSS', level: 'Intermediate' },
      ],
    },
    {
      email: 'frank@dpu.edu.in', fullName: 'Frank Osei', department: 'Information Technology', year: 4,
      bio: 'Backend engineer focused on scalable APIs and distributed systems. Also into blockchain tech.',
      githubUrl: 'https://github.com/frankosei', weeklyHours: 15, interests: ['Backend', 'Blockchain', 'DevOps'],
      xp: 380, level: 2,
      skills: [
        { name: 'Python', level: 'Advanced' },
        { name: 'FastAPI', level: 'Intermediate' },
        { name: 'MongoDB', level: 'Intermediate' },
        { name: 'Blockchain', level: 'Beginner' },
        { name: 'Docker', level: 'Intermediate' },
        { name: 'REST API', level: 'Advanced' },
      ],
    },
    {
      email: 'sam@dpu.edu.in', fullName: 'Sam Rivera', department: 'AI & Data Science', year: 2,
      bio: 'UI/UX and visual designer specializing in design systems, accessible UI, and micro-interactions. Seeking teams building beautiful web or mobile platforms.',
      githubUrl: 'https://github.com/samrivera', portfolioUrl: 'https://samrivera.design',
      weeklyHours: 14, interests: ['Design', 'Web Dev'],
      xp: 280, level: 2,
      skills: [
        { name: 'Figma', level: 'Advanced' },
        { name: 'UI/UX', level: 'Advanced' },
        { name: 'Tailwind CSS', level: 'Intermediate' },
        { name: 'HTML/CSS', level: 'Advanced' },
      ],
    },
  ];

  const dpuStudents = {};
  for (const s of dpuStudentsData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        fullName: s.fullName,
        institutionId: dypDpu.id,
        studentProfile: {
          upsert: {
            update: { department: s.department, year: s.year },
            create: { department: s.department, year: s.year },
          },
        },
      },
      create: {
        email: s.email,
        passwordHash: studentHash,
        fullName: s.fullName,
        role: 'student',
        institutionId: dypDpu.id,
        studentProfile: {
          create: {
            department: s.department,
            year: s.year,
            bio: s.bio,
            githubUrl: s.githubUrl || null,
            linkedinUrl: s.linkedinUrl || null,
            portfolioUrl: s.portfolioUrl || null,
            weeklyHours: s.weeklyHours,
            interests: JSON.stringify(s.interests),
            onboardingDone: true,
            profileStrength: 85,
            xp: s.xp,
            level: s.level,
          },
        },
      },
      include: { studentProfile: true },
    });
    dpuStudents[s.email] = user;

    // Add skills
    for (const sk of s.skills) {
      if (skills[sk.name]) {
        await prisma.userSkill.upsert({
          where: { profileId_skillId: { profileId: user.studentProfile.id, skillId: skills[sk.name].id } },
          update: { level: sk.level },
          create: { profileId: user.studentProfile.id, skillId: skills[sk.name].id, level: sk.level },
        });
      }
    }
  }

  console.log('✅ DYP DPU students created');

  // ── Stanford Students ──────────────────────────────────────────
  const stanfordStudentsData = [
    {
      email: 'grace@stanford.edu', fullName: 'Grace Liu', department: 'Computer Engineering', year: 3,
      bio: 'Flutter developer and mobile enthusiast. Building cross-platform apps that delight users.',
      githubUrl: 'https://github.com/graceliu', weeklyHours: 12, interests: ['Mobile', 'Design', 'Web Dev'],
      xp: 290, level: 2,
      skills: [
        { name: 'Flutter', level: 'Advanced' },
        { name: 'React Native', level: 'Intermediate' },
        { name: 'Figma', level: 'Intermediate' },
        { name: 'Firebase', level: 'Intermediate' },
        { name: 'Dart', level: 'Advanced' },
      ],
    },
    {
      email: 'henry@stanford.edu', fullName: 'Henry Thompson', department: 'Data Science', year: 4,
      bio: 'Data scientist and researcher. Expertise in NLP and computer vision.',
      githubUrl: 'https://github.com/henryt', weeklyHours: 15, interests: ['ML/AI', 'Data Science', 'Research'],
      xp: 420, level: 3,
      skills: [
        { name: 'Python', level: 'Advanced' },
        { name: 'Machine Learning', level: 'Advanced' },
        { name: 'Deep Learning', level: 'Intermediate' },
        { name: 'NLP', level: 'Intermediate' },
        { name: 'PyTorch', level: 'Intermediate' },
        { name: 'Computer Vision', level: 'Beginner' },
      ],
    },
    {
      email: 'iris@stanford.edu', fullName: 'Iris Nakamura', department: 'Design', year: 2,
      bio: 'Product designer and creative coder. I bridge the gap between design and engineering.',
      portfolioUrl: 'https://irisnakamura.design', weeklyHours: 10, interests: ['Design', 'Web Dev'],
      xp: 150, level: 1,
      skills: [
        { name: 'Figma', level: 'Advanced' },
        { name: 'UI/UX', level: 'Intermediate' },
        { name: 'React', level: 'Beginner' },
        { name: 'HTML/CSS', level: 'Advanced' },
      ],
    },
    {
      email: 'james@stanford.edu', fullName: 'James Okafor', department: 'Computer Engineering', year: 3,
      bio: 'Backend developer passionate about building APIs and working with databases at scale.',
      githubUrl: 'https://github.com/jamesokafor', weeklyHours: 18, interests: ['Backend', 'DevOps'],
      xp: 360, level: 2,
      skills: [
        { name: 'Go', level: 'Intermediate' },
        { name: 'Java', level: 'Advanced' },
        { name: 'Spring Boot', level: 'Intermediate' },
        { name: 'PostgreSQL', level: 'Advanced' },
        { name: 'Docker', level: 'Beginner' },
        { name: 'REST API', level: 'Advanced' },
      ],
    },
    {
      email: 'kate@stanford.edu', fullName: 'Kate Nguyen', department: 'Computer Engineering', year: 1,
      bio: 'Incoming freshman excited about web development and open source. Learning fast!',
      weeklyHours: 6, interests: ['Web Dev', 'Design'],
      xp: 30, level: 1,
      skills: [
        { name: 'HTML/CSS', level: 'Intermediate' },
        { name: 'JavaScript', level: 'Beginner' },
        { name: 'Figma', level: 'Beginner' },
      ],
    },
    {
      email: 'liam@stanford.edu', fullName: 'Liam Patel', department: 'Information Technology', year: 4,
      bio: 'Full-stack developer + DevOps guy. Senior who loves mentoring juniors and building side projects.',
      githubUrl: 'https://github.com/liampatel', linkedinUrl: 'https://linkedin.com/in/liampatel',
      weeklyHours: 20, interests: ['Full-Stack', 'DevOps', 'Mentoring'],
      xp: 620, level: 4,
      skills: [
        { name: 'React', level: 'Advanced' },
        { name: 'Node.js', level: 'Advanced' },
        { name: 'TypeScript', level: 'Advanced' },
        { name: 'PostgreSQL', level: 'Advanced' },
        { name: 'Docker', level: 'Advanced' },
        { name: 'AWS', level: 'Intermediate' },
        { name: 'GraphQL', level: 'Intermediate' },
      ],
    },
  ];

  const stanfordStudents = {};
  for (const s of stanfordStudentsData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: studentHash,
        fullName: s.fullName,
        role: 'student',
        institutionId: stanford.id,
        studentProfile: {
          create: {
            department: s.department,
            year: s.year,
            bio: s.bio,
            githubUrl: s.githubUrl || null,
            linkedinUrl: s.linkedinUrl || null,
            portfolioUrl: s.portfolioUrl || null,
            weeklyHours: s.weeklyHours,
            interests: JSON.stringify(s.interests),
            onboardingDone: true,
            profileStrength: 80,
            xp: s.xp,
            level: s.level,
          },
        },
      },
      include: { studentProfile: true },
    });
    stanfordStudents[s.email] = user;

    for (const sk of s.skills) {
      if (skills[sk.name]) {
        await prisma.userSkill.upsert({
          where: { profileId_skillId: { profileId: user.studentProfile.id, skillId: skills[sk.name].id } },
          update: { level: sk.level },
          create: { profileId: user.studentProfile.id, skillId: skills[sk.name].id, level: sk.level },
        });
      }
    }
  }

  console.log('✅ Stanford students created');

  // Award first badges
  for (const user of Object.values({ ...dpuStudents, ...stanfordStudents })) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: user.id, badgeId: badges['Early Bird'].id } },
      update: {},
      create: { userId: user.id, badgeId: badges['Early Bird'].id },
    });
  }

  // ── DYP DPU Projects (6) ───────────────────────────────────────────
  const dpuProjectsData = [
    {
      title: 'CampusConnect — Student Social Platform',
      description: 'A social networking app built specifically for DYP DPU students to connect over shared interests, form study groups, and collaborate on projects outside of class.',
      goals: 'Build a fully functional mobile app with real-time features and a recommendation engine for connecting students with similar interests.',
      domain: 'Web Dev',
      duration: '4 months',
      owner: 'alice@dpu.edu.in',
      status: 'active',
      roles: [
        {
          title: 'Backend Developer',
          seats: 2, hoursPerWeek: 12,
          skills: [
            { name: 'Node.js', level: 'Intermediate', importance: 'must-have' },
            { name: 'PostgreSQL', level: 'Intermediate', importance: 'must-have' },
            { name: 'REST API', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Mobile Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'React Native', level: 'Intermediate', importance: 'must-have' },
            { name: 'JavaScript', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'UI/UX Designer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'Figma', level: 'Intermediate', importance: 'must-have' },
            { name: 'UI/UX', level: 'Intermediate', importance: 'must-have' },
          ],
        },
      ],
    },
    {
      title: 'Smart Campus Energy Monitor',
      description: 'IoT-based energy monitoring system for DYP DPU buildings. Collects sensor data, analyzes patterns, and provides actionable insights to reduce energy waste.',
      goals: 'Deploy sensors, build data pipeline, ML-based anomaly detection, and a real-time dashboard for facilities management.',
      domain: 'ML/AI',
      duration: '6 months',
      owner: 'bob@dpu.edu.in',
      status: 'active',
      roles: [
        {
          title: 'ML Engineer',
          seats: 1, hoursPerWeek: 15,
          skills: [
            { name: 'Python', level: 'Advanced', importance: 'must-have' },
            { name: 'Machine Learning', level: 'Intermediate', importance: 'must-have' },
            { name: 'TensorFlow', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'Frontend Developer',
          seats: 1, hoursPerWeek: 8,
          skills: [
            { name: 'React', level: 'Intermediate', importance: 'must-have' },
            { name: 'JavaScript', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Data Pipeline Specialist',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'Python', level: 'Intermediate', importance: 'must-have' },
            { name: 'PostgreSQL', level: 'Beginner', importance: 'must-have' },
          ],
        },
      ],
    },
    {
      title: 'AccessLearn — Accessible E-Learning Platform',
      description: 'An e-learning platform built with accessibility at its core — screen reader support, dyslexia-friendly fonts, keyboard-only navigation, and customizable contrast.',
      goals: 'WCAG 2.1 AA compliance, multilingual support, adaptive quizzes, and progress tracking with gamification.',
      domain: 'Web Dev',
      duration: '5 months',
      owner: 'carol@dpu.edu.in',
      status: 'active',
      roles: [
        {
          title: 'Full-Stack Developer',
          seats: 2, hoursPerWeek: 14,
          skills: [
            { name: 'React', level: 'Intermediate', importance: 'must-have' },
            { name: 'Node.js', level: 'Intermediate', importance: 'must-have' },
            { name: 'PostgreSQL', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'UI/UX Designer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'Figma', level: 'Intermediate', importance: 'must-have' },
            { name: 'UI/UX', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Accessibility Frontend Engineer',
          seats: 1, hoursPerWeek: 8,
          skills: [
            { name: 'HTML/CSS', level: 'Advanced', importance: 'must-have' },
            { name: 'Tailwind CSS', level: 'Intermediate', importance: 'nice-to-have' },
          ],
        },
      ],
    },
    {
      title: 'DevFlow — CI/CD Dashboard for Student Projects',
      description: 'A lightweight CI/CD monitoring dashboard that helps student teams track their deployment pipelines, monitor build status, and automate testing workflows.',
      goals: 'GitHub Actions integration, real-time build status, test coverage reports, and team collaboration features.',
      domain: 'DevOps',
      duration: '3 months',
      owner: 'david@dpu.edu.in',
      status: 'active',
      roles: [
        {
          title: 'DevOps Engineer',
          seats: 1, hoursPerWeek: 15,
          skills: [
            { name: 'Docker', level: 'Intermediate', importance: 'must-have' },
            { name: 'CI/CD', level: 'Intermediate', importance: 'must-have' },
            { name: 'AWS', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'Dashboard Frontend Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'React', level: 'Intermediate', importance: 'must-have' },
            { name: 'TypeScript', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
      ],
    },
    {
      title: 'FoodSave — Campus Food Waste Reducer',
      description: 'A mobile app connecting campus dining halls with students and nearby food banks. Real-time notifications about surplus food, reservations, and impact tracking.',
      goals: 'Reduce campus food waste by 30%, feed students in need, and provide sustainability impact reports.',
      domain: 'Mobile',
      duration: '4 months',
      owner: 'frank@dpu.edu.in',
      status: 'pending',
      roles: [
        {
          title: 'Mobile Developer',
          seats: 2, hoursPerWeek: 12,
          skills: [
            { name: 'React Native', level: 'Intermediate', importance: 'must-have' },
            { name: 'JavaScript', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Backend Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'Python', level: 'Intermediate', importance: 'must-have' },
            { name: 'FastAPI', level: 'Beginner', importance: 'must-have' },
            { name: 'MongoDB', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'Product Designer',
          seats: 1, hoursPerWeek: 8,
          skills: [
            { name: 'Figma', level: 'Intermediate', importance: 'must-have' },
            { name: 'UI/UX', level: 'Beginner', importance: 'must-have' },
          ],
        },
      ],
    },
    {
      title: 'MedQuiz AI — Medical Study Assistant',
      description: 'An AI-powered quiz platform for pre-med students. Uses spaced repetition and adaptive difficulty to help students master MCAT topics.',
      goals: 'GPT-powered question generation, spaced repetition algorithm, performance analytics, and peer study groups.',
      domain: 'ML/AI',
      duration: '5 months',
      owner: 'bob@dpu.edu.in',
      status: 'completed',
      roles: [
        {
          title: 'AI Researcher',
          seats: 1, hoursPerWeek: 15,
          skills: [
            { name: 'Python', level: 'Advanced', importance: 'must-have' },
            { name: 'Machine Learning', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Full-Stack Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'React', level: 'Intermediate', importance: 'must-have' },
            { name: 'Node.js', level: 'Intermediate', importance: 'must-have' },
          ],
        },
      ],
    },
  ];

  const dpuProjects = {};
  for (const p of dpuProjectsData) {
    const owner = dpuStudents[p.owner];
    let project = await prisma.project.findFirst({ where: { title: p.title, institutionId: dypDpu.id } });
    if (!project) project = await prisma.project.create({ data: {
        title: p.title,
        description: p.description,
        goals: p.goals || null,
        domain: p.domain,
        duration: p.duration || null,
        status: p.status,
        ownerId: owner.id,
        institutionId: dypDpu.id,
      } });
    else project = await prisma.project.update({ where: { id: project.id }, data: { description: p.description } });
    for (const r of p.roles) {
      let role = await prisma.projectRole.findFirst({ where: { projectId: project.id, title: r.title } });
      if (!role) role = await prisma.projectRole.create({ data: { projectId: project.id, title: r.title, seats: r.seats, hoursPerWeek: r.hoursPerWeek } });
      for (const s of r.skills) await prisma.roleSkill.upsert({ where: { roleId_skillId: { roleId: role.id, skillId: skills[s.name].id } }, update: { requiredLevel: s.level, importance: s.importance || 'must-have' }, create: { roleId: role.id, skillId: skills[s.name].id, requiredLevel: s.level, importance: s.importance || 'must-have' } });
    }

    // Add owner as member
    const ownerRole = await prisma.projectRole.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' } });
    await prisma.teamMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: owner.id } },
      update: { roleId: null },
      create: { projectId: project.id, userId: owner.id, roleId: null },
    });

    dpuProjects[p.title] = project;
  }

  console.log('✅ DYP DPU projects created');

  // ── Stanford Projects (4) ──────────────────────────────────────
  const stanfordProjectsData = [
    {
      title: 'NeuroPath — Brain Tumor Detection AI',
      description: 'Deep learning model for early detection of brain tumors from MRI scans. Working with Stanford Medical Center data (anonymized).',
      goals: 'Achieve 95%+ accuracy on MRI classification, deploy as a web API, and create an explainability dashboard.',
      domain: 'ML/AI',
      duration: '6 months',
      owner: 'henry@stanford.edu',
      status: 'active',
      roles: [
        {
          title: 'Deep Learning Engineer',
          seats: 1, hoursPerWeek: 20,
          skills: [
            { name: 'Python', level: 'Advanced', importance: 'must-have' },
            { name: 'PyTorch', level: 'Intermediate', importance: 'must-have' },
            { name: 'Computer Vision', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Backend Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'Python', level: 'Intermediate', importance: 'must-have' },
            { name: 'FastAPI', level: 'Beginner', importance: 'must-have' },
          ],
        },
        {
          title: 'Medical Data Pipeline Specialist',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'Python', level: 'Intermediate', importance: 'must-have' },
            { name: 'Data Science', level: 'Intermediate', importance: 'must-have' },
          ],
        },
      ],
    },
    {
      title: 'StudyBuddy — Peer Learning Platform',
      description: 'Matching platform for Stanford students to find study partners, form study groups, and share notes. AI-powered matching based on courses and learning styles.',
      goals: 'Launch before finals week with 500+ student sign-ups.',
      domain: 'Web Dev',
      duration: '3 months',
      owner: 'liam@stanford.edu',
      status: 'active',
      roles: [
        {
          title: 'Frontend Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'React', level: 'Intermediate', importance: 'must-have' },
            { name: 'TypeScript', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'UI/UX Designer',
          seats: 1, hoursPerWeek: 8,
          skills: [
            { name: 'Figma', level: 'Intermediate', importance: 'must-have' },
            { name: 'UI/UX', level: 'Beginner', importance: 'must-have' },
          ],
        },
        {
          title: 'Backend API Engineer',
          seats: 1, hoursPerWeek: 12,
          skills: [
            { name: 'Node.js', level: 'Intermediate', importance: 'must-have' },
            { name: 'PostgreSQL', level: 'Beginner', importance: 'must-have' },
          ],
        },
      ],
    },
    {
      title: 'GreenRoute — Eco-Friendly Commute Planner',
      description: 'Mobile app that helps Stanford commuters choose the most eco-friendly route. Integrates with transit APIs, shows carbon footprint, and rewards green choices.',
      goals: 'Reduce per-user carbon footprint by 15% through smart routing and gamification.',
      domain: 'Mobile',
      duration: '4 months',
      owner: 'grace@stanford.edu',
      status: 'active',
      roles: [
        {
          title: 'Flutter Developer',
          seats: 1, hoursPerWeek: 12,
          skills: [
            { name: 'Flutter', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Backend Developer',
          seats: 1, hoursPerWeek: 12,
          skills: [
            { name: 'Node.js', level: 'Intermediate', importance: 'must-have' },
            { name: 'PostgreSQL', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'Mobile UI/UX Designer',
          seats: 1, hoursPerWeek: 8,
          skills: [
            { name: 'Figma', level: 'Intermediate', importance: 'must-have' },
            { name: 'UI/UX', level: 'Intermediate', importance: 'must-have' },
          ],
        },
      ],
    },
    {
      title: 'BlockVote — Secure Campus Voting System',
      description: 'Blockchain-based voting system for Stanford student government elections. Transparent, tamper-proof, and auditable.',
      goals: 'Zero downtime during elections, full vote auditability, and mobile-friendly voter interface.',
      domain: 'Blockchain',
      duration: '5 months',
      owner: 'james@stanford.edu',
      status: 'active',
      roles: [
        {
          title: 'Smart Contract Developer',
          seats: 1, hoursPerWeek: 15,
          skills: [
            { name: 'Blockchain', level: 'Intermediate', importance: 'must-have' },
          ],
        },
        {
          title: 'Frontend Developer',
          seats: 1, hoursPerWeek: 10,
          skills: [
            { name: 'React', level: 'Intermediate', importance: 'must-have' },
            { name: 'TypeScript', level: 'Beginner', importance: 'nice-to-have' },
          ],
        },
        {
          title: 'QA & Security Tester',
          seats: 1, hoursPerWeek: 8,
          skills: [
            { name: 'Git', level: 'Intermediate', importance: 'must-have' },
            { name: 'JavaScript', level: 'Intermediate', importance: 'must-have' },
          ],
        },
      ],
    },
  ];

  for (const p of stanfordProjectsData) {
    const owner = stanfordStudents[p.owner];
    let project = await prisma.project.findFirst({ where: { title: p.title, institutionId: stanford.id } });
    if (!project) project = await prisma.project.create({ data: {
        title: p.title,
        description: p.description,
        goals: p.goals || null,
        domain: p.domain,
        duration: p.duration || null,
        status: p.status,
        ownerId: owner.id,
        institutionId: stanford.id,
      } });
    for (const r of p.roles) {
      let role = await prisma.projectRole.findFirst({ where: { projectId: project.id, title: r.title } });
      if (!role) role = await prisma.projectRole.create({ data: { projectId: project.id, title: r.title, seats: r.seats, hoursPerWeek: r.hoursPerWeek } });
      for (const s of r.skills) await prisma.roleSkill.upsert({ where: { roleId_skillId: { roleId: role.id, skillId: skills[s.name].id } }, update: { requiredLevel: s.level, importance: s.importance || 'must-have' }, create: { roleId: role.id, skillId: skills[s.name].id, requiredLevel: s.level, importance: s.importance || 'must-have' } });
    }
    const ownerRole = await prisma.projectRole.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' } });
    await prisma.teamMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: owner.id } },
      update: { roleId: null },
      create: { projectId: project.id, userId: owner.id, roleId: null },
    });
  }

  console.log('✅ Stanford projects created');

  // ── Add some team members to DYP DPU projects ──────────────────────
  const campusConnect = dpuProjects['CampusConnect — Student Social Platform'];
  const energyMonitor = dpuProjects['Smart Campus Energy Monitor'];
  const accessLearn = dpuProjects['AccessLearn — Accessible E-Learning Platform'];
  const medquiz = dpuProjects['MedQuiz AI — Medical Study Assistant'];

  const teamMembersToAdd = [
    { projectId: campusConnect.id, userId: dpuStudents['frank@dpu.edu.in'].id, roleTitle: 'Backend Developer' },
    { projectId: energyMonitor.id, userId: dpuStudents['alice@dpu.edu.in'].id, roleTitle: 'Frontend Developer' },
    { projectId: accessLearn.id, userId: dpuStudents['david@dpu.edu.in'].id, roleTitle: 'Accessibility Frontend Engineer' },
    { projectId: medquiz.id, userId: dpuStudents['alice@dpu.edu.in'].id, roleTitle: 'Full-Stack Developer' },
    { projectId: medquiz.id, userId: dpuStudents['carol@dpu.edu.in'].id, roleTitle: 'AI Researcher' },
  ];
  for (const tm of teamMembersToAdd) {
    const role = await prisma.projectRole.findFirst({ where: { projectId: tm.projectId, title: tm.roleTitle } });
    await prisma.teamMember.upsert({
      where: { projectId_userId: { projectId: tm.projectId, userId: tm.userId } },
      update: { roleId: role?.id || null },
      create: { projectId: tm.projectId, userId: tm.userId, roleId: role?.id || null },
    });
  }

  // Keep each role's available-seat count aligned with active seeded members.
  for (const project of Object.values(dpuProjects)) {
    const roles = await prisma.projectRole.findMany({ where: { projectId: project.id } });
    for (const role of roles) {
      const filledSeats = await prisma.teamMember.count({ where: { projectId: project.id, roleId: role.id, leftAt: null, userId: { not: project.ownerId } } });
      await prisma.projectRole.update({ where: { id: role.id }, data: { filledSeats } });
    }
  }

  // Award badges for completed project members
  for (const userId of [
    dpuStudents['bob@dpu.edu.in'].id,
    dpuStudents['alice@dpu.edu.in'].id,
    dpuStudents['carol@dpu.edu.in'].id,
  ]) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badges['First Project'].id } },
      update: {},
      create: { userId, badgeId: badges['First Project'].id },
    });
  }

  // ── Ideas ──────────────────────────────────────────────────────
  const dpuIdeasData = [
    {
      title: 'Peer Mentorship Matching App',
      problem: 'Many freshmen struggle with the transition to college. A smart matching system could pair them with upperclassmen mentors based on major, interests, and personality.',
      domain: 'Web Dev',
      author: 'emily@dpu.edu.in',
    },
    {
      title: 'Open Source Textbook Marketplace',
      problem: 'Textbooks are insanely expensive. What if students could borrow, lend, or trade textbooks using a campus-based platform with ratings and availability tracking?',
      domain: 'Mobile',
      author: 'carol@dpu.edu.in',
    },
  ];

  const stanfordIdeasData = [
    {
      title: 'AI-Powered Resume Builder for CS Students',
      problem: 'CS students often have strong skills but weak resumes. An AI tool that analyzes project descriptions and generates tailored bullet points could be a game-changer.',
      domain: 'ML/AI',
      author: 'kate@stanford.edu',
    },
    {
      title: 'Campus Mental Health Resource Aggregator',
      problem: 'Students seeking mental health support face a confusing web of services. A single, compassionate platform aggregating all campus resources with anonymous chat would help enormously.',
      domain: 'Web Dev',
      author: 'iris@stanford.edu',
    },
  ];

  for (const idea of dpuIdeasData) {
    let created = await prisma.idea.findFirst({ where: { title: idea.title, institutionId: dypDpu.id } });
    const ideaData = {
        title: idea.title,
        problem: idea.problem,
        domain: idea.domain,
        authorId: dpuStudents[idea.author].id,
        institutionId: dypDpu.id,
      };
    if (created) created = await prisma.idea.update({ where: { id: created.id }, data: ideaData });
    else created = await prisma.idea.create({ data: ideaData });
    // Add some votes
    const voters = Object.values(dpuStudents).filter(s => s.email !== idea.author).slice(0, 3);
    for (const voter of voters) {
      await prisma.ideaVote.upsert({ where: { ideaId_userId: { ideaId: created.id, userId: voter.id } }, update: {}, create: { ideaId: created.id, userId: voter.id } });
    }
  }

  for (const idea of stanfordIdeasData) {
    const existing = await prisma.idea.findFirst({ where: { title: idea.title, institutionId: stanford.id } });
    const ideaData = {
        title: idea.title,
        problem: idea.problem,
        domain: idea.domain,
        authorId: stanfordStudents[idea.author].id,
        institutionId: stanford.id,
      };
    if (existing) await prisma.idea.update({ where: { id: existing.id }, data: ideaData });
    else await prisma.idea.create({ data: ideaData });
  }

  console.log('✅ Ideas created');

  // ── Community Challenges ───────────────────────────────────────
  const seededChallenges = [
      {
        title: 'Accessibility Audit Tool for Campus Websites',
        description: 'The IT department at DYP DPU needs a tool that automatically audits Pune campus websites for WCAG accessibility compliance and generates actionable reports. This is a real need — over 30% of the Vidyapeeth web properties have accessibility issues.',
        domain: 'Web Dev',
        postedBy: dpuAdmin.id,
        institutionId: dypDpu.id,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      {
        title: 'Smart Parking for Campus Commuters',
        description: 'Stanford Transportation needs a real-time parking availability system. Sensors in key lots feed into an app that shows open spots and predicts availability using historical data. Reduce commuter frustration and carbon footprint.',
        domain: 'Mobile',
        postedBy: stanfordAdmin.id,
        institutionId: stanford.id,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    ];
  for (const challenge of seededChallenges) {
    const existing = await prisma.challenge.findFirst({ where: { title: challenge.title, institutionId: challenge.institutionId } });
    if (existing) await prisma.challenge.update({ where: { id: existing.id }, data: challenge });
    else await prisma.challenge.create({ data: challenge });
  }

  console.log('✅ Community challenges created');

  // ── Sample notifications ───────────────────────────────────────
  const seededNotifications = [
      {
        userId: dpuStudents['alice@dpu.edu.in'].id,
        type: 'application_accepted',
        title: '🎉 Application Accepted!',
        message: 'You\'ve been accepted as Frontend Developer in "Smart Campus Energy Monitor"!',
        link: '/projects/' + energyMonitor.id,
        isRead: false,
      },
      {
        userId: dpuStudents['bob@dpu.edu.in'].id,
        type: 'badge',
        title: '🏅 New Badge Earned!',
        message: 'You earned the "First Project" badge. Keep it up!',
        link: '/profile/' + dpuStudents['bob@dpu.edu.in'].id,
        isRead: false,
      },
    ];
  for (const notification of seededNotifications) {
    const existing = await prisma.notification.findFirst({ where: { userId: notification.userId, type: notification.type, title: notification.title } });
    if (existing) await prisma.notification.update({ where: { id: existing.id }, data: notification });
    else await prisma.notification.create({ data: notification });
  }

  console.log('✅ Sample notifications created');

  // ── Sample tasks for active project ───────────────────────────
  const tasks = [
    { title: 'Set up project repository', status: 'done', priority: 'high', assigneeId: dpuStudents['alice@dpu.edu.in'].id },
    { title: 'Design database schema', status: 'done', priority: 'high', assigneeId: dpuStudents['alice@dpu.edu.in'].id },
    { title: 'Build authentication API', status: 'inprogress', priority: 'high', assigneeId: dpuStudents['frank@dpu.edu.in'].id },
    { title: 'Design onboarding UI flow', status: 'inprogress', priority: 'medium', assigneeId: dpuStudents['alice@dpu.edu.in'].id },
    { title: 'Implement real-time messaging', status: 'todo', priority: 'medium' },
    { title: 'Deploy to staging environment', status: 'todo', priority: 'low' },
    { title: 'Write API documentation', status: 'todo', priority: 'low' },
  ];

  for (const t of tasks) {
    const existing = await prisma.task.findFirst({ where: { projectId: campusConnect.id, title: t.title } });
    const taskData = { ...t, projectId: campusConnect.id, createdById: dpuStudents['alice@dpu.edu.in'].id };
    if (existing) await prisma.task.update({ where: { id: existing.id }, data: taskData });
    else await prisma.task.create({ data: taskData });
  }

  // Milestones
  const seededMilestones = [
    { title: 'MVP Launch', description: 'Core features: auth, profiles, social feed', completed: true, progress: 100 },
    { title: 'Beta Release', description: 'Onboarding, notifications, mobile-responsive', completed: false, progress: 20 },
    { title: 'Public Launch', description: 'Full feature set, 100 users', completed: false, progress: 0 },
  ];
  for (const [index, milestone] of seededMilestones.entries()) {
    const data = { ...milestone, projectId: campusConnect.id, dueDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000), completedAt: milestone.completed ? new Date() : null };
    const existing = await prisma.milestone.findFirst({ where: { projectId: campusConnect.id, title: milestone.title } });
    if (existing) await prisma.milestone.update({ where: { id: existing.id }, data });
    else await prisma.milestone.create({ data });
  }

  // Announcement
  const seededAnnouncements = [
    { title: '🚀 Team is forming!', content: 'Welcome to CampusConnect! We are still looking for a Backend Developer and Mobile Developer. Apply now!', isPinned: true },
    { title: 'Sprint kickoff', content: 'This week we are finishing authentication and preparing the first integrated demo.', isPinned: false },
  ];
  for (const announcement of seededAnnouncements) {
    const data = { ...announcement, projectId: campusConnect.id, authorId: dpuStudents['alice@dpu.edu.in'].id };
    const existing = await prisma.announcement.findFirst({ where: { projectId: campusConnect.id, title: announcement.title } });
    if (existing) await prisma.announcement.update({ where: { id: existing.id }, data });
    else await prisma.announcement.create({ data });
  }

  const seededMessages = [
    ['alice@dpu.edu.in', 'Welcome to the CampusConnect workspace!'],
    ['frank@dpu.edu.in', 'Thanks! I will take the authentication API task.'],
    ['alice@dpu.edu.in', 'Great, the database schema is ready for review.'],
    ['frank@dpu.edu.in', 'I have pushed the first API endpoints.'],
    ['alice@dpu.edu.in', 'I will connect the onboarding screens today.'],
    ['frank@dpu.edu.in', 'The login flow is working locally now.'],
    ['alice@dpu.edu.in', 'Let us sync on the staging deployment tomorrow.'],
    ['frank@dpu.edu.in', 'Sounds good. I will update the documentation too.'],
    ['alice@dpu.edu.in', 'Sprint kickoff notes are in the announcements tab.'],
  ];
  for (const [index, [email, content]] of seededMessages.entries()) {
    const existing = await prisma.message.findFirst({ where: { projectId: campusConnect.id, type: 'team', content } });
    if (!existing) await prisma.message.create({ data: { projectId: campusConnect.id, senderId: dpuStudents[email].id, content, type: 'team', createdAt: new Date(Date.now() - (seededMessages.length - index) * 60_000) } });
  }

  console.log('✅ Tasks, milestones, announcements created');

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Student:  alice@dpu.edu.in   / demo1234');
  console.log('  Student:  henry@stanford.edu / demo1234');
  console.log('  Admin:    admin@dpu.edu.in   / admin1234');
  console.log('\n📊 Data summary:');
  console.log(`  Institutions: 2`);
  console.log(`  Students: ${dpuStudentsData.length + stanfordStudentsData.length}`);
  console.log(`  Projects: ${dpuProjectsData.length + stanfordProjectsData.length}`);
  console.log(`  Skills: ${Object.keys(skills).length}`);
  console.log(`  Ideas: 4`);
  console.log(`  Challenges: 2`);
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
