# RAAH – Contribution Guidelines

## 1. Purpose

This document defines the development and collaboration practices for contributors working on RAAH.

The objective is to maintain a consistent codebase, reduce integration conflicts and make changes easier to review.

## 2. General Principles

1. Understand the existing architecture before changing it.
2. Avoid unnecessary changes outside the assigned task.
3. Follow established project naming and coding conventions.
4. Keep API contracts and documentation aligned with implementation.
5. Do not commit secrets, credentials or environment files.
6. Test changes before submitting them.
7. Communicate changes that affect shared modules.

## 3. Git Workflow

### 3.1 Start from an Updated Main Branch

    git checkout main
    git pull origin main

### 3.2 Create a Feature Branch

Use a descriptive branch name for the task.

    git checkout -b feat/<name>-<feature>

Examples:
- feat/patient-emergency-request
- feat/allocation-recommendations
- feat/hospital-resource-management

### 3.3 Make and Review Changes

Before committing:

    git status
    git diff

Check that:
- Only intended files have changed.
- No secrets or credentials are included.
- Existing functionality has not been unintentionally affected.
- Relevant tests have been run.

### 3.4 Stage and Commit Changes

Stage only the files relevant to the task.

    git add <specific-file-paths>
    git commit -m "feat: describe the implemented change"

Use clear commit messages such as:
- feat: add ambulance recommendation endpoint
- fix: validate assignment status transition
- docs: update emergency lifecycle workflow

Avoid blindly staging all files with git add .

### 3.5 Push and Create a Pull Request

    git push -u origin <branch-name>

Create a pull request targeting main.

The pull request should include:
- Summary of the change.
- Reason for the change.
- Files or modules affected.
- Tests performed.
- Known limitations or pending work.

Do not merge until review and required checks are complete.

## 4. Coding and Integration Practices

### 4.1 Backend Changes

- Keep business logic in the appropriate service layer.
- Validate incoming request data using DTOs.
- Apply backend validation to important state transitions.
- Handle invalid and conflicting operations safely.
- Keep database changes consistent with existing models.
- Avoid duplicating business rules across portals.

### 4.2 Frontend and Portal Changes

- Follow the requirements for the relevant portal.
- Use shared backend APIs rather than separate sources of truth.
- Handle loading, success, empty and error states.
- Respect role-based access restrictions.
- Keep API request and response handling consistent with documentation.

### 4.3 Shared Changes

Before modifying shared models, API contracts or status definitions:

1. Identify affected modules and portals.
2. Communicate the proposed change.
3. Update dependent code.
4. Update documentation.
5. Test affected workflows.

## 5. Testing Expectations

Run relevant tests before submitting a pull request.

Testing should include:
- Valid requests.
- Invalid input.
- Missing or unavailable records.
- Permission failures.
- Conflicting operations.
- Invalid status transitions.
- Error handling.
- Integration with dependencies.

Do not describe a feature as tested or completed unless it has been verified.

## 6. Documentation Expectations

Update documentation when a change affects:
- API contracts.
- Database models.
- Status definitions.
- Portal functionality.
- Workflows.
- Architecture or project decisions.
- Setup or contribution procedures.

## 7. Security and Sensitive Information

Never commit:
- Passwords.
- API keys.
- Access tokens.
- Private credentials.
- Production database connection strings.
- Sensitive patient information.
- Unprotected environment files.

Use environment variables and follow the project's access-control requirements.

## 8. Pull Request Completion Criteria

A pull request is ready for integration when:

1. Implementation matches requirements.
2. Relevant tests have been run.
3. No known unintended changes remain.
4. Related documentation is updated.
5. The pull request has been reviewed.
6. Required checks have passed.
7. The change is approved for integration.

## 9. Related Documents

- TASK_TRACKER.md
- MILESTONES.md
- TEAM_ASSIGNMENTS.md
- DECISIONS.md
- CHANGELOG.md
