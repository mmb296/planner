# Scheduling Agent — Project Context

## Vault Context Files

`/Users/madalynbaehre/Notes/projects/scheduling-agent/`

## Session Start

Before doing anything else, read these files in order:

1. `context.md` — current focus and where we left off
2. `decisions.md` — architectural decisions and reasoning (skim for relevant context)
3. If on the `personal` branch (`git branch --show-current`), also read `context-personal.md`

## Session End

Before ending the session, ask:

> "What should I update in the vault before we wrap up?"

Wait for an answer before writing anything to the vault.

## What This Project Is

Event-driven agentic scheduling assistant. Gmail Pub/Sub push notifications trigger a Gemini function-calling pipeline with human-in-the-loop confirmation in a React UI. Real-time Google Calendar sync via push notifications and SSE. OAuth 2.0 authentication.
