
## Workflow for Handling Active Tasks

When you start working:

1. **Check for active tasks**:
   ```bash
   # List all active (not started or in progress) tasks
   grep -A 2 "^### Task" specs/SPECS.md | grep -E "(Task|Status:)" | grep -B 1 "🔴 Not Started\|🟡 In Progress"
   ```

2. **Select a task**:
   - Choose the highest priority task (HIGH > MEDIUM > LOW)
   - Prefer 🔴 Not Started over 🟡 In Progress unless continuing your own work
   - Review the acceptance criteria carefully

3. **Before starting**:
   - Update the task status in SPECS.md to 🟡 In Progress
   - Read any "Bad Code" examples provided
   - Identify files that need modification

4. **Implementation**:
   - Follow the acceptance criteria exactly
   - Write tests as you go (TDD preferred)
   - Run `npm run lint` frequently
   - Run tests with `npx vitest run` after changes

5. **Completion**:
   - All tests must pass
   - Update SPECS.md - change status to ✅ Completed
   - Move task details to PROGRESS.md (remove from SPECS.md)
   - Verify the feature works end-to-end

## Example Task Completion Workflow

```bash
# 1. Check for active tasks
grep -A 2 "^### Task" specs/SPECS.md | grep -E "(Task|Status:)" | grep -B 1 "🔴 Not Started"

# 2. Pick Task 1 (Vitest setup)
# Update SPECS.md - mark as In Progress

# 3. Implement the task
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
# ... edit vitest.config.ts ...
# ... create test files ...

# 4. Verify tests pass
npx vitest run

# 5. Run linting
npm run lint

# 6. Mark as complete in SPECS.md
# Move to PROGRESS.md
```

## Task Commands Reference

```bash
# Find all tasks not yet completed
grep -B 1 -A 1 "Status: 🔴 Not Started" specs/SPECS.md

# Find all high priority tasks
grep -B 3 "Priority: HIGH" specs/SPECS.md | grep -E "^###|Priority:"

# Count remaining tasks
grep -c "Status: 🔴 Not Started" specs/SPECS.md

# View specific task details (e.g., Task 1)
grep -A 20 "^### Task 1:" specs/SPECS.md
```

## Task Completion & Commit Workflow

When you finish a task:

1. **Mark task complete in SPECS.md** - Change status to ✅ Completed
2. **Run all checks**:
   ```bash
   npx vitest run
   npm run lint
   npm run build
   ```
3. **Stage changes**: `git add .`
4. **Create commit with descriptive message** following format:
   ```
   <type>: <task name> - <brief description>
   
   - Implemented: <what was done>
   - Tests: <test coverage>
   - Closes Task #<number>
   ```
5. **Show commit to user for approval** - Do NOT push without user confirmation
6. **After approval**: Push branch and create PR (if applicable)