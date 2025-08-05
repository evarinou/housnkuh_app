# Task: TASK-XXX-analyze|refactor|search-description
Priority: high|medium|low  
Status: pending
Created: YYYY-MM-DD
Type: serena-analysis

## 🔍 Analysis/Refactoring Objective
**What needs to be analyzed/refactored/found**:
[Specific code analysis or refactoring goal]

## 🛠️ Required Serena Tools

### Discovery Phase
- [ ] `mcp__serena__list_dir` - Map project structure
- [ ] `mcp__serena__find_file` - Locate relevant files
- [ ] `mcp__serena__get_symbols_overview` - Understand file architecture

### Analysis Phase  
- [ ] `mcp__serena__find_symbol` - Locate specific classes/functions
- [ ] `mcp__serena__search_for_pattern` - Find usage patterns
- [ ] `mcp__serena__find_referencing_symbols` - Track dependencies

### Modification Phase (if applicable)
- [ ] `mcp__serena__replace_regex` - Pattern-based edits
- [ ] `mcp__serena__replace_symbol_body` - AST-aware replacements
- [ ] `mcp__serena__insert_after_symbol` - Add new code

## Search Patterns
```yaml
Target symbols: [ClassNames, functionNames to analyze]
File patterns: ["*.tsx", "*.ts", specific paths]
Search scope: [relative/path to narrow search]
Pattern regex: [specific patterns to find]
```

## User Acceptance Criteria
- [ ] All target code identified and analyzed
- [ ] Dependencies mapped and documented
- [ ] Refactoring plan created (if applicable)
- [ ] No use of grep/find/sed (Serena only)

## Analysis Workflow
1. **Structure Discovery**
   ```bash
   mcp__serena__list_dir(relative_path: "src/")
   ```

2. **Symbol Mapping**
   ```bash
   mcp__serena__get_symbols_overview(relative_path: "target/file.ts")
   ```

3. **Deep Analysis**
   ```bash
   mcp__serena__find_symbol(name_path: "ClassName", depth: 2, include_body: true)
   ```

4. **Pattern Search**
   ```bash
   mcp__serena__search_for_pattern(pattern: "methodName\\(", context_lines: 3)
   ```

## Expected Outputs
- [ ] Symbol hierarchy documented
- [ ] Usage patterns identified
- [ ] Refactoring targets listed
- [ ] Dependencies mapped

## Definition of Done
- [ ] Analysis completed using Serena tools only
- [ ] All symbols and patterns documented
- [ ] Refactoring plan ready (if applicable)
- [ ] No native grep/find/sed used
- [ ] Results cached for session reuse

## Notes
**Why Serena**: AST-aware analysis, respects .gitignore, efficient symbol lookups

**Performance tips**: 
- Use `relative_path` to narrow searches
- Cache symbol locations for reuse
- Batch similar lookups

---
**REMEMBER**: Use Serena MCP exclusively for all code analysis tasks!