# Agent Standard Rules for Delivery System Workspace

> These rules are **non-negotiable** and apply to **every single code change** made in this workspace.
> Check every item before writing or committing any code.

---

## 🔑 Rule 0 — Consistency Over Correctness (Always First)

Before implementing **any** UI element (pagination, dropdown, modal, button, table, input, etc.):
1. Scan the codebase for an existing instance of that element.
2. Replicate it **exactly** — same structure, same naming, same styling.
3. **Never build independently** even if the result looks correct.

---

## Code Quality

- No unused imports, state, variables, or types
- No commented-out code — implement it or delete it
- No obvious inline comments — code should be self-explanatory
- No inline functions in JSX — always extract to named `useCallback` handlers
- No magic numbers — always define named constants at module level
- No magic strings — always define named constants (e.g. `REGISTER_ENDPOINT`)
- No `any` type — define specific TypeScript types; use `unknown` + `instanceof` guards in catch blocks
- No `setTimeout` just to delay navigation — redirect immediately when ready
- No IIFEs in render logic — extract complex data transformations to named pure functions outside the component
- Utility logic (debounce, throttle, clamp, formatDate) must live in shared `utils/` files — never define locally inside a component

---

## Naming & Semantics

- Full semantic variable names — `isPasswordVisible` not `show`, `isMobileMenuOpen` not `open`
- Full descriptive parameter names in all callbacks — never abbreviate (`jobCardId` not `id`)
- No vague prop names — name by what they do, not where they appear
- Full boolean flag names — `isEditMode` not `isEdit`, `isModalOpen` not `open`

---

## Component Design

- Shared/reusable components stay generic — no page-specific UI concerns inside them
- Extract repeated JSX blocks with minor variations into standalone components **immediately**
- Consistent terminology across the entire UI — pick one word and stick with it
- UI state belongs in UI components — never in context or data layers
- Never pass props the child can derive or detect itself
- Never introduce new design patterns or component styles without checking what exists
- All new UI elements must match the existing app's UI exactly — same colors, border radius, font sizes, button styles, spacing

---

## React Patterns

- All derived values and filters → `useMemo`
- All event handlers → `useCallback`
- No inline functions in JSX — always extract to named handlers
- No `isHydrated`/`hasMounted` guards — use fallbacks instead
- No `useEffect` for DOM side effects triggered by user actions — handle in event handler directly
- Wrap in `React.memo` when parent re-renders frequently but props rarely change

---

## State Management

- Redux slices stay clean — no null/fallback handling inside reducers
- Callers pass valid data to slices
- Context only manages data — never let a data layer know about UI details

---

## Props Design

- Props only carry what the parent genuinely owns and the child cannot know itself
- Ask before passing any prop: does the parent own this? Can the child derive it?
- Data belongs in context, display belongs in the component

---

## Library & Styling

- One icon library used exclusively — never mix (this project uses Material Symbols Outlined)
- Consistent design tokens project-wide — use the Velocity Logistics Design System
- No component library default aesthetic bleeding into the UI
- All clickable elements need `cursor-pointer` explicitly

---

## API Parameters

- Never construct URLs with string interpolation for query params
- Always pass parameters as structured objects
- **Never**: `fetch('/api/users?id=' + id)` → **Always**: pass as body or structured query

---

## Type Definitions

- Every interface has exactly one source of truth per concept
- Never define the same concept twice under different names
- Types mirror the API response exactly — no more, no less
- Long parameter lists (3+) must be consolidated into a single named interface/type

---

## General Project Rules

- Static data outside components — no prop/state dependency = module-level named constant
- Never fetch all records — pagination from day one, `PAGE_SIZE = 10`
- One ID field per type — never both `id` and `_id`, mirror API exactly
- Always extract `initialFormState` constant before passing to `useState`
- No inline expressions in JSX — extract arrays/objects/ternaries to named constants above `return`
- All clickable elements need `cursor-pointer` explicitly
- Destructive actions (delete) **must** have a confirmation modal before API call
- Extract submit button content to a pure named function outside the component

---

## Documentation Standard

