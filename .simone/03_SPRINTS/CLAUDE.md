# Sprint Planning Structure Guide

## Overview
This directory contains sprint documentation for the housnkuh project. Sprints are time-boxed iterations focused on delivering specific milestone requirements or critical fixes.

## Sprint Naming Convention
**CRITICAL**: Sprint folders MUST follow this exact pattern:
```
S##_M##_Short_Sprint_Name/
```

- `S##` - Two-digit sprint number (S01, S02, etc.)
- `M##` - Associated milestone number (M00 for infrastructure, M01, M02, etc.)
- `Short_Sprint_Name` - Descriptive name using underscores for spaces

### Examples:
-  `S01_M00_Infrastructure_Fix/`
-  `S02_M01_Vendor_Registration/`
-  `S03_M01_Trial_Period_Logic/`

## Sprint Structure
Each sprint folder MUST contain:

### 1. Sprint Meta File (REQUIRED)
- **Name**: `S##_sprint_meta.md`
- **Purpose**: Contains sprint metadata and tracking
- **Template**: Use `99_TEMPLATES/sprint_meta_template.md`

### 2. Sprint Planning (OPTIONAL)
- **Name**: `PLANNING.md`
- **Purpose**: Detailed planning, task breakdown, estimates

### 3. Sprint Retrospective (OPTIONAL)
- **Name**: `RETROSPECTIVE.md`
- **Purpose**: What went well, what didn't, lessons learned

## Sprint Lifecycle

### 1. Planning Phase
- Create sprint folder using naming convention
- Fill out sprint meta file from template
- Define clear sprint goal and deliverables
- Break down tasks if needed

### 2. Active Phase
- Update sprint status to "active"
- Track progress in sprint meta file
- Update `last_updated` field regularly

### 3. Completion Phase
- Update status to "completed" or "aborted"
- Document outcomes and lessons learned
- Create retrospective if needed

## Current Sprint Structure
```
03_SPRINTS/
   CLAUDE.md (this file)
   S01_M00_Infrastructure_Fix/
      S01_sprint_meta.md
      RETROSPECTIVE.md
   S02_M01_Core_Trial_System/
       S02_sprint_meta.md
       PLANNING.md
```

## Sprint Duration Guidelines
- **Infrastructure/Critical Fixes**: 1-3 days
- **Feature Development**: 3-5 days
- **Major Milestones**: May span multiple sprints

## Integration with Milestones
- Each sprint should primarily focus on one milestone
- M00 (Infrastructure) sprints take priority over feature work
- Sprint goals should align with milestone requirements

## Success Metrics
- Clear deliverables achieved
- All blocking issues resolved
- Code quality maintained (tests pass, no regressions)
- Documentation updated to reflect changes