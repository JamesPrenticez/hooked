@.claude/docs/ANIMO.md

# CLAUDE.md

<!-- Project-specific architecture, commands, and conventions go below. -->

## Finishing a build step

When a `docs/BUILD_PLAN.md` step — or any self-contained, verified chunk of
work — is done, end the reply with a one-line commit message. Subject only,
no body. Propose it only; don't run `git commit` unless asked.

- Format: `<type>: <subject>` — imperative, lowercase, no trailing period,
  under 90 chars (`animo-git-conventions`).
- Prefix build-plan work with its number: `feat: 3.3 payout resolution`.
