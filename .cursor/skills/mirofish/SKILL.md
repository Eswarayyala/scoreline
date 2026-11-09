---
name: mirofish
description: >-
  Run MiroFish multi-agent scenario simulations against a local deployment.
  Use when the user asks for MiroFish prediction, scenario rehearsal, policy
  impact analysis, PR crisis simulation, market reaction modeling, or wants to
  trigger the full graph-build → simulation → report pipeline via API.
  Framework-agnostic: works with Cursor, Claude Code, Windsurf, OpenCode, or
  any agent that can call HTTP APIs and follow structured instructions.
---

# MiroFish — Local AI Simulation Engine

MiroFish is a multi-agent simulation engine: upload seed documents, build a knowledge graph, spawn personas with distinct incentives, run social-surface interactions over multiple rounds, and produce structured prediction reports.

This skill is **framework-agnostic**. Execute the pipeline via HTTP against the local backend API. Use any available HTTP client (shell, Python, Node, etc.); PowerShell examples below are illustrative, not required.

## Local Instance (pre-configured)

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:3001/ |
| Backend API | http://127.0.0.1:5001 |
| Health check | http://127.0.0.1:5001/health |

All API routes are prefixed with `/api/`. Responses use `{ "success": true/false, "data": ... }`.

**Before any run**, verify the backend is alive:

```powershell
Invoke-RestMethod http://127.0.0.1:5001/health
```

If unreachable, start from the repo root:

```powershell
npm run dev
```

## When to Use

- Campaign / policy / market pressure testing with multi-stakeholder dynamics
- PR crisis rehearsal — identify which persona triggers the first cascade
- Product launch scenarios with conflicting buyer personas
- Counterfactual exploration — change one variable and re-run
- Deep-dive Q&A with simulated agents or the Report Agent after a run

## When NOT to Use

- Simple factual Q&A (no interaction dynamics needed)
- Real-time data feeds or live API monitoring

---

## Agent Operating Instructions

When the user requests a MiroFish simulation, follow this pipeline **via the Backend API** (preferred). Use the browser UI only for visual monitoring or when the user explicitly asks to operate the UI.

Adapt paths, shell, and HTTP tooling to the host environment. Replace example file paths with the user's actual seed documents and output locations.

### Pipeline Overview

```
Step 1  Upload docs + generate ontology   → project_id
Step 2  Build knowledge graph             → graph_id  (async, poll task)
Step 3  Create simulation                 → simulation_id
Step 4  Prepare simulation environment    → ready     (async, poll task)
Step 5  Start simulation run               → running   (async, poll status)
Step 6  Generate report                   → report_id (async, poll task)
Step 7  Fetch report / chat / interview   → deliver results to user
```

Track IDs at each step. Long-running steps require polling every **15–30 s** (graph build / prepare / simulation / report can each take several minutes).

### Recommended defaults

| Parameter | Recommended | Notes |
|-----------|-------------|-------|
| `max_rounds` | **20–40** for first run | LLM cost is high; README suggests ≤40 for trials |
| `platform` | `parallel` | Runs Twitter + Reddit simultaneously |
| `enable_twitter` / `enable_reddit` | `true` | Both enabled by default |
| `chunk_size` / `chunk_overlap` | 500 / 50 | Graph build defaults |
| Supported file types | `.pdf`, `.md`, `.txt`, `.markdown` | Max 50 MB per upload |

Set request header `Accept-Language: zh-CN` (or `en-US`) to control API message locale.

---

## Step-by-Step API Reference

Base URL: `http://127.0.0.1:5001`

### Step 1 — Upload documents & generate ontology

`POST /api/graph/ontology/generate` (multipart/form-data)

| Field | Required | Description |
|-------|----------|-------------|
| `files` | Yes | One or more seed documents |
| `simulation_requirement` | Yes | Plain-language prediction goal |
| `project_name` | No | Display name |
| `additional_context` | No | Extra grounding notes |

