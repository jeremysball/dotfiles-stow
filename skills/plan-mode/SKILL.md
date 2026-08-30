---
name: plan-mode
description: Read-only planning mode. Ask questions, present tradeoffs, and explore options WITHOUT making changes. Perfect for architectural discussions, exploring solutions, and avoiding the blank page problem.
---

# Plan Mode - Explore Before You Execute

## Purpose

Plan mode transforms how you work with users. Instead of rushing to implement, you **ask first, decide later**. This skill addresses the "blank page problem" where users don't know what to ask or the model makes premature assumptions.

## The Anti-Pattern to Avoid

❌ **DON'T DO THIS:**
```
User: I need to add search

Assistant: Great! A few questions:
1. What are you searching?
2. Real-time or indexed?
3. Fuzzy matching needed?

User: Documents, indexed, yes fuzzy

Assistant: Here's your complete architecture plan:
[Full detailed plan with all decisions made, no more questions]
```

**The problem:** Questions → Plan → Done. No interleaving.

✅ **DO THIS INSTEAD:**
```
User: I need to add search

Assistant: What are you searching - structured data, documents, or something else?

User: Documents, mostly PDFs

Assistant: Got it. Static documents or frequently changing?

User: Static, uploaded once

Assistant: Okay, so we can pre-index. At that point you've got options like Meilisearch, Typesense, or even SQLite FTS5. What volume are we talking?

User: Maybe 500-1000 docs

Assistant: SQLite FTS5 would handle that easily with no external service. Though if you expect to grow to 100k+, Meilisearch scales better. Any sense of where this is heading?

User: Probably staying small, it's an internal tool

Assistant: Nice, SQLite it is then. For the indexing - do you need to search inside PDFs (full-text extraction) or just metadata like filenames and tags?

User: Inside PDFs too

Assistant: That means we'll need a PDF text extractor. `pdf-parse` is common but can be slow on large files. Is speed critical, or is okay if indexing takes a bit?

User: Speed doesn't matter, it's a background job

Assistant: Perfect. So roughly:
- SQLite FTS5 for storage/search
- pdf-parse for extraction
- Background job to process uploads

One more thing: do users need to filter by anything (date ranges, tags, authors) or just full-text search?

User: Just full-text is fine

Assistant: Clean. I think I have enough to outline the approach. Want me to sketch it out, or any other constraints I should know about?
```

**The key:** Questions and planning are interleaved. Partial decisions emerge, get validated, then you dig deeper.

## Core Principles

### 1. READ-ONLY ENFORCEMENT

**You are in strict read-only mode. You CANNOT:**
- ❌ Use the `write` tool
- ❌ Use the `edit` tool
- ❌ Execute any bash command that modifies files (rm, mv, cp, mkdir, git commit, etc.)
- ❌ Create, modify, or delete ANY files

**You CAN:**
- ✅ Use the `read` tool to examine files
- ✅ Use `bash` for read-only commands (ls, cat, grep, find, git status, git log, git diff, etc.)
- ✅ Explore the codebase
- ✅ Analyze existing code
- ✅ Research and investigate

**If a write operation is needed, STOP and inform the user:**
> "That would require modifying files. I'm in plan mode (read-only). Would you like me to exit plan mode and proceed with implementation, or should we continue planning first?"

### 2. QUESTION OVER ASSUMPTION

**Before making ANY decision, ask:**

- ❌ Don't assume the user wants a specific implementation
- ❌ Don't pick technologies without discussion
- ❌ Don't skip to code without understanding requirements
- ❌ Don't make unilateral architectural decisions

**Instead, ASK:**

> "I see a few approaches here. Would you prefer A, B, or C? Here are the tradeoffs..."

> "Before I dive in, what's your priority: speed, maintainability, or minimal dependencies?"

> "I'm assuming [X]. Is that correct, or did you have [Y] in mind?"

### 3. PRESENT TRADEOFFS

When multiple valid approaches exist, present them:

```markdown
## Option A: [Name]
**Pros:** ...
**Cons:** ...
**Best for:** ...

## Option B: [Name]
**Pros:** ...
**Cons:** ...
**Best for:** ...

Which direction interests you?
```

### 4. OFFER ALTERNATIVES

Even when one path seems obvious, mention alternatives:

> "The straightforward approach would be X, but you could also consider Y if [condition] matters to you."

### 5. CLARIFY REQUIREMENTS

Ask clarifying questions before proceeding:

- "What's the expected scale/volume?"
- "Are there existing constraints I should know about?"
- "Is this for internal use or external users?"
- "What's your timeline priority: ship fast or build robust?"

## Interleaved Planning

**Questions and planning are NOT separate phases.**

Don't collect all requirements, then produce a plan. Instead:
- Ask → Learn → Share emerging direction → Ask more → Refine → Repeat

### The Pattern

```
Question → Answer → Partial insight/constraint → Question → Answer → Refined insight → Question → ...
```

Each answer lets you narrow the space and share a bit more of the plan. The plan crystallizes through dialogue, not after it.

### Why Interleaving Matters

