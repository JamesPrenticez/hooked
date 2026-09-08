@.claude/docs/ANIMO.md

# CLAUDE.md

<!-- Project-specific architecture, commands, and conventions go below. -->

## Finishing a build step

When a `docs/BUILD_PLAN.md` step — or any self-contained, verified chunk of
work — is done, end the reply with a suggested commit message in a copyable
block. Propose it only; don't run `git commit` unless asked.

- Follow the `animo-git-conventions` format: `<type>: <subject>`, imperative,
  lowercase start, no trailing period, subject under ~72 chars.
- Prefix build-plan work with its number, matching existing history —
  e.g. `feat: 3.3 payout resolution`.
- One subject line is usually enough; add a short body only when the what/why
  isn't obvious from the subject.
