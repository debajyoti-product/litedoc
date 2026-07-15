# LiteDoc

> A fast, keyboard-first, block-based document editor — built in the browser, stored locally.
> 
> **Try it live:** [https://litedoc-new.vercel.app/](https://litedoc-new.vercel.app/)

---

## Why LiteDoc?

Most editors are either too heavy (Notion requires an account and a network) or too plain (standard textareas have no structure). LiteDoc lives entirely in your browser with zero backend, persists everything to `localStorage`, and gives you structured blocks — text, bullets, tables, and live math — with a minimal but powerful keyboard interface.

---

## Screenshot

> _TODO: Add a screenshot or GIF here showing the editor in action._

---

## Keyboard Shortcuts

### Navigation
| Shortcut | Action |
|---|---|
| `Arrow Up / Down` | Move between rows |
| `Tab / Shift+Tab` | Indent / un-indent a row |
| `Enter` | New row (continues bullet type automatically) |
| `Backspace` at row start | Revert block type → text, or merge with row above |
| `Ctrl + G` | Jump to row by number |
| `Ctrl + L` | Toggle dark / light mode |

### Slash Commands
Type `/` in any row to open the command palette.

| Command | Action |
|---|---|
| `/bullet` | Convert to bullet list |
| `/table` | Insert a 2×2 table |
| `/math` | Insert a live math block |
| `/design` | Insert Product Design template |
| `/rca` | Insert Root Cause Analysis template |
| `/help` | Open the in-app help reference |

### Block Selection
| Shortcut | Action |
|---|---|
| `Shift + Left` / `Shift + Up` | Select one word block to the left |
| `Shift + Right` / `Shift + Down` | Select one word block to the right |
| `Ctrl + A` | Select all blocks in current row |
| `Ctrl + A` (twice) | Select all rows |
| `S` (with selection) | Save selection as a custom command |
| `C` (with selection) | Copy selection as Markdown |
| `D` (with selection) | Delete selection |

### Table Interactions
| Shortcut | Action |
|---|---|
| `Arrow Left/Right` | Move between cells |
| `Tab / Shift+Tab` | Next / previous cell |
| `Shift + Arrow Up/Down` | Add / remove a row |
| `Shift + Arrow Left/Right` | Add / remove a column |

### Math Block
The `/math` block evaluates arithmetic in real-time using a custom shorthand:

| Suffix | Value |
|---|---|
| `k` | × 1,000 |
| `l` | × 1,00,000 (Lakh) |
| `mn` | × 1,000,000 |
| `bn` | × 1,000,000,000 |

Use `d` as an alias for `/` (division). Example: `10mn d 2` → `= 5,000,000`

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for a full description of the state engine, component structure, and feature reference.

---

## License

MIT © Debajyoti
