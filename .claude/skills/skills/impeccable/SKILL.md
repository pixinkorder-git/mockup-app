---
name: design-eye
version: 2026.03.1
last_updated: 2026-03-21
projects: [gtm-deeptech, setting-live, izaia]
description: "Aesthetic calibration through external references and user feedback. MUST run before design-signature or expertise-web on any web project. Claude has bad taste — this skill ensures all visual decisions are validated by the user against real reference sites. Triggers on: 'website', 'landing page', 'redesign', 'improve design', 'make it look better', 'visual direction', 'design review'."
---

# Design Eye

## Overview

Claude has bad taste. This skill exists because of that fact.

Design Eye is the aesthetic calibration layer that runs BEFORE any other design skill. It produces a validated visual direction by browsing real reference sites and iterating on user feedback. It never makes autonomous aesthetic decisions. It never judges what is beautiful or ugly. It asks, it shows, it listens.

**Core principle:** Never decide. Always propose. The user is the only judge of what has soul.

## CRITICAL: This Skill Runs First

This skill MUST execute before `design-signature` and `expertise-web` touch any visual aspect of a site. The other skills provide technical baseline (typography rules, ARIA, touch targets). This skill provides aesthetic direction.

If you're about to work on a web project and `design-direction.md` does not exist in the project, run this skill first.

## CRITICAL: Skills to Invoke Alongside

- `superpowers` — always (brainstorming, plans, verification)
- `humanizer` — when writing ANY visible text

Do NOT invoke `design-signature` or `expertise-web` until this skill has produced a validated direction.

## Fundamental Rules

1. **Never say "this looks good" or "this looks bad"** — you don't know. Ask the user.
2. **Never remove an existing element without asking** — it might be the soul of the site.
3. **Never add visual effects without reference justification** — "the spec says grain" is not enough. Show a reference where grain works in this context and get user approval.
4. **Never choose for the user** — if they say "you decide", reduce to A/B binary choices until a direction emerges.
5. **Always show, never describe** — open reference sites in the browser, show screenshots, present real examples. Words are not visual direction.
6. **Search by VISUAL AMBIANCE, not by business niche** — on reference sites, search for "minimal dark", "bold typography", "editorial", "personal brand", "agency" — NOT for "closing B2B" or "coach sportif". These sites are organized by visual style and broad industry, not by specific business niches. The niche keywords give zero results.
7. **Never mention reference site names to the user** — the user doesn't know or care what Landing.love or Setting.live are. When presenting options, describe WHAT the element does, not WHERE it comes from. "Des cards cliquables par situation" not "comme sur Setting". "Un slider qui calcule ton retour" not "comme le simulateur ROI de Setting". The references are ton outil interne de calibration, pas un argument de vente.

## Step 0: Brain Dump (OBLIGATOIRE, tous les modes)

**Avant toute question, demander a l'utilisateur de tout vider.**

Dire exactement ceci :

> "Avant de commencer, donne-moi TOUT ce que tu as en tete sur ce projet. Pas besoin que ce soit structure — je veux le maximum d'infos brutes :
>
> - C'est quoi le produit/service ?
> - C'est pour qui ? (ta cible, le plus precis possible)
> - Qu'est-ce que le visiteur doit faire sur la page ? (CTA)
> - T'as des sites que tu aimes ? Des sites que tu detestes ?
> - T'as des mots-cles, un positionnement, un ton ?
> - Des contraintes ? (budget, techno, deadline, langue)
> - Des visuels existants ? (logo, couleurs, typo)
> - Tout ce qui te passe par la tete, meme si ca semble pas pertinent.
>
> Plus tu me donnes, mieux je cible mes recherches de references."

**Attendre la reponse.** Ne poser AUCUNE question structuree tant que l'utilisateur n'a pas fait son brain dump. S'il repond avec peu d'infos, relancer UNE fois : "T'as rien d'autre ? Un concurrent que tu aimes, un site qui te fait dire 'je veux ca' ?"

Ensuite seulement, completer les trous avec des questions ciblees sur ce qui manque (pas des questions generiques).

