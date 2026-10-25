const prisma = require('./prisma');
const { projectAccessDecision } = require('../services/workspacePolicy');

async function getProjectAccess(projectId, user) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { leftAt: null }, select: { userId: true } } },
  });

  const decision = projectAccessDecision(project, user);
  if (!decision.allowed) return { status: decision.status, error: decision.error };
  return { project, ...decision };
}

module.exports = { getProjectAccess };
