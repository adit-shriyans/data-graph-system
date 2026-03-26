# AI coding session logs

This folder contains **Cursor** agent transcripts for this project (JSONL format, one JSON object per line).

| File | Description |
|------|-------------|
| `cursor-transcript-main.jsonl` | Primary Composer / agent conversation for the DodgeAI SAP O2C assignment |
| `*.jsonl` (other files) | Sub-agent runs spawned during the same session |

## Updating these logs

1. In **Cursor**: open the chat you want to export and use **Export Transcript** (or copy from the transcript panel).
2. Or copy fresh files from your machine’s Cursor project folder, e.g.  
   `%USERPROFILE%\.cursor\projects\<project-id>\agent-transcripts\`

The JSONL format is Cursor’s native export; it preserves roles, timestamps, and message structure for reviewers.
