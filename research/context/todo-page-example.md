# Todo Page Example

Last updated: 2026-03-27

This file captures the kind of messy, mixed-content page the product must handle well.

## Why This Example Matters

The sample page is not a normal todo list. It mixes:

- work tasks
- interview prep
- job search
- project ideas
- learning goals
- links/resources
- people names
- assistant instructions
- imported critiques and analyses

If the app treats all of this as plain text, it fails.

## Representative Raw Inputs

Examples pulled from the page:

- `Purgo - prod push`
- `Purgo - snowflake, baike connect`
- `Tmrw - Palo Alto networks - intro, values, behavioral, questions to ask`
- `Leetcode mediums - interview prep`
- `Startups - LinkedIn connect and messages`
- `Applications - new grad`
- `Project management tool / Tracker`
- `Local llm PoC?`
- `Scheduling KT`
- `graph rag resource`
- `gym`
- `read`
- person names like `Advay`, `Sathish`, `Vasanth`, `Daud`, `Ruban`
- URLs to YouTube, Reddit, MIT OCW, Princeton NLP, GitHub, and other resources
- explicit assistant instructions like:
  - explain the problem with your understanding first
  - check constraints
  - start with brute force, then optimize
  - explain before coding

It also contains a long imported portfolio/resume critique with many extracted action items.

## Expected Assistant Behavior

From one pasted page, the system should be able to derive:

- active work tasks
- interview-prep workflows
- learning/backlog items
- resources worth ingesting
- unresolved people mentions
- project ideas that belong in an incubator
- assistant rules/preferences
- extracted action items from long imported documents

## What The Assistant Should Not Do

- convert every line into a task
- assume every person name is a contact with a follow-up
- flatten links and thoughts into the same bucket
- lose the original raw page after extraction
- require the user to manually tag every line first

## Structural Implications

The system needs at least:

- raw capture storage
- candidate extraction
- confidence levels
- unresolved mentions
- promoted operational objects
- source links back to the original capture

## Downstream Views This Example Should Generate

- Inbox
- Today
- Work
- Job Search
- Learning
- Ideas
- People
- Resources
- Rules / Preferences
- Reviews / Imported Analyses

## Product Lesson

The best model here is not "notes vs tasks."

The best model is:

- capture first
- interpret next
- promote only what deserves operational behavior
