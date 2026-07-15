# LiteDoc — Architecture & Reference

LiteDoc is a fast, keyboard-first, block-based document editor built with React + TypeScript. It supports plain text rows, bullet points, live math blocks, and 2D tables — all driven by a custom state engine with no backend or account required.

---

## Project Structure

```
litedoc/
├── public/               Static assets served as-is
├── docs/
│   └── architecture.md   This file
├── src/
│   ├── components/       UI components
│   │   ├── App.tsx         Root editor orchestrator
│   │   ├── RowRenderer.tsx Per-row display and input
│   │   ├── SlashMenu.tsx   Slash command palette
│   │   └── HelpModal.tsx   Left-drawer help reference
│   ├── state/
│   │   └── useEditorState.ts  Core state hook + dispatch
│   ├── utils/
│   │   └── model.ts       Row factory + word-block helpers
│   ├── types/
│   │   └── index.ts       Shared TypeScript types
│   ├── main.tsx           React entry point
│   └── index.css          Global design tokens + styles
├── README.md
└── LICENSE
```

---

## State Architecture

All editor state lives in a single `EditorState` object managed by `useEditorState.ts` (a custom hook wrapping `useState` + `useCallback`). There is no Redux, no Context — the hook returns `[state, dispatch]` directly to `App.tsx`.

### Key state fields

| Field | Purpose |
|---|---|
| `rows` | Ordered array of `Row` objects (the document) |
| `activeRowId` | ID of the row currently focused |
| `activeTableCell` | `{r, c}` of focused table cell, or `null` |
| `selection` | Block selection state (anchor/focus row + block index) |
| `selectionMenu` | Whether the selection context menu is visible |
| `slashMenuState` | Open state, filter string, and selected index for `/` menu |
| `jumpToRowState` | Open state for Ctrl+G number input |
| `isHelpOpen` | Whether the help drawer is open |

### Persistence

Rows are debounced-saved to `localStorage` under the key `litedoc-state`. A `beforeunload` / `visibilitychange` flush guard ensures nothing is lost on tab close. Custom slash command templates are saved separately under `litedoc_templates`.

---

## Row Model

Every row is a `Row` object:

```ts
interface Row {
  id: string;          // crypto.randomUUID()
  type: RowType;       // 'text' | 'bullet' | 'math' | 'table'
  content: string;     // space-delimited word blocks
  indentLevel: number; // 0–5
  tableData?: string[][];
}
```

Rows are tokenized by spaces into **word blocks** for block-selection mode. The helpers in `utils/model.ts` (`getWordBlockAtCursor`, `replaceWordBlocks`) power this.

---

## Block Selection Mode

Triggered by `Shift + Arrow` keys (all four directions). Behavior:

- **`Shift + Left` / `Shift + Up`** — selects one word block to the left.
- **`Shift + Right` / `Shift + Down`** — selects one word block to the right.
- At the beginning of a row, `Shift + Left/Up` jumps to the last block of the previous row.
- At the end of a row, `Shift + Right/Down` jumps to the first block of the next row.
- Once selection is active, repeated presses expand the focus block index in the chosen direction across row boundaries.
- `Ctrl + A` once selects all blocks in the current row; twice selects all rows.

### Selection context menu actions

| Key | Action |
|---|---|
| `S` | Save selection as a custom slash command |
| `C` | Copy selection as GitHub-flavoured Markdown |
| `D` | Delete selected blocks |

---

## Math Block Engine

The `/math` row type has two layers:

1. **Evaluation layer** (custom parser in `RowRenderer.tsx`): reads the raw input, applies suffix/operator substitutions, sanitizes to only math characters, evaluates with `new Function(...)`, and formats the result with `toLocaleString('en-US')` (thousands separators).
2. **Rendering layer** (KaTeX via `react-katex`): takes the formatted result string and renders it as inline math for crisp typography.

### Supported syntax

| Input | Meaning |
|---|---|
| `+` `-` `*` `/` | Standard operators |
| `d` | Division alias for `/` |
| `k` | × 1,000 |
| `l` | × 1,00,000 (Lakh) |
| `mn` | × 1,000,000 (Million) |
| `bn` | × 1,000,000,000 (Billion) |

*Example: `10mn d 2` → `= 5,000,000`*

---

## Keyboard Shortcuts Reference

### General

| Key | Action |
|---|---|
| `Enter` | New row (continues bullet type) |
| `Backspace` at row start | Revert type → text, or merge with row above |
| `Tab / Shift+Tab` | Indent / un-indent |
| `Arrow Up / Down` | Move between rows |
| `Ctrl + L` | Toggle dark / light mode |
| `Ctrl + G` | Jump to row by number |
| `Ctrl + A` | Select all blocks / all rows |
| `?` button | Open help drawer |

### Slash Commands

| Command | Action |
|---|---|
| `/bullet` | Convert to bullet list |
| `/table` | Insert 2×2 table |
| `/math` | Live math block |
| `/design` | Product Design template |
| `/rca` | Root Cause Analysis template |
| `/help` | Open help drawer |
| `/[name]` | Any user-saved custom template |

### Table Navigation

| Key | Action |
|---|---|
| `Arrow Left/Right` | Move between cells |
| `Arrow Up/Down` | Move between rows; exits table at edges |
| `Tab / Shift+Tab` | Next / previous cell |
| `Shift + Up/Down` | Add / remove a table row |
| `Shift + Left/Right` | Add / remove a table column |

---

## Technical Notes

- **React.memo** with a custom comparator is used on `RowRenderer` to prevent unnecessary re-renders — only the active row and multi-selected rows re-render on selection changes.
- **`useLayoutEffect`** is used for cursor focus management to avoid browser layout race conditions between React's render cycle and DOM focus.
- Math evaluation is sandboxed by stripping all non-mathematical characters before passing to `new Function()`.