**Si le brain dump ne contient AUCUNE indication visuelle** (pas de site aime, pas d'ambiance, pas de couleur), poser UNE question d'ambiance avant de chercher des references : "Plutot sombre et intense, ou clair et aere ? Serieux ou decontracte ?" — ca suffit pour orienter les recherches. Sans ca, tu cherches a l'aveugle.

**Si l'utilisateur n'a toujours pas d'avis** apres la question d'ambiance, ne pas insister. A la place, rechercher sur le web les tendances psychologiques et visuelles de l'ACHETEUR FINAL du client. Exemple : si la cible est "solopreneurs", chercher "what visual styles resonate with solopreneurs", "solopreneur landing page psychology", "indie founder design preferences". Utiliser ces insights pour orienter la recherche de references a la place de l'avis du client.

## Reference Search Strategy

See `parallel-search.md` for full mechanics. Load it before launching any search on 2+ sources.

Quick rule: 1 source → direct WebFetch. 2+ sources → read `parallel-search.md` first.

## Module Loading

1. **On skill launch:**
   Check `~/.claude/projects/<active-project-path>/memory/taste-profile.md`
   - Exists, non-empty, parseable → read `taste-memory.md` (unconditional — mode unknown yet)
   - Absent / empty / unparseable / malformed → treat as absent, skip, treat as new user

2. **Mode detection (after brain dump):**
   - Mode D trigger requires BOTH:
     a) No existing site (no URL, no current visual elements in brain dump)
        → if ambiguous: "Tu as un site existant ou on part de zéro ?"
     b) Keywords-only brief: no named site, brand, or competitor
        → mixed case: ANY named reference → Mode B regardless of additional keywords
        → keywords alone without any named reference = Mode D
   - Mode D → read `brief-mode.md`
   - Modes A / B / C → normal flow

3. **Research phase:**
   - 1 source → direct WebFetch
   - 2+ sources → read `parallel-search.md` first

4. **Presenting options:**
   - Read `output-formats.md` for any comparison table or direction proposal
   - Format 1: reference comparisons | Format 2: element mixing
   - Format 3: synthesized direction (all modes) | Format 4: original directions (Mode D only)

## Mode Detection

Apres le brain dump, determiner le mode :

- **Site exists + full redesign requested** → Mode A
- **Nothing exists yet** → Mode B
- **Nothing exists yet + keywords only (no named reference)** → Mode D → read `brief-mode.md`
- **Site exists + specific section to improve** → Mode C

Ask the user if unclear: "Tu veux retravailler tout le site, ou juste une section specifique ?"

## Mode A: Site existant (redesign complet)

1. **Browse the existing site** — open it in the browser, scroll through every section
2. **Inventory visual elements without judging them** — list what you see: background video, color palette, typography, animations, layout patterns, social proof, CTAs, effects. Be factual: "il y a un fond video derriere le hero", "la palette est monochrome orange", "le heading utilise un degrade violet-orange". No opinions.
3. **Cross-reference with brain dump** — the user already told you what matters. Don't re-ask what they already said. Ask ONLY about gaps: "Tu m'as parle de X et Y. Est-ce que [element visuel] fait partie de l'identite aussi, ou c'est un truc qu'on peut faire evoluer ?"
4. **Search for references** — use the brain dump to target searches. If the user mentioned competitors or sites they like, START there. Then go to Landing.love and/or Saaspo, filter by the client's sector. Find 3-5 sites in the same space.
5. **Show references to the user** — "Ces sites sont dans ton domaine. Lequel a quelque chose qui te parle ?"
6. **Iterate** — "Tu aimes le header de celui-ci mais le spacing de celui-la ? OK." Keep narrowing. If the user has no preference, show 2 side-by-side and ask a binary question.
7. **Produce the direction** — write `design-direction.md` with elements to keep, chosen references, visual direction, and explicit constraints.
8. **Validate** — ask: "Est-ce que cette direction est validee ? Je ne coderai rien tant que tu n'as pas confirme." Only a clear "oui"/"OK"/"go" counts. Anything ambiguous = iterate more.

## Mode B: Nouveau site (rien n'existe)

1. **Exploit the brain dump** — the user already gave you sector, cible, vibe, references. Extract what you already know. List it back: "OK, d'apres ce que tu m'as dit : [resume]. C'est correct ?"
2. **Fill gaps only** — ask questions ONLY about what's missing from the brain dump. Don't re-ask sector if they already said "B2B closing services". Don't ask about vibe if they said "sobre et minimal".
3. **Search for references** — use brain dump keywords (competitors, liked sites, sector) to target Landing.love, Saaspo, and 21st.dev. Find 5-8 sites.
4. **Show references** — "Parmi ceux-la, lesquels te parlent ?"
5. **Narrow down** — "Tu aimes le hero de X, les couleurs de Y, le footer de Z"
6. **Assemble direction** — combine chosen elements into a coherent visual direction.
7. **Validate** — same protocol as Mode A.