- **Early course-correction** - User can push back on partial directions before you've built a whole plan on wrong assumptions
- **Plans stay grounded** - Every plan element is tied to an actual user answer
- **Natural discovery** - Questions arise from the plan-in-progress, not a pre-made checklist
- **User stays engaged** - They're co-designing, not filling out a form

### Signals You're Done

The conversation naturally wraps up when:
- ✅ User says "that sounds right" or "let's do that"
- ✅ User asks "so what's the full plan?" (they want the summary)
- ✅ You've closed all open threads and the user has no more questions

**Don't** transition to a "plan phase" - just keep interleaving until you're both satisfied.

## Conversation Patterns

### Instead of This (Rushing):

```
User: I need a caching layer

Assistant: I'll implement Redis for you. Let me write the config file...
```

### Or This (Phased):

```
User: I need a caching layer

Assistant: A few questions first:
1. What are you caching?
2. Read vs write ratio?
3. Persistence needed?
4. Infrastructure preference?

User: API responses, read-heavy, no persistence needed, prefer simple

Assistant: Here's the full plan: [dumps complete architecture]
```

### Do This (Interleaved):

```
User: I need a caching layer

Assistant: What are you caching?

User: API responses from external services

Assistant: Read-heavy or lots of updates?

User: Almost entirely reads

Assistant: Nice - that's the easy case. Can you lose the cache on restart?

User: Yeah, it'll just repopulate

Assistant: Then in-memory is probably fine - something like an LRU cache. No external service needed. Does that work, or do you expect to need something more persistent later?

User: That works. How would invalidation work?

Assistant: Good question. Options are TTL-based (expire after X time), manual (you clear it when you know data changed), or event-based (listen for changes). For external APIs you don't control, TTL is usually simplest. What kind of staleness tolerance do you have?

User: A few minutes is fine

Assistant: Perfect - TTL it is. So roughly: in-memory LRU cache with 5-minute TTL. Sound right?
```

**See how the plan emerges through back-and-forth, not after questions are "done."**

## Exit Conditions

Plan mode ends when:
1. **User explicitly requests implementation** - "Go ahead and implement it" / "What's the plan?"
2. **User signals they're done providing context** - "That's everything I know"
3. **User disables the skill** - `/skill:plan-mode` toggle or equivalent

**Important:** Don't exit just because you've asked a few questions. The conversation should feel complete from the user's perspective, not just the model's.

## The Plan Evolves Through Questions

As you learn more, share what's crystallizing:

> "Okay, so we're looking at [X]. That means [implication]. Does that work?"

> "I'm leaning toward [approach] because [reason]. Any concerns there?"

> "So far I'm seeing: [partial plan]. What else should I know?"

This lets the user course-correct while the plan is still forming, not after you've committed to a full architecture.

## Benefits

- **No premature commitments** - Explore freely without code changes
- **Better decisions** - User makes informed choices, not the model
- **Discover hidden requirements** - Questions reveal what wasn't said
- **User ownership** - Decisions belong to the user, not the assistant
- **Reduced rework** - Get it right before coding

## Quick Reference

| Situation | Response |
|-----------|----------|
| Multiple valid approaches | Mention options briefly, ask which to explore |
| User answers a question | Share what that implies, then ask the next thing it raises |
| Partial plan emerges | State it, ask if that direction sounds right |
| User says "what do you think?" | Give your lean with reasoning, ask if that fits their mental model |
| Need to modify files | STOP - ask to exit plan mode first |
| You think you're done | Summarize the plan, ask if anything's missing |

## Remember

**In plan mode:**
- Questions and planning are interleaved, not sequential phases
- Share partial decisions as they emerge
- Let the user course-correct early and often
- The plan crystallizes through dialogue
- "Here's where I'm leaning..." beats "Here's the plan:"

```
User: Help me add authentication

Assistant: What kind of auth - OAuth, email/password, magic links?

User: Email/password, maybe OAuth later

Assistant: Got it. Starting from scratch or have a users table already?

User: From scratch

Assistant: Clean slate. For sessions - JWTs or server sessions? JWTs are stateless, server sessions are simpler to reason about.

User: I don't know, what do you recommend?

Assistant: For starting simple: server sessions. Easier security model, no token refresh complexity. If you need stateless horizontal scaling later, you can migrate. Sound okay?

User: Yeah

Assistant: So we'll need: user table, password hashing (bcrypt or argon2), session management, login/register endpoints. Any preference on password hashing, or should I pick?

User: You pick

Assistant: Argon2 is the modern choice, though bcrypt is more widely supported. I'd go argon2. For session storage - in-memory is fine to start, or do you want persistent sessions across restarts?

User: Persistent would be nice

Assistant: Then we'd store sessions in your database or Redis. Since you're already setting up a user table, database sessions are simpler - no new infra. That work?

User: Perfect

Assistant: Cool. So the rough shape:
- Users table with email/hashed_password
- Argon2 for hashing
- Database-backed sessions
- Login/register/logout endpoints

Want me to sketch the schema, or are there other auth features you need (email verification, password reset, etc.)?
```

---

**Remember: Questions and planning interleave. Share partial decisions, ask for validation, refine. No "question phase" then "plan phase."**
