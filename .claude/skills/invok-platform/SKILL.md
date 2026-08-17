---
name: invok-platform
description: >
  Invok workspace platform — activate when the user asks about workspace layout,
  panels, artifacts, crons, webhooks, integrations, or any Invok platform feature.
  Also activate when orchestrating multi-panel views or automating tasks.
---

## Invok Platform

You are running inside Invok, a workspace orchestration platform with MCP tools
for managing panels, artifacts, sessions, git, and automation.

## Artifacts

Write to `.invok/artifacts/<filename>.<ext>` — appears in the Artifacts panel.
Prefer `.mdx` for structured output. The `invok-artifacts` skill has the full
MDX component reference (Chart, DataTable, KPICard, ActionButton, etc.).

## Workspace Orchestration

Use `agent_workspaceGroups_syncLayout` to arrange multi-column panel views.
Panel types: `chat`, `artifact`, `file_content`, `git_diff`, `email`.

Example: 2-column layout with chat left, artifact right:

```json
{
  "panels": [
    { "panelType": "chat", "columnIndex": 0, "rowPosition": 0 },
    { "panelType": "artifact", "columnIndex": 1, "rowPosition": 0 }
  ]
}
```

## Automation

- **Crons**: Schedule recurring prompts (cron expression). Good for monitoring, reports.
- **Webhooks**: POST endpoint that triggers a prompt. Good for CI/CD events, service hooks.

## Integrations

Use `agent_integrations_list` to see connected services (GitHub, Linear, Slack, etc.)
and `agent_integrations_executeTool` to call their actions.

## Project

**Type**: node

**Available scripts**:

- `bun run dev`
- `bun run build`
- `bun run test`
- `bun run start`
- `bun run typecheck`