## Mode C: Redesign partiel (une section)

1. **Use brain dump context** — the user already told you what's wrong and what they want. Extract the pain points and desired outcome.
2. **Screenshot the current section** — capture the current state as a visual baseline to compare against later.
3. **Inventory the target section AND adjacent sections** — the section must stay coherent with what's above and below it. Note: palette, typography, spacing rhythm, animation style of the surrounding context.
4. **Identify the constraint box** — list what CANNOT change because it's part of the site's existing identity:
   - Global palette (unless the user explicitly wants to change it)
   - Navbar and footer (unless they're the target)
   - Typography system
   - Animation style and speed
   - Existing component patterns used elsewhere on the site
5. **Fill gaps** — ask only what's missing: "Tu m'as dit que [X] ne va pas. Est-ce qu'il y a d'autres trucs dans cette section que tu veux changer ?"
6. **Search for component-level references** — 21st.dev for heroes, Saaspo for pricing, Navbar Gallery for navigation, Component Gallery for UI patterns. Search by component type, not full-page.
7. **Show 3 refs side-by-side with the current state** — "Voici ta section actuelle VS ces 3 alternatives. Lequel te parle ?" The comparison with the current state is essential — it anchors the conversation.
8. **Iterate** — same as other modes. Narrow down to specific elements.
9. **Produce a SCOPED direction** — the target section gets specific direction. Everything else inherits the site's existing visual identity. Add a `## Scope` section to `design-direction.md`:
   ```
   ## Scope
   - Target: [section name]
   - Changes: [what changes]
   - Unchanged: [what stays the same — explicit list]
   ```
10. **Validate** — same protocol as Mode A.

## Multi-Page Projects

When a project has 5+ pages or distinct page types (landing, blog, dashboard, legal):

1. **One global direction** — `design-direction.md` covers palette, typography, effects, and ambient patterns that apply everywhere.
2. **Page-level overrides** — some pages need their own treatment. Add to the direction file:
   ```
   ## Page-Level Overrides
   - /blog/*: lighter layout, wider content column, no glassmorphism cards
   - /dashboard: functional UI, data-dense, minimal decorative effects
   - /legal: plain text, no effects, max readability
   ```
3. **Shared vs unique sections** — navbar, footer, and CTA patterns are global. Hero, content, and layout are per-page-type.
4. **Validate per-type, not per-page** — if there are 50 blog posts, validate the blog template once. Don't re-run design-eye for each article.
5. **One design-direction.md per project** — never create multiple direction files. Use the `## Page-Level Overrides` section for variations.

**When to trigger:** If the user mentions "blog", "multiple pages", "sous-pages", "dashboard", or describes more than 2 distinct page types during the brain dump, proactively add `## Page-Level Overrides` to the direction template.

## Client Mode vs Solo Mode

Not all projects are direct conversations with the decision-maker. Detect the context:

- **Solo mode** (default) — the user IS the decision-maker. Brain dump is their own vision. Feedback loop is real-time.
- **Client mode** — the user is executing for a client. The brain dump is a retranscription of a brief. Feedback loops are async (hours/days, not seconds).

**Detection:** If the user says "mon client", "le brief du client", "il faut que je propose", or "pour [company name]" → switch to client mode.

**Client mode adjustments:**
1. **Document every decision with justification** — the user may need to defend choices. Instead of just "serif+sans-serif", add: "serif+sans-serif parce que [reference] montre que ca marche dans ce secteur, et ca differencie de [concurrent] qui utilise du sans-serif seul."
2. **Produce 2-3 options, not 1** — the user presents options to the client. Format as: "Option A: [description + reference], Option B: [description + reference]. Ma recommandation: A parce que [raison]."
3. **Mark validation as pending** — `Confirme par l'utilisateur : en attente du client`. The gate remains until the user confirms the client has approved.
4. **Anticipate revisions** — clients change their mind more than solo users. The `## Mid-Build Direction Change` protocol will likely be used. Flag this upfront.

Add to `design-direction.md`:
```
## Context
- Mode: solo | client
- Decision-maker: [name/role if client mode]
- Feedback channel: [real-time | async — email/slack/meeting]
```

## Reference Sources

Full catalog and search strategies: see `parallel-search.md` (source distribution table).

Quick reference: Landing.love (full-page), Saaspo (SaaS), 21st.dev (components), Land-book (curation).

## When the User Has No Opinion

This WILL happen. The user says "je sais pas" or "choisis pour moi".

**Never choose.** Instead:
1. Reduce to 2 options side-by-side
2. Ask a binary question: "Entre ces deux, lequel te parle plus ?"
3. If still no preference, change the dimension: "OK, oublie le layout. Juste les couleurs: chaud ou froid ?"
4. Keep reducing until something clicks

The goal is to find the ONE thing the user does have an opinion about, and build from there.

## Output: design-direction.md

Write this file in the project root. Use this exact template:

```
# Design Direction — [nom du projet]

## Elements a garder
- [element] : [pourquoi c'est important pour l'utilisateur]

## References choisies
- [URL] : [element specifique retenu] — [ce qu'on en prend]

## Direction visuelle (validee)
- Palette : ...
- Typographie : ...
- Layout : ...
- Effets : ...
- Ambiance : ...

## Scope (Mode C only)
- Target: [section name]
- Changes: [what changes]
- Unchanged: [explicit list of what stays the same]

## Contraintes (ne pas toucher)
- [contrainte explicite]

## Validation
- Date : [date]
- Confirme par l'utilisateur : oui
```

**Downstream skills check for `## Validation` before starting.** If it's missing, they must invoke design-eye first.

### Updates and Revisions

If the user requests visual changes after validation:
1. Re-run the relevant reference + feedback steps
2. Add a `## Revision [date]` section to the file
3. Never modify the direction without going through the loop again

## Mid-Build Direction Change

When the user questions the direction AFTER code has been written:

1. **STOP** — do not write more code until resolved
2. **Quantify the impact** — "Tu veux changer [X]. Ca touche [liste des composants]. Voici ce qui est deja fait et ce qu'on perdrait."
3. **Distinguish pivot vs adjustment:**
   - **Adjustment** (color tweak, spacing, typography weight) → update `design-direction.md` with a `## Revision [date]` section, adapt the code. No need to re-run the full reference loop.
   - **Pivot** (different vibe, different layout structure, different visual identity) → re-run the relevant Mode (A/B/C) from the reference search step onward. The existing code is a sunk cost — don't let it anchor the new direction.
4. **New validation required** — same gate as the first time. A `## Revision` section must include `Confirme par l'utilisateur : oui`.
5. **Branch the code** — create a git branch `pivot/[description]` before modifying. The previous state stays recoverable.

**Key principle:** Sunk cost is not a design argument. If the user's taste has evolved, follow their taste, not the code already written.

## Conflict Resolution

When another skill's pattern conflicts with the validated direction, **the direction wins**.

Examples:
- `design-signature` says "always serif+sans-serif" but direction says "keep the single sans-serif that defines this brand" → keep the sans-serif
- `design-signature` says "add grain texture on dark themes" but direction says "preserve the clean video background" → no grain over the video
- `expertise-web` says "add social proof above the fold" but direction says "the minimal hero with one CTA is the identity" → don't add social proof

## What This Skill Does NOT Do

- It does not write code
- It does not judge aesthetics (it facilitates the user's judgment)
- It does not choose for the user
- It does not apply to purely technical projects (APIs, CLIs, backends)
- It does not override user decisions from other skills — it provides direction that other skills respect

## Post-Direction Handoff

Once `design-direction.md` is validated, announce:
> "Direction validee. Les skills `design-signature` et `expertise-web` peuvent maintenant travailler en respectant cette direction."

Then the normal skill chain resumes:
1. `frontend-design` (impeccable) for execution quality — anti-patterns, typography, color, spacing, motion
2. `design-signature` for Abraham's signature visual effects (within the direction)
3. `expertise-web` for technical patterns (without touching validated aesthetics)

After implementation, use impeccable commands to verify quality:
- `/audit` — comprehensive quality check across accessibility, performance, theming, responsive
- `/critique` — UX evaluation with "AI Slop Test"
- `/polish` — final quality pass before shipping
