---
name: ui-guideline-hearing
description: >
  UIガイドラインをヒアリングで構築するスキル。コンポーネント規約・デザイントークン・画面分解ルール・
  アクセシビリティ・テスト戦略を対話形式で収集し、プロジェクト固有のUI実装ガイドラインMarkdownを生成する。
  トリガー: 「UIガイドラインを作って」「コンポーネント規約を決めたい」「デザイントークンを整理したい」
  「画面分解のルールを作りたい」「UI実装ルールをヒアリングして」「/ui-guideline-hearing」
  「UIの実装方針を決めたい」「デザインシステムのルールを定義したい」
  「コンポーネント設計の規約を作って」「UI規約をヒアリング」
---

# UI Guideline Hearing

Conduct a structured interview to establish UI implementation guidelines, then output a Markdown guideline document.

## Integration with biz-context-hearing

Before starting Phase 0, check if `docs/biz-context.md` exists in the project.
- **If exists**: Read it and use "UI Implications Summary" (Section 5) to pre-fill defaults and validate choices
- **If not exists**: Ask user if they want to run `biz-context-hearing` first, or proceed with technical hearing only

## Workflow

Execute phases sequentially. Use `AskUserQuestion` for each round (max 4 questions per call).
Read [references/hearing-questions.md](references/hearing-questions.md) for the full question bank.

### Phase 0: Project Setup (3 rounds)

1. **Core Stack**: tech stack, TypeScript strictness, CSS strategy, UI library
2. **Tooling**: package manager, linter/formatter, build tool, monorepo
3. **Scope**: project analysis option, target scope, team size

If project analysis → use Agent (Explore) to scan:
- Glob for component files, Grep for token definitions, identify existing patterns
- Summarize findings to inform subsequent phases

### Phase 1: Component Conventions (4 rounds)

1. **Naming & Structure**: naming convention, directory structure, file organization, export style
2. **Props Design**: type definition, composition patterns, variant management, prop naming
3. **Component Patterns**: controlled/uncontrolled, error handling, loading/skeleton, empty states
4. **Advanced**: granularity criteria, state management, custom hooks, memoization policy

### Phase 2: Design Tokens (4 rounds)

1. **Color System**: management method, scale, brand colors, dark mode
2. **Typography**: font family, size scale, weight, line-height/letter-spacing
3. **Spacing & Layout**: spacing base unit, breakpoints, container width, z-index
4. **Decorations & Motion**: border-radius, shadows, animation/transition, focus styles

### Phase 3: Screen Decomposition (4 rounds)

1. **Page Structure**: structure pattern, layout components, layout approach, nested layouts
2. **Responsive & Adaptive**: strategy, mobile navigation, responsive images, touch targets
3. **Decomposition Rules**: section boundaries, shared vs page-specific, data fetching boundary, routing
4. **UI State Patterns**: modal/dialog, toast/notification, form patterns, error display

### Phase 4: Accessibility & Interaction (3 rounds)

1. **A11y Basics**: target level, semantic HTML, ARIA usage, keyboard navigation
2. **Interaction Design**: hover/active states, disabled states, loading interaction, micro-interactions
3. **Icon & Image**: icon system, icon sizing, image handling

### Phase 5: Testing & Documentation (2 rounds)

1. **Testing Strategy**: test framework, test scope, test naming
2. **Documentation**: component docs, Storybook usage

### Phase 6: Generate Guideline

1. Read [references/guideline-template.md](references/guideline-template.md)
2. Fill template with all collected answers
3. Include tech-stack-specific code snippets
4. If project analysis was done, add "Current State Analysis" section
5. Write to user-specified path (default: `docs/ui-guideline.md`)
6. Present summary and ask if any section needs revision

## Handling "Undecided" Answers

When user selects "特に決めていない" or says they haven't decided:

1. **DO NOT block progress** — acknowledge and move on
2. **Propose a sensible default** based on the chosen tech stack and team size:
   - Solo/small team → simpler, more flexible conventions
   - Large team → stricter, more explicit rules
3. **Mark as "recommended default"** in the output with a `💡` marker
4. **Add a rationale** (1 sentence) explaining why this default was chosen
5. At the end, list all recommended defaults in a summary so the user can review and override

Example in output:
```
### 2.4 Z-index Scale
💡 Recommended default (未定のため提案):
トークン定義方式を推奨 (base:0, dropdown:10, sticky:20, modal:50, toast:100)
→ チーム規模が拡大しても z-index 競合を防げるため
```

## Rules

- Ask max 4 questions per AskUserQuestion call
- After each phase, show a brief summary of captured decisions before moving on
- If user says "skip" for a phase, use sensible defaults for the entire phase
- Adapt question options based on the tech stack selected in Phase 0
  - e.g., hide Next.js-specific options if Vue was selected
- Keep the final guideline under 800 lines
- Include concrete code examples matching the user's stack in every section
- Never force a decision — always allow "Other" for custom input