```powershell
$uri = "http://127.0.0.1:5001/api/graph/ontology/generate"
$form = @{
    files                  = Get-Item "Z:\path\to\seed-document.md"
    simulation_requirement = "Analyze whether Europe will introduce protectionist policies for local appliance makers"
    project_name           = "EU AC Policy Simulation"
}
$r = Invoke-RestMethod -Uri $uri -Method Post -Form $form -Headers @{ "Accept-Language" = "zh-CN" }
$projectId = $r.data.project_id
```

Save: `project_id`, `ontology`, `analysis_summary`.

### Step 2 — Build knowledge graph (async)

`POST /api/graph/build`

```powershell
$body = @{ project_id = $projectId; chunk_size = 500; chunk_overlap = 50 } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/graph/build" -Method Post -Body $body -ContentType "application/json"
$taskId = $r.data.task_id
```

Poll until `status == "completed"`:

```powershell
do {
    Start-Sleep -Seconds 20
    $t = Invoke-RestMethod "http://127.0.0.1:5001/api/graph/task/$taskId"
    Write-Host "$($t.data.status) $($t.data.progress)% $($t.data.message)"
} while ($t.data.status -notin @("completed","failed"))
$graphId = $t.data.result.graph_id   # also available via GET /api/graph/project/{project_id}
```

On failure, inspect `$t.data.error` and backend logs at `backend/logs/`.

### Step 3 — Create simulation

`POST /api/simulation/create`

```powershell
$body = @{ project_id = $projectId; graph_id = $graphId } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/simulation/create" -Method Post -Body $body -ContentType "application/json"
$simId = $r.data.simulation_id
```

### Step 4 — Prepare simulation environment (async)

`POST /api/simulation/prepare`

Generates agent profiles and simulation config via LLM.

```powershell
$body = @{ simulation_id = $simId; use_llm_for_profiles = $true; parallel_profile_count = 5 } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/simulation/prepare" -Method Post -Body $body -ContentType "application/json"
$prepareTaskId = $r.data.task_id
```

Poll:

```powershell
do {
    Start-Sleep -Seconds 20
    $body = @{ task_id = $prepareTaskId; simulation_id = $simId } | ConvertTo-Json
    $t = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/simulation/prepare/status" -Method Post -Body $body -ContentType "application/json"
    Write-Host "$($t.data.status) $($t.data.progress)% $($t.data.message)"
} while ($t.data.status -notin @("ready","completed","failed") -and -not $t.data.already_prepared)
```

### Step 5 — Start simulation run (async)

`POST /api/simulation/start`

```powershell
$body = @{
    simulation_id = $simId
    platform      = "parallel"
    max_rounds    = 30
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/simulation/start" -Method Post -Body $body -ContentType "application/json"
```

Poll run status:

```powershell
do {
    Start-Sleep -Seconds 30
    $s = Invoke-RestMethod "http://127.0.0.1:5001/api/simulation/$simId/run-status"
    Write-Host "round=$($s.data.current_round) status=$($s.data.runner_status)"
} while ($s.data.runner_status -eq "running")
```

Optional mid-run inspection:
- Timeline: `GET /api/simulation/{simulation_id}/timeline`
- Posts: `GET /api/simulation/{simulation_id}/posts?platform=reddit&limit=50`
- Agent stats: `GET /api/simulation/{simulation_id}/agent-stats`

Stop early: `POST /api/simulation/stop` with `{ "simulation_id": "..." }`.

### Step 6 — Generate report (async)

`POST /api/report/generate`

```powershell
$body = @{ simulation_id = $simId } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/report/generate" -Method Post -Body $body -ContentType "application/json"
$reportTaskId = $r.data.task_id
$reportId     = $r.data.report_id   # present if already generated
```

Poll:

