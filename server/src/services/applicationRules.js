/**
 * Application Rules & Seat Allocation Logic
 * Pure validation functions used by both API controllers and unit tests.
 */

function validateApplication({
  studentId,
  studentInstitutionId,
  project,
  role,
  existingApplication,
  isExistingMember,
}) {
  if (!role) {
    return { valid: false, error: 'Role not found', status: 404 };
  }
  if (!project) {
    return { valid: false, error: 'Project not found', status: 404 };
  }

  // 1. Institution isolation rule
  if (project.institutionId !== studentInstitutionId) {
    return {
      valid: false,
      error: 'Cannot apply to a project outside your institution',
      status: 403,
    };
  }

  // 2. Cannot apply to own project
  if (project.ownerId === studentId) {
    return {
      valid: false,
      error: 'You cannot apply to your own project',
      status: 400,
    };
  }

  // 3. Cannot apply to a full role
  if (role.filledSeats >= role.seats) {
    return {
      valid: false,
      error: 'Role is already filled',
      status: 400,
    };
  }

  // 4. Duplicate check (cannot apply twice to the same role unless previously withdrawn)
  if (existingApplication && existingApplication.status !== 'withdrawn') {
    return {
      valid: false,
      error: 'You already applied to this role',
      status: 400,
    };
  }

  // 5. Existing team member check
  if (isExistingMember) {
    return {
      valid: false,
      error: 'You are already a team member',
      status: 400,
    };
  }

  return { valid: true };
}

function validateAcceptance({ role, application }) {
  if (!application) {
    return { valid: false, error: 'Application not found', status: 404 };
  }
  if (!role) {
    return { valid: false, error: 'Role not found', status: 404 };
  }

  if (application.status !== 'pending') {
    return {
      valid: false,
      error: `Cannot accept application with status "${application.status}"`,
      status: 400,
    };
  }

  if (role.filledSeats >= role.seats) {
    return {
      valid: false,
      error: 'This role is already full',
      status: 400,
    };
  }

  return { valid: true };
}

function computeUpdatedSeats(currentFilledSeats, totalSeats) {
  const newFilledSeats = currentFilledSeats + 1;
  const isClosed = newFilledSeats >= totalSeats;
  const remainingSeats = Math.max(0, totalSeats - newFilledSeats);
  return {
    newFilledSeats,
    isClosed,
    remainingSeats,
  };
}

module.exports = {
  validateApplication,
  validateAcceptance,
  computeUpdatedSeats,
};
