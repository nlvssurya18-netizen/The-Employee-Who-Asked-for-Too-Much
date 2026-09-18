# The Employee Who Asked for Too Much

A secure enterprise research agent that answers employee questions over internal company documents **without ever exposing information the employee isn't authorized to access** — even when that information is the most relevant match to their question.

## Problem Statement

Companies have thousands of internal documents used to answer employee questions (e.g. *"What was the revenue forecast for Q4?"*). An AI assistant needs to search, understand, and answer — but every document carries a classification level:

- **Public**  
- **Internal**  
- **Confidential**  
- **Restricted**

Different employees have different roles, departments, and clearance levels. The assistant must answer questions **without exposing information the employee is not authorized to access.**

Documents may also:

- Contradict each other  
- Be outdated  
- Exist in multiple versions  
- Contain incomplete information

### Critical Requirement

> An unauthorized document must **never be provided to the LLM** simply because it is relevant to the question.

This is the core constraint the whole system is built around — authorization must be enforced *before* retrieval reaches generation, not filtered out afterward.

## The Challenge

Build a secure enterprise research agent that:

- Answers employee questions over internal documents  
- Enforces authorization based on document classification and access rules  
- Never lets unauthorized-but-relevant content reach the LLM or the final answer

## Core Requirements

- [ ] Accept a natural-language employee question and user context  
- [ ] Ingest documents with classification, department, owner, and access-control metadata  
- [ ] Search for relevant candidates, but enforce authorization **before** document content reaches the LLM  
- [ ] Handle outdated and conflicting authorized documents (resolve by version/effective date)  
- [ ] Return an answer with citations to the evidence the user is allowed to access  
- [ ] Record an audit trail of the request, authorization decisions, and evidence used  
- [ ] Safely respond when the answer exists only in documents the user cannot access

## Architecture

User Question \+ User Context (role, department, clearance)

        │

        ▼

\[1\] Candidate Retrieval    → search ALL docs (keyword / embedding) for relevant candidates

        │

        ▼

\[2\] Authorization Filter   → drop any doc the user's role/department/clearance

        │                     does not satisfy — runs BEFORE any LLM call

        ▼

\[3\] Conflict Resolution    → among surviving authorized docs, resolve duplicates/conflicts

        │                     by effective\_date / version

        ▼

\[4\] LLM Answer Generation  → only authorized, resolved content enters the prompt;

        │                     LLM must cite document\_id/title

        ▼

\[5\] Audit Log Write        → log user, question, candidates, authorization verdicts,

        │                     evidence used, final answer

        ▼

\[6\] Response \+ Citations   → return answer, or a safe refusal if nothing authorized applies

**Design principle:** `is_authorized(user, doc) -> bool` is a deterministic, testable function, fully separate from the LLM. The LLM never sees a document's raw content unless that function has already returned `True`.

## Data Model

**User context**

{

  "user\_id": "U102",

  "role": "Finance",

  "department": "Finance",

  "clearance": "Internal"

}

**Document**

{

  "document\_id": "DOC-101",

  "title": "Q4 Revenue Forecast",

  "classification": "Internal",

  "allowed\_departments": \["Finance"\],

  "allowed\_roles": \["Finance"\],

  "version": "2.0",

  "effective\_date": "2026-09-01",

  "content": "Q4 projected revenue is 120 crore."

}

## Authorization Logic

1. `user.clearance` must meet or exceed `document.classification` on the ordering: `Public < Internal < Confidential < Restricted`  
2. `user.department` must be in `document.allowed_departments`, **or** `user.role` must be in `document.allowed_roles` (define AND/OR explicitly and document the choice)  
3. If a document fails either check, it is discarded before retrieval results are passed anywhere near the LLM.

## Conflict & Recency Handling

When multiple authorized documents address the same question:

- Group by topic/title  
- Prefer the document with the most recent `effective_date` (or highest `version`)  
- Optionally surface the conflict in the answer (e.g. "The September figure supersedes the earlier June estimate")

## Test Cases

### Test A — Authorized answer

User: Finance / Finance / Internal clearance. Only an Internal, Finance-restricted doc exists. **Expected:** Answers with the authorized figure (120 crore), citing DOC-101.

### Test B — Relevant but unauthorized

User: Marketing / Marketing / Internal clearance. The only matching doc is Restricted, Executive-only. **Expected:** Safe refusal. No figure, no confirmation of the restricted doc's contents.

### Test C — Authorized conflict

User: Finance / Finance / Internal clearance. Two authorized docs on the same topic with different dates/versions. **Expected:** Answers with the most recent figure (125 crore, v2.0, Sept 2026), citing DOC-302, and may note it supersedes DOC-301.

## Tech Stack (suggested, free-tier friendly)

- **Retrieval:** `sentence-transformers` (local embeddings) or TF-IDF via scikit-learn; FAISS or ChromaDB for vector storage  
- **LLM:** Groq (free, fast open-model inference), Google AI Studio (Gemini free tier), OpenRouter free models, or local via Ollama  
- **UI:** Streamlit or Gradio for a quick demo interface  
- **Audit log:** Append-only JSONL file or SQLite table  
- **Dev tools:** Claude Code / GitHub Copilot Free / Cursor / Windsurf for scaffolding

## Project Structure

.

├── data/

│   ├── users.json

│   └── documents.json

├── src/

│   ├── ingest.py           \# load & index documents

│   ├── retrieve.py         \# candidate retrieval

│   ├── authorize.py        \# is\_authorized(user, doc)

│   ├── resolve.py          \# conflict/version resolution

│   ├── generate.py         \# LLM prompt \+ answer generation

│   ├── audit.py            \# audit trail logging

│   └── app.py              \# Streamlit/Gradio entrypoint

├── tests/

│   └── test\_cases.py       \# Test A / B / C from the spec

├── audit\_log.jsonl

└── README.md

## Running Locally

pip install \-r requirements.txt

python src/app.py

## Roadmap / Stretch Goals

- Role hierarchy support (e.g. manager inherits report access)  
- Per-field redaction instead of all-or-nothing document access  
- Explainable refusals with generic reasoning (no metadata leakage)  
- Multi-turn conversation context with consistent authorization enforcement per turn

