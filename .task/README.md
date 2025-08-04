# Task Management System

## Overview
This directory contains all development tasks for the housnkuh project. Each task represents a focused unit of work.

## Directory Structure
```
.task/
├── current/      # Active tasks
├── completed/    # Finished tasks (archived)
└── templates/    # Task templates
```

## Task Naming Convention
`TASK-XXX-description.md` where:
- XXX = 3-digit number (001, 002, etc.)
- description = kebab-case summary

## Task Lifecycle
1. **Create**: New task in `current/`
2. **Work**: Update status as you progress
3. **Complete**: Move to `completed/` with completion date

## Task Statuses
- `PLANNING` - Task definition phase
- `IN_PROGRESS` - Active development
- `REVIEW` - Code review/testing
- `COMPLETED` - Done and archived
- `BLOCKED` - Waiting for dependencies

## Quick Commands
```bash
# List current tasks
ls .task/current/

# Create new task
cp .task/templates/task-template.md .task/current/TASK-XXX-description.md

# Complete a task
mv .task/current/TASK-XXX-*.md .task/completed/
```

## Integration with Claude
When working with Claude, reference the task:
"I'm working on TASK-001"
"Please update TASK-002 status"