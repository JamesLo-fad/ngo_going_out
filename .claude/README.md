# Claude Documentation Folder

## Purpose

This folder contains comprehensive documentation generated and maintained by Claude Code to help with:

1. **Session Continuity** - Enable Claude to quickly understand project context in new sessions
2. **Decision Tracking** - Record why certain technical decisions were made
3. **Problem Resolution** - Document issues encountered and their solutions
4. **Knowledge Preservation** - Maintain institutional memory of the project

## Folder Structure

```
.claude/
├── README.md                    # This file - explains the folder structure
├── sessions/                    # Session summaries and reports
│   ├── 2026-01-05-recovery.md
│   └── 2026-01-05-data-cleansing.md
├── decisions/                   # Technical decision records
│   └── data-cleansing-approach.md
├── issues/                      # Problems and solutions
│   ├── conditional-rendering-failures.md
│   └── schema-mismatch.md
└── technical-notes/             # Technical documentation
    ├── database-schema.md
    ├── api-endpoints.md
    ├── deployment-process.md
    └── data-import-workflow.md
```

## How to Use This Documentation

### For Claude (New Sessions)

When starting a new session:

1. **Read `sessions/` folder** - Get up-to-date project status
2. **Check `issues/` folder** - Understand known problems and solutions
3. **Review `decisions/` folder** - Understand why things are done certain ways
4. **Consult `technical-notes/` folder** - Get detailed technical information

### For Developers

This documentation provides:
- **Context** for understanding past decisions
- **Solutions** to common problems
- **Technical details** about the system architecture
- **Best practices** learned from experience

### For Project Maintainers

Use this folder to:
- Track project evolution over time
- Understand the reasoning behind technical choices
- Find solutions to recurring problems
- Onboard new team members or AI assistants

## Documentation Standards

### Session Reports (`sessions/`)

Each session report should include:
- **Date and context** - When and why the work was done
- **Problem description** - What needed to be solved
- **Solution approach** - How it was solved
- **Results** - What was accomplished
- **Lessons learned** - What to remember for next time

### Decision Records (`decisions/`)

Each decision record should explain:
- **Context** - What situation required a decision
- **Options considered** - What alternatives were evaluated
- **Decision made** - What was chosen
- **Rationale** - Why this option was selected
- **Consequences** - What are the implications

### Issue Documentation (`issues/`)

Each issue document should contain:
- **Problem description** - What went wrong
- **Root cause** - Why it happened
- **Solution** - How it was fixed
- **Prevention** - How to avoid it in the future

### Technical Notes (`technical-notes/`)

Technical documentation should include:
- **Overview** - High-level explanation
- **Details** - Specific technical information
- **Examples** - Code samples or usage examples
- **References** - Links to related documentation

## Maintenance

### Adding New Documentation

When adding new documents:
1. Use clear, descriptive filenames with dates (YYYY-MM-DD format)
2. Follow the documentation standards above
3. Update this README if adding new categories
4. Cross-reference related documents

### Updating Existing Documentation

When updating documents:
1. Add a "Last Updated" timestamp at the top
2. Explain what changed and why
3. Keep historical context - don't delete important information
4. Consider creating a new document if changes are substantial

## Key Principles

### 1. Comprehensive but Concise

Documentation should be:
- **Complete** - Include all necessary information
- **Clear** - Easy to understand
- **Concise** - No unnecessary verbosity
- **Structured** - Well-organized with clear sections

### 2. Context-Rich

Always provide:
- **Why** decisions were made, not just what
- **Background** information for understanding
- **Consequences** of choices
- **Alternatives** that were considered

### 3. Actionable

Documentation should enable:
- **Quick understanding** of project status
- **Problem resolution** using documented solutions
- **Informed decisions** based on past experience
- **Efficient onboarding** of new contributors

### 4. Living Documentation

This is not static documentation:
- **Update** when things change
- **Add** new learnings as they occur
- **Refine** based on what proves useful
- **Archive** outdated information (don't delete)

## Important Notes

### For Claude Code

- **Always check this folder** at the start of new sessions
- **Update documentation** after significant work
- **Create new documents** for important decisions or issues
- **Maintain consistency** with existing documentation style

### For Human Developers

- **Don't delete** Claude-generated documentation without review
- **Add your own notes** when you make changes
- **Keep it updated** - outdated docs are worse than no docs
- **Use it actively** - documentation is only valuable if used

## Version History

- **2026-01-05** - Initial creation of .claude/ folder structure
  - Moved existing reports to sessions/
  - Created comprehensive README
  - Established documentation standards

## Related Documentation

- **README.md** (root) - External-facing project documentation
- **README-DEV.md** (root) - Internal developer documentation
- **tools/README.md** - Data import tools documentation

---

**Last Updated**: 2026-01-05
**Maintained By**: Claude Code + Development Team