After completing any feature, route, or model:
- Update `project_docs.md` with what was built, what API routes exist, and any architectural decisions made
- Answer any learning prompts associated with the feature (e.g. "Why does X work this way?") directly in `project_docs.md`
- Keep `design_system.md` updated if any new design tokens or component patterns are introduced

---

## Mongoose Model Exports

When creating Mongoose schemas in a Next.js App Router environment, **always** use the HMR guard to prevent `OverwriteModelError`.

```typescript
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
```

---

## Next.js External Images

When using the Next.js `<Image>` component with external URLs (like `lh3.googleusercontent.com` or `images.unsplash.com`), **always** configure `next.config.ts` with `images.remotePatterns` first to prevent runtime errors.

---

## Responsive UI — Mobile-First Standard

All UI components **must be consistent and fully usable across all screen sizes** (mobile, tablet, desktop). This is non-negotiable.

- **Mobile-first**: Write base styles for mobile, then use `md:` and `lg:` prefixes to progressively enhance.
- **Navigation**: On mobile (`< md`), always collapse nav links into a hamburger/drawer menu.
- **Touch targets**: All interactive elements must be at minimum `h-12` (48px) tall.
- **Padding**: Use `px-4 py-4` (16px) on mobile, `md:px-8 md:py-8` (32px) on desktop. Never use desktop-only padding as base.
- **Typography**: Use `text-2xl md:text-4xl` patterns — never leave large desktop headlines unsized on mobile.
- **Grid layouts**: Always specify responsive column counts, e.g., `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
- **Split screens**: Use `hidden md:flex` for desktop-only panels and `flex md:hidden` for mobile-only content.
- **Test at**: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1280px (Desktop).

---

## 🐛 Debugging Standard — 7-Phase Workflow

> Use this structured approach for **every** error encountered in the project.
> Follow all phases in order — do not skip steps.

### Phase 1 — Generate Predictions

Examine the error message and the user task where the error occurred. Research common causes and relate them to the specific context.

**Generate five educated predictions** for potential causes, considering:
- Coding mistakes (type mismatches, wrong return types, missing `await`, etc.)
- Dependency or version issues
- Async/sync boundary problems
- Framework-specific gotchas (e.g., Next.js server vs. client, Flask streaming, etc.)
- Resource or environment constraints

Document predictions in a `<predictions>` block.

### Phase 2 — Investigate with Scratchpad

With predictions in mind, **methodically review** the code segments related to where the error was reported.

For each prediction:
1. Find the relevant code segment
2. Verify or disprove the prediction through code inspection and logical reasoning
3. Document rationale for keeping or discarding each prediction

Use **process of elimination** to narrow down to the most likely cause. Document all findings in a `<scratchpad>` block — show all work in full.

### Phase 3 — Identify Problematic Code

After narrowing down predictions, **pinpoint the exact code segment** responsible for the error. Quote the problematic lines verbatim in a `<problematic_code>` block.

### Phase 4 — Step-by-Step Reasoning

Document the **entire thought process** from initial error assessment through:
- Prediction formulation
- Code analysis
- Debugging strategy selection
- Rationale for key decisions

This narrative goes in a `<step_by_step_reasoning>` block.

### Phase 5 — Root Cause Explanation

Select the **most likely cause** from remaining predictions. Provide a detailed explanation of:
- Why this is the root cause
- How the problematic code relates to the error manifestation
- How the error propagates through the system
- What the correct behavior should be

Document in an `<explanation>` block.

### Phase 6 — Debug Instructions

Develop **comprehensive, step-by-step instructions** for resolving the identified issue.

Instructions must be:
- Clear and actionable
- Suitable for a developer unfamiliar with the specific project
- Ordered from quickest verification to full fix

Document in a `<debug_instructions>` block.

### Phase 7 — Corrected Code

Provide **both** the corrected code snippet **and** the original code it replaces.

Format:

#### ✅ Corrected Code
```language
// corrected implementation
```

#### ❌ Code Being Replaced
```language
// original problematic implementation
```

Include a brief explanation of **what changed and why**.

### Debugging Output Rules

- Paragraph breaks after every XML-style tag block
- Numbered lists must have proper formatting — no run-on items
- Responses should be comprehensive and detailed (~8000 tokens for complex bugs)
- Focus on ensuring the error is not only resolved but **understood** in context of the app's operation
