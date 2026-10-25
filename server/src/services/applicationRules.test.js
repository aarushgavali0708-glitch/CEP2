/**
 * Unit Tests for Application Rules & Seat Allocation
 * Tests:
 * 1. Cannot apply to own project
 * 2. Duplicate application check
 * 3. Role full / no seats left check
 * 4. Institution isolation enforcement
 * 5. Team membership duplicate check
 * 6. Application acceptance seat decrement and auto-closure
 * 7. Cannot accept into full role
 */

const {
  validateApplication,
  validateAcceptance,
  computeUpdatedSeats,
} = require('./applicationRules');

describe('Application Rules & Owner Management', () => {
  const defaultProject = {
    id: 'proj-1',
    title: 'Campus Solar Monitor',
    ownerId: 'owner-alice',
    institutionId: 'inst-dpu',
  };

  const defaultRole = {
    id: 'role-1',
    projectId: 'proj-1',
    title: 'Frontend Developer',
    seats: 2,
    filledSeats: 0,
  };

  test('1. Valid application passes validation', () => {
    const result = validateApplication({
      studentId: 'student-bob',
      studentInstitutionId: 'inst-dpu',
      project: defaultProject,
      role: defaultRole,
      existingApplication: null,
      isExistingMember: false,
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('2. Student cannot apply to their own project', () => {
    const result = validateApplication({
      studentId: 'owner-alice',
      studentInstitutionId: 'inst-dpu',
      project: defaultProject,
      role: defaultRole,
      existingApplication: null,
      isExistingMember: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot apply to your own project/i);
    expect(result.status).toBe(400);
  });

  test('3. Student cannot apply twice to the same role (duplicate)', () => {
    const result = validateApplication({
      studentId: 'student-bob',
      studentInstitutionId: 'inst-dpu',
      project: defaultProject,
      role: defaultRole,
      existingApplication: { id: 'app-1', status: 'pending' },
      isExistingMember: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already applied/i);
    expect(result.status).toBe(400);
  });

  test('4. Student CAN re-apply if previously withdrawn', () => {
    const result = validateApplication({
      studentId: 'student-bob',
      studentInstitutionId: 'inst-dpu',
      project: defaultProject,
      role: defaultRole,
      existingApplication: { id: 'app-1', status: 'withdrawn' },
      isExistingMember: false,
    });

    expect(result.valid).toBe(true);
  });

  test('5. Cannot apply to a role with no seats left (role is full)', () => {
    const fullRole = {
      ...defaultRole,
      seats: 2,
      filledSeats: 2,
    };

    const result = validateApplication({
      studentId: 'student-bob',
      studentInstitutionId: 'inst-dpu',
      project: defaultProject,
      role: fullRole,
      existingApplication: null,
      isExistingMember: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already filled/i);
    expect(result.status).toBe(400);
  });

  test('6. Institution isolation: student cannot apply across institutions', () => {
    const result = validateApplication({
      studentId: 'student-charlie',
      studentInstitutionId: 'inst-stanford', // different institution
      project: defaultProject, // inst-dpu
      role: defaultRole,
      existingApplication: null,
      isExistingMember: false,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/outside your institution/i);
    expect(result.status).toBe(403);
  });

  test('7. Existing team member cannot re-apply', () => {
    const result = validateApplication({
      studentId: 'student-bob',
      studentInstitutionId: 'inst-dpu',
      project: defaultProject,
      role: defaultRole,
      existingApplication: null,
      isExistingMember: true,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already a team member/i);
    expect(result.status).toBe(400);
  });

  describe('Acceptance & Seat Logic', () => {
    test('8. Accepting an application calculates new filled seats and detects remaining seats', () => {
      const { newFilledSeats, isClosed, remainingSeats } = computeUpdatedSeats(0, 2);
      expect(newFilledSeats).toBe(1);
      expect(remainingSeats).toBe(1);
      expect(isClosed).toBe(false);
    });

    test('9. Accepting the final seat automatically closes the role', () => {
      const { newFilledSeats, isClosed, remainingSeats } = computeUpdatedSeats(1, 2);
      expect(newFilledSeats).toBe(2);
      expect(remainingSeats).toBe(0);
      expect(isClosed).toBe(true);
    });

    test('10. Owner cannot accept an applicant if the role is already full', () => {
      const fullRole = {
        ...defaultRole,
        seats: 1,
        filledSeats: 1,
      };
      const application = { id: 'app-9', status: 'pending' };

      const result = validateAcceptance({ role: fullRole, application });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/already full/i);
      expect(result.status).toBe(400);
    });

    test('11. Cannot accept an application that is not in pending status', () => {
      const application = { id: 'app-9', status: 'rejected' };

      const result = validateAcceptance({ role: defaultRole, application });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/status "rejected"/i);
    });
  });
});
