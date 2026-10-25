const { projectAccessDecision, workspaceActionDecision, memberRemovalEffects } = require('./workspacePolicy');

describe('workspace permission rules', () => {
  const project = { id: 'p1', ownerId: 'owner', institutionId: 'inst-a', status: 'active', members: [{ userId: 'member' }] };
  const users = {
    owner: { id: 'owner', institutionId: 'inst-a' },
    member: { id: 'member', institutionId: 'inst-a' },
    outsider: { id: 'outsider', institutionId: 'inst-a' },
    otherInstitution: { id: 'remote', institutionId: 'inst-b' },
  };

  test.each([
    ['owner', 200], ['member', 200], ['outsider', 403], ['otherInstitution', 403],
  ])('%s has expected project access', (name, expected) => {
    const decision = projectAccessDecision(project, users[name]);
    expect(decision.allowed).toBe(expected === 200);
    if (expected !== 200) expect(decision.status).toBe(expected);
  });

  test('a missing project returns 404', () => expect(projectAccessDecision(null, users.owner).status).toBe(404));

  test.each(['tasks', 'chat'])('owner and members can %s while outsiders cannot', (action) => {
    expect(workspaceActionDecision(project, true, action).allowed).toBe(true);
    expect(workspaceActionDecision(project, false, action).allowed).toBe(true);
    expect(projectAccessDecision(project, users.outsider).allowed).toBe(false);
    expect(projectAccessDecision(project, users.otherInstitution).allowed).toBe(false);
  });

  test.each(['milestones', 'announcements', 'completion', 'memberRemoval'])('%s is owner-only', (action) => {
    expect(workspaceActionDecision(project, true, action).allowed).toBe(true);
    expect(workspaceActionDecision(project, false, action)).toMatchObject({ allowed: false, status: 403 });
  });

  test('completed projects reject task, chat, milestone, announcement and completion writes', () => {
    const completed = { ...project, status: 'completed' };
    for (const action of ['tasks', 'chat', 'milestones', 'announcements', 'completion']) {
      expect(workspaceActionDecision(completed, true, action)).toMatchObject({ allowed: false, status: 409 });
      expect(workspaceActionDecision(completed, false, action)).toMatchObject({ allowed: false, status: 409 });
    }
    expect(workspaceActionDecision(completed, false, 'read').allowed).toBe(true);
  });

  test('member removal restores role seat, unassigns tasks, notifies member and blocks future access; owner removal is denied', () => {
    expect(memberRemovalEffects(project, { userId: 'member', roleId: 'role1' })).toEqual({ allowed: true, restoreRoleSeat: true, unassignTasks: true, revokeWorkspaceAccess: true, notifyRemovedMember: true });
    expect(memberRemovalEffects(project, { userId: 'owner', roleId: null })).toMatchObject({ allowed: false });
    const afterRemoval = { ...project, members: [] };
    expect(projectAccessDecision(afterRemoval, users.member).allowed).toBe(false);
  });
});
