const OWNER_ACTIONS = new Set(['milestones', 'announcements', 'memberRemoval', 'completion']);

function projectAccessDecision(project, user) {
  if (!project) return { allowed: false, status: 404, error: 'Project not found' };
  if (project.institutionId !== user.institutionId) return { allowed: false, status: 403, error: 'You are not allowed to access this project' };
  const isOwner = project.ownerId === user.id;
  const isMember = (project.members || []).some((member) => member.userId === user.id);
  return { allowed: isOwner || isMember, status: isOwner || isMember ? undefined : 403, error: isOwner || isMember ? undefined : 'You are not allowed to access this project', isOwner, isMember };
}

function workspaceActionDecision(project, isOwner, action) {
  if (project.status === 'completed' && action !== 'read') return { allowed: false, status: 409, error: 'Project is completed and the workspace is read-only' };
  if (OWNER_ACTIONS.has(action) && !isOwner) return { allowed: false, status: 403, error: 'Only the project owner can do that' };
  return { allowed: true };
}

function memberRemovalEffects(project, member) {
  if (member.userId === project.ownerId) return { allowed: false, error: 'The project owner cannot be removed' };
  return { allowed: true, restoreRoleSeat: Boolean(member.roleId), unassignTasks: true, revokeWorkspaceAccess: true, notifyRemovedMember: true };
}

module.exports = { projectAccessDecision, workspaceActionDecision, memberRemovalEffects };