```powershell
do {
    Start-Sleep -Seconds 20
    $body = @{ task_id = $reportTaskId; simulation_id = $simId } | ConvertTo-Json
    $t = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/report/generate/status" -Method Post -Body $body -ContentType "application/json"
    Write-Host "$($t.data.status) $($t.data.progress)%"
    if ($t.data.report_id) { $reportId = $t.data.report_id }
} while ($t.data.status -notin @("completed","failed") -and -not $t.data.already_completed)
```

### Step 7 — Retrieve & deliver results

**Full report:**

```powershell
$report = Invoke-RestMethod "http://127.0.0.1:5001/api/report/$reportId"
# Key fields: $report.data.markdown_content, $report.data.outline
```

Present `markdown_content` to the user. Save a copy to a user-specified path (or the project's docs/output folder) if they want a persistent artifact.

**Follow-up with Report Agent:**

```powershell
$body = @{
    simulation_id = $simId
    message       = "What is the most likely policy outcome in the next 6 months?"
    chat_history  = @()
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/report/chat" -Method Post -Body $body -ContentType "application/json"
```

**Interview simulated agents:**

```powershell
$body = @{
    simulation_id = $simId
    interviews    = @(@{ agent_id = "agent_0"; prompt = "Why did you oppose the import ban?" })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/simulation/interview/batch" -Method Post -Body $body -ContentType "application/json"
```

---

## Resume Existing Projects

Skip Steps 1–2 if a project already exists:

```powershell
# List recent projects
Invoke-RestMethod "http://127.0.0.1:5001/api/graph/project/list?limit=10"

# Get project detail (includes graph_id, ontology, status)
Invoke-RestMethod "http://127.0.0.1:5001/api/graph/project/{project_id}"

# List simulations for a project
Invoke-RestMethod "http://127.0.0.1:5001/api/simulation/list?project_id={project_id}"

# Simulation history with project info
Invoke-RestMethod "http://127.0.0.1:5001/api/simulation/history?limit=10"

# Report by simulation
Invoke-RestMethod "http://127.0.0.1:5001/api/report/by-simulation/{simulation_id}"
```

Project data is also stored locally at `backend/uploads/projects/{project_id}/project.json`.

---

## Browser UI (monitoring only)

Open http://localhost:3001/ to watch the 5-step wizard:

1. **Graph Build** — upload + ontology + graph visualization
2. **Env Setup** — agent profile generation
3. **Simulation** — live timeline and posts
4. **Report** — generated analysis
5. **Interaction** — chat with agents or Report Agent

Prefer API automation for agent-driven runs; use the UI when the user wants visual confirmation.

---

## Validation Checklist

After a run, confirm:

- [ ] Ontology has 3+ entity types with conflicting interests
- [ ] Graph build task completed (`graph_id` present)
- [ ] Simulation produced multi-round agent actions (timeline non-empty)
- [ ] Report `markdown_content` includes trajectory, risks, and stakeholder narratives
- [ ] Follow-up chat / interview returns context-aware answers

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Backend timeout | API timeout is 5 min per request; use polling, not a single long wait |
| High LLM cost | Start with `max_rounds` ≤ 30; single platform (`reddit` only) if needed |
| Vague scenario | Include timeline, stakeholders, and constraints in `simulation_requirement` |
| Graph build fails | Check `ZEP_API_KEY` in repo-root `.env` |
| Ontology fails | Check `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_NAME` in `.env` |
| Re-run same simulation | Pass `"force": true` to `/api/simulation/start` |
| Regenerate report | Pass `"force_regenerate": true` to `/api/report/generate` |

## Environment Requirements

Configured in repo-root `.env` (do not commit secrets):

```env
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL_NAME=...
ZEP_API_KEY=...
```

## References

- Frontend: http://localhost:3001/
- Backend health: http://127.0.0.1:5001/health
- Source: https://github.com/666ghj/MiroFish
- Online demo: https://666ghj.github.io/mirofish-demo/
