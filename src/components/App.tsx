/**
 * App.tsx — Root editor component.
 *
 * Orchestrates the full document: renders rows, handles all keyboard
 * interactions (slash menu, block selection, table navigation, shortcuts),
 * and owns the selection context menu and help modal overlay.
 */
import React, { useEffect, useRef } from 'react';
import { useEditorState } from '../state/useEditorState';
import { RowRenderer } from './RowRenderer';
import { createRow, getWordBlockAtCursor, replaceWordBlocks } from '../utils/model';
import { SlashMenu, getCommands } from './SlashMenu';
import { HelpModal } from './HelpModal';

export const App = () => {
  const [state, dispatch] = useEditorState();
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const [cursorToRestore, setCursorToRestore] = React.useState<{id: string, pos: number} | null>(null);

  useEffect(() => {
    if (cursorToRestore) {
      // Need a tiny delay in React 18 for controlled input value to fully sync before setting range
      setTimeout(() => {
        const el = document.getElementById(`input-${cursorToRestore.id}`) as HTMLInputElement;
        if (el) {
          el.focus();
          el.setSelectionRange(cursorToRestore.pos, cursorToRestore.pos);
        }
      }, 10);
      setCursorToRestore(null);
    }
  }, [cursorToRestore]);

  useEffect(() => {
    try {
      const templates = JSON.parse(localStorage.getItem('litedoc_templates') || '[]');
      const filtered = templates.filter((t: any) => t.name !== 'bfjsbjf' && t.name !== 'bsfebf' && t.name !== 'strategy');
      if (filtered.length !== templates.length) {
        localStorage.setItem('litedoc_templates', JSON.stringify(filtered));
      }
    } catch(e) {}

    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light-mode');
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (document.body.classList.contains('light-mode')) {
          document.body.classList.remove('light-mode');
          localStorage.setItem('theme', 'dark');
        } else {
          document.body.classList.add('light-mode');
          localStorage.setItem('theme', 'light');
        }
      }
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        dispatch({ type: 'SET_JUMP_TO_ROW', payload: { isOpen: true } });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
        dispatch({ type: 'CLOSE_SLASH_MENU' });
        dispatch({ type: 'SET_JUMP_TO_ROW', payload: { isOpen: false } });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [dispatch]);

  // Focus jump input when it opens
  useEffect(() => {
    if (state.jumpToRowState.isOpen && jumpInputRef.current) {
      jumpInputRef.current.focus();
    }
  }, [state.jumpToRowState.isOpen]);

  const handleRowChange = (id: string, newContent: string) => {
    dispatch({ type: 'UPDATE_ROW', payload: { id, content: newContent } });
    
    // Slash menu trigger
    const match = newContent.match(/(?:^|\s)\/([a-z]*)$/);
    if (match) {
      dispatch({ type: 'OPEN_SLASH_MENU', payload: { rowId: id, filter: match[1] } });
    } else if (state.slashMenuState.isOpen) {
      dispatch({ type: 'CLOSE_SLASH_MENU' });
    }
  };

  const handleRowFocus = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_ROW', payload: { id } });
  };

  const executeSlashCommand = (cmdId: string, rowId: string) => {
    const row = state.rows.find(r => r.id === rowId);
    if (!row) return;

    // Remove the "/cmd" text
    const newContent = row.content.replace(/(?:^|\s)\/[a-z]*$/, '');
    dispatch({ type: 'UPDATE_ROW', payload: { id: rowId, content: newContent } });
    dispatch({ type: 'CLOSE_SLASH_MENU' });

    if (cmdId === 'help') {
      dispatch({ type: 'SET_HELP_OPEN', payload: { isOpen: true } });
    } else if (cmdId === 'bullet' || cmdId === 'table' || cmdId === 'math') {
      dispatch({ type: 'CHANGE_ROW_TYPE', payload: { id: rowId, type: cmdId } });
    } else if (cmdId === 'design') {
      const t1 = createRow('table', '', row.indentLevel);
      t1.tableData = [['Pain points', 'Priority'], ['', '']];
      
      const t2 = createRow('table', '', row.indentLevel);
      t2.tableData = [['Solution', 'Priority'], ['', '']];

      const templateRows = [
        createRow('bullet', 'Problem statement', row.indentLevel),
        createRow('bullet', 'Clarification', row.indentLevel, undefined, '(think about purpose, goal, scale, platform, alternatives, constraints)'),
        createRow('bullet', 'Objective', row.indentLevel),
        createRow('bullet', 'User segments', row.indentLevel),
        t1,
        t2,
        createRow('bullet', 'Metrics', row.indentLevel, undefined, '(think about a NSM & 2-3 L2 metrics)'),
      ];
      if (newContent.trim() === '') {
        dispatch({ type: 'REPLACE_ROW_WITH_MULTIPLE', payload: { id: rowId, newRows: templateRows } });
      } else {
        dispatch({ type: 'INSERT_MULTIPLE_ROWS', payload: { afterId: rowId, newRows: templateRows } });
      }
    } else if (cmdId === 'rca') {
      const templateRows = [
        createRow('bullet', 'Problem statement', row.indentLevel),
        createRow('bullet', 'Clarifying questions', row.indentLevel),
        createRow('bullet', 'External issues', row.indentLevel),
        createRow('bullet', 'Product issues', row.indentLevel),
      ];
      if (newContent.trim() === '') {
        dispatch({ type: 'REPLACE_ROW_WITH_MULTIPLE', payload: { id: rowId, newRows: templateRows } });
      } else {
        dispatch({ type: 'INSERT_MULTIPLE_ROWS', payload: { afterId: rowId, newRows: templateRows } });
      }
    } else if (cmdId === 'strategy') {
      const templateRows = [
        createRow('bullet', 'Clarification', row.indentLevel, undefined, '(think about objective, users, competitors, product details, value prop)'),
        createRow('bullet', 'Vision', row.indentLevel, undefined, '(what do you want the product to be in long term)'),
        createRow('bullet', 'Pillars', row.indentLevel, undefined, '(prioritzed list of initiatives to achieve goal/s)'),
        createRow('bullet', 'Metrics', row.indentLevel, undefined, '(NSM & 2-3 L2 metrics)'),
      ];
      if (newContent.trim() === '') {
        dispatch({ type: 'REPLACE_ROW_WITH_MULTIPLE', payload: { id: rowId, newRows: templateRows } });
      } else {
        dispatch({ type: 'INSERT_MULTIPLE_ROWS', payload: { afterId: rowId, newRows: templateRows } });
      }
    } else {
      // Custom Template Execution
      const customTemplates = JSON.parse(localStorage.getItem('litedoc_templates') || '[]');
      const t = customTemplates.find((temp: any) => temp.name === cmdId);
      if (t && Array.isArray(t.rows)) {
        const templateRows = t.rows.map((r: any) => ({ ...r, id: Math.random().toString(36).substr(2, 9), indentLevel: row.indentLevel }));
        if (newContent.trim() === '') {
          dispatch({ type: 'REPLACE_ROW_WITH_MULTIPLE', payload: { id: rowId, newRows: templateRows } });
        } else {
          dispatch({ type: 'INSERT_MULTIPLE_ROWS', payload: { afterId: rowId, newRows: templateRows } });
        }
      }
    }
  };

  const handleCellChange = (id: string, r: number, c: number, newContent: string) => {
    dispatch({ type: 'UPDATE_TABLE_CELL', payload: { id, r, c, content: newContent } });
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string, r: number, c: number, cursorPosition: number) => {
    const row = state.rows.find(row => row.id === id);
    if (!row || !row.tableData) return;

    if (e.shiftKey) {
       if (e.key === 'ArrowDown') { e.preventDefault(); dispatch({ type: 'RESIZE_TABLE', payload: { id, rDelta: 1, cDelta: 0 } }); return; }
       if (e.key === 'ArrowUp') { e.preventDefault(); dispatch({ type: 'RESIZE_TABLE', payload: { id, rDelta: -1, cDelta: 0 } }); return; }
       if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'RESIZE_TABLE', payload: { id, rDelta: 0, cDelta: 1 } }); return; }
       if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'RESIZE_TABLE', payload: { id, rDelta: 0, cDelta: -1 } }); return; }
    }

    if (e.key === 'ArrowUp') {
       e.preventDefault();
       if (r > 0) {
         dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r: r - 1, c } });
       } else {
         dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: -1 } });
       }
       return;
    }
    if (e.key === 'ArrowDown') {
       e.preventDefault();
       if (r < row.tableData.length - 1) {
         dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r: r + 1, c } });
       } else {
         const idx = state.rows.findIndex(r => r.id === id);
         if (idx === state.rows.length - 1) {
           dispatch({ type: 'INSERT_ROW', payload: { afterId: id, row: createRow('text', '', row.indentLevel) } });
         } else {
           dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: 1 } });
         }
       }
       return;
    }

    if (e.key === 'ArrowLeft' && cursorPosition === 0 && !e.shiftKey) {
       e.preventDefault();
       if (c > 0) {
         dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r, c: c - 1 } });
       } else if (r > 0) {
         dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r: r - 1, c: row.tableData[0].length - 1 } });
       } else {
         dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: -1 } });
       }
       return;
    }

    if (e.key === 'ArrowRight' && cursorPosition === row.tableData[r][c].length && !e.shiftKey) {
       e.preventDefault();
       if (c < row.tableData[0].length - 1) {
         dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r, c: c + 1 } });
       } else if (r < row.tableData.length - 1) {
         dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r: r + 1, c: 0 } });
       } else {
         const idx = state.rows.findIndex(r => r.id === id);
         if (idx === state.rows.length - 1) {
           dispatch({ type: 'INSERT_ROW', payload: { afterId: id, row: createRow('text', '', row.indentLevel) } });
         } else {
           dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: 1 } });
         }
       }
       return;
    }
    
    // Tab behavior to move between cells
    if (e.key === 'Tab') {
       e.preventDefault();
       if (!e.shiftKey) {
          if (c < row.tableData[0].length - 1) {
            dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r, c: c + 1 } });
          } else if (r < row.tableData.length - 1) {
            dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r: r + 1, c: 0 } });
          } else {
             const idx = state.rows.findIndex(r => r.id === id);
             if (idx === state.rows.length - 1) {
               dispatch({ type: 'INSERT_ROW', payload: { afterId: id, row: createRow('text', '', row.indentLevel) } });
             } else {
               dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: 1 } });
             }
          }
       } else {
          if (c > 0) {
            dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r, c: c - 1 } });
          } else if (r > 0) {
            dispatch({ type: 'SET_ACTIVE_TABLE_CELL', payload: { r: r - 1, c: row.tableData[0].length - 1 } });
          } else {
            dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: -1 } });
          }
       }
       return;
    }
  };

  const handleCellFocus = (id: string, r: number, c: number) => {
    if (state.activeRowId !== id || state.activeTableCell?.r !== r || state.activeTableCell?.c !== c) {
      dispatch({ type: 'SET_ACTIVE_ROW', payload: { id, cell: { r, c } } });
    }
  };

  const copyRowsToMarkdown = () => {
    const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
    const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
    if (anchorIdx !== -1 && focusIdx !== -1) {
      const minIdx = Math.min(anchorIdx, focusIdx);
      const maxIdx = Math.max(anchorIdx, focusIdx);
      const selectedRows = state.rows.slice(minIdx, maxIdx + 1);
      let md = '';
      for (const r of selectedRows) {
         if (r.type === 'text') md += r.content + '\n';
         else if (r.type === 'bullet') md += '- ' + r.content + '\n';
         else if (r.type === 'math') md += '$$ ' + r.content + ' $$\n';
         else if (r.type === 'table' && r.tableData) {
            r.tableData.forEach((row, i) => {
               md += '| ' + row.join(' | ') + ' |\n';
               if (i === 0) md += '|' + row.map(() => '---').join('|') + '|\n';
            });
         }
      }
      navigator.clipboard.writeText(md.trim());
      dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLElement>, id: string, cursorPosition: number) => {
    // Slash menu navigation
    if (state.slashMenuState.isOpen && state.slashMenuState.rowId === id) {
      const filtered = getCommands().filter(c => c.id.startsWith(state.slashMenuState.filter.toLowerCase()));
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = state.slashMenuState.selectedIndex > 0 ? state.slashMenuState.selectedIndex - 1 : filtered.length - 1;
        dispatch({ type: 'SLASH_MENU_NAVIGATE', payload: { index: next } });
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = state.slashMenuState.selectedIndex < filtered.length - 1 ? state.slashMenuState.selectedIndex + 1 : 0;
        dispatch({ type: 'SLASH_MENU_NAVIGATE', payload: { index: next } });
        return;
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        executeSlashCommand(filtered[state.slashMenuState.selectedIndex].id, id);
        return;
      }
    }

    // Replace block selection on typing
    if (state.selection.active && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      
      // Selection Menu Shortcuts
      if (state.selectionMenu.isOpen && state.selectionMenu.step === 'main') {
        if (e.key === 's') {
          dispatch({ type: 'SET_SELECTION_MENU', payload: { step: 'save_template' } });
          return;
        } else if (e.key === 'c') {
          copyRowsToMarkdown();
          return;
        } else if (e.key === 'd') {
          const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
          const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
          if (anchorIdx !== -1 && focusIdx !== -1) {
            dispatch({ type: 'DELETE_MULTIPLE_ROWS', payload: { minIdx: Math.min(anchorIdx, focusIdx), maxIdx: Math.max(anchorIdx, focusIdx) } });
          } else {
             // Single row block selection fallback
             if (state.selection.anchorRowId && state.selection.anchorBlockIndex !== null && state.selection.focusBlockIndex !== null) {
               const row = state.rows.find(r => r.id === state.selection.anchorRowId);
               if (row) {
                 const [newContent] = replaceWordBlocks(row.content, state.selection.anchorBlockIndex, state.selection.focusBlockIndex, '');
                 dispatch({ type: 'UPDATE_ROW', payload: { id: row.id, content: newContent.replace(/\s+/g, ' ').trim() } });
                 dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
               }
             }
          }
          return;
        }
      }

      if (state.selection.anchorRowId !== state.selection.focusRowId) {
        // Multi-row selection natively ignores other typing since we disabled it per user request for d/s only
        return;
      }
      const row = state.rows.find(r => r.id === id);
      if (row && state.selection.anchorBlockIndex !== null && state.selection.focusBlockIndex !== null) {
        const [newContent, newCursorPos] = replaceWordBlocks(row.content, state.selection.anchorBlockIndex, state.selection.focusBlockIndex, e.key);
        dispatch({ type: 'UPDATE_ROW', payload: { id, content: newContent } });
        dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
        setCursorToRestore({ id, pos: newCursorPos });
      }
      return;
    }

    // Backspace: delete selection or merge rows
    if (e.key === 'Backspace' && !e.ctrlKey) {
      if (state.selection.active) {
        e.preventDefault();
        if (state.selection.anchorRowId !== state.selection.focusRowId) {
           // Disabled per user request: multi-row deletion via backspace is replaced by the floating context menu 'd' key.
           return;
        }

        const row = state.rows.find(r => r.id === id);
        if (row && state.selection.anchorBlockIndex !== null && state.selection.focusBlockIndex !== null) {
          const [newContent] = replaceWordBlocks(row.content, state.selection.anchorBlockIndex, state.selection.focusBlockIndex, '');
          dispatch({ type: 'UPDATE_ROW', payload: { id, content: newContent.replace(/\s+/g, ' ').trim() } });
          dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
        }
        return;
      } else if (cursorPosition === 0) {
        e.preventDefault();
        const currentIndex = state.rows.findIndex(r => r.id === id);
        if (currentIndex === -1) return;
        
        const currentRow = state.rows[currentIndex];
        // If it's a special block (math, bullet, table), Backspace at start reverts it to text
        if (currentRow.type !== 'text') {
          dispatch({ type: 'CHANGE_ROW_TYPE', payload: { id, type: 'text' } });
          return;
        }
        
        if (currentIndex > 0) {
          const prevRow = state.rows[currentIndex - 1];
          dispatch({ type: 'UPDATE_ROW', payload: { id: prevRow.id, content: prevRow.content + currentRow.content } });
          dispatch({ type: 'DELETE_ROW', payload: { id: currentRow.id } });
          dispatch({ type: 'SET_ACTIVE_ROW', payload: { id: prevRow.id } });
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentRow = state.rows.find(r => r.id === id);
      const newType = currentRow?.type === 'bullet' ? 'bullet' : 'text';
      dispatch({ type: 'INSERT_ROW', payload: { afterId: id, row: createRow(newType, '', currentRow?.indentLevel || 0) } });
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      dispatch({ type: 'INDENT_ROW', payload: { id, delta: e.shiftKey ? -1 : 1 } });
      return;
    }

    if (e.key === 'ArrowUp' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: -1 } });
      return;
    }
    if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const idx = state.rows.findIndex(r => r.id === id);
      if (idx === state.rows.length - 1) {
        dispatch({ type: 'INSERT_ROW', payload: { afterId: id, row: createRow() } });
      } else {
        dispatch({ type: 'MOVE_ACTIVE_ROW', payload: { delta: 1 } });
      }
      return;
    }

    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const row = state.rows.find(r => r.id === id);
      if (!row) return;

      const isLeft = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      const isRight = e.key === 'ArrowRight' || e.key === 'ArrowDown';

      if (!state.selection.active) {
        if (isRight && cursorPosition === row.content.length) {
          const currentRowIndex = state.rows.findIndex(r => r.id === id);
          if (currentRowIndex < state.rows.length - 1) {
            const nextRow = state.rows[currentRowIndex + 1];
            dispatch({ type: 'SET_SELECTION', payload: { active: true, anchorRowId: nextRow.id, anchorBlockIndex: 0, focusRowId: nextRow.id, focusBlockIndex: 0 } });
          }
          return;
        }
        if (isLeft && cursorPosition === 0) {
          const currentRowIndex = state.rows.findIndex(r => r.id === id);
          if (currentRowIndex > 0) {
            const prevRow = state.rows[currentRowIndex - 1];
            const lastBlockIndex = Math.max(0, prevRow.content.split(' ').length - 1);
            dispatch({ type: 'SET_SELECTION', payload: { active: true, anchorRowId: prevRow.id, anchorBlockIndex: lastBlockIndex, focusRowId: prevRow.id, focusBlockIndex: lastBlockIndex } });
          }
          return;
        }

        let targetBlock = getWordBlockAtCursor(row.content, cursorPosition);
        
        // If cursor is at a space, pushing right selects the next block, pushing left selects the previous
        if (isRight && cursorPosition < row.content.length && row.content[cursorPosition] === ' ') {
           targetBlock += 1;
        } else if (isLeft && cursorPosition > 0 && row.content[cursorPosition - 1] === ' ') {
           targetBlock -= 1;
        }
        
        targetBlock = Math.max(0, Math.min(row.content.split(' ').length - 1, targetBlock));
        
        dispatch({ type: 'SET_SELECTION', payload: { active: true, anchorRowId: id, anchorBlockIndex: targetBlock, focusRowId: id, focusBlockIndex: targetBlock } });
      } else {
        const currentRowIndex = state.rows.findIndex(r => r.id === state.selection.focusRowId);
        const focusRow = state.rows[currentRowIndex];
        if (!focusRow) return;

        const blocksCount = focusRow.content.split(' ').length;
        let newFocus = state.selection.focusBlockIndex ?? 0;
        let newFocusRowId = state.selection.focusRowId;

        if (isLeft) {
          if (newFocus > 0) {
            newFocus -= 1;
          } else if (currentRowIndex > 0) {
             const prevRow = state.rows[currentRowIndex - 1];
             newFocusRowId = prevRow.id;
             newFocus = Math.max(0, prevRow.content.split(' ').length - 1);
          }
        } else if (isRight) {
          if (newFocus < blocksCount - 1) {
            newFocus += 1;
          } else if (currentRowIndex < state.rows.length - 1) {
             const nextRow = state.rows[currentRowIndex + 1];
             newFocusRowId = nextRow.id;
             newFocus = 0;
          }
        }
        dispatch({ type: 'SET_SELECTION', payload: { ...state.selection, focusRowId: newFocusRowId, focusBlockIndex: newFocus } });
      }
      return;
    }

    if (!e.shiftKey && !e.altKey && !e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      if (state.selection.active) {
        e.preventDefault();
        const row = state.rows.find(r => r.id === id);
        if (!row) return;
        const blocksCount = row.content.split(' ').length;
        let currentIdx = state.selection.focusBlockIndex ?? 0;
        
        if (e.key === 'ArrowLeft') currentIdx = Math.max(0, currentIdx - 1);
        if (e.key === 'ArrowRight') currentIdx = Math.min(blocksCount - 1, currentIdx + 1);
        
        dispatch({ type: 'SET_SELECTION', payload: { active: true, anchorRowId: id, anchorBlockIndex: currentIdx, focusRowId: id, focusBlockIndex: currentIdx } });
        return;
      }
      // If not in block selection, let native input handle it
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const row = state.rows.find(r => r.id === id);
      if (!row) return;
      const blocksCount = row.content.split(' ').length;
      
      const anchorBlock = state.selection.anchorBlockIndex || 0;
      const focusBlock = state.selection.focusBlockIndex || 0;
      
      const isFullySelected = state.selection.active && 
                              state.selection.anchorRowId === id && 
                              state.selection.focusRowId === id &&
                              Math.min(anchorBlock, focusBlock) === 0 &&
                              Math.max(anchorBlock, focusBlock) === blocksCount - 1;
                              

      if (isFullySelected && state.rows.length > 1) {
        // Select all rows
        const firstRow = state.rows[0];
        const lastRow = state.rows[state.rows.length - 1];
        dispatch({ type: 'SET_SELECTION', payload: { 
          active: true, 
          anchorRowId: firstRow.id, 
          anchorBlockIndex: 0, 
          focusRowId: lastRow.id, 
          focusBlockIndex: lastRow.content.split(' ').length - 1 
        }});
      } else if (blocksCount > 0) {
        dispatch({ type: 'SET_SELECTION', payload: { active: true, anchorRowId: id, anchorBlockIndex: 0, focusRowId: id, focusBlockIndex: blocksCount - 1 } });
      }
      return;
    }

    if (e.ctrlKey && e.key === 'Backspace') {
      e.preventDefault();
      dispatch({ type: 'DELETE_ROW', payload: { id } });
      return;
    }
  };



  return (
    <div className="editor-container">
      {state.selectionMenu.isOpen && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-color)', border: '1px solid var(--text-muted)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', zIndex: 1000, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {state.selectionMenu.step === 'main' ? (
            <>
              <button 
                onClick={() => dispatch({ type: 'SET_SELECTION_MENU', payload: { step: 'save_template' } })}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                  </svg>
                  <span style={{ transform: 'translateY(5%)' }}>Save as command</span>
                </div>
                <span style={{ opacity: 0.8, transform: 'translateY(10%)' }}>S</span>
              </button>
              <div style={{ width: '1px', height: '1.5rem', background: 'var(--text-muted)', opacity: 0.3 }} />
              <button 
                onClick={copyRowsToMarkdown}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span style={{ transform: 'translateY(5%)' }}>Copy as markdown</span>
                </div>
                <span style={{ opacity: 0.8, transform: 'translateY(10%)' }}>C</span>
              </button>
              <div style={{ width: '1px', height: '1.5rem', background: 'var(--text-muted)', opacity: 0.3 }} />
              <button 
                onClick={() => {
                  const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
                  const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
                  if (anchorIdx !== -1 && focusIdx !== -1) {
                     dispatch({ type: 'DELETE_MULTIPLE_ROWS', payload: { minIdx: Math.min(anchorIdx, focusIdx), maxIdx: Math.max(anchorIdx, focusIdx) } });
                  } else {
                     // Single row block selection fallback
                     if (state.selection.anchorRowId && state.selection.anchorBlockIndex !== null && state.selection.focusBlockIndex !== null) {
                       const row = state.rows.find(r => r.id === state.selection.anchorRowId);
                       if (row) {
                         const [newContent] = replaceWordBlocks(row.content, state.selection.anchorBlockIndex, state.selection.focusBlockIndex, '');
                         dispatch({ type: 'UPDATE_ROW', payload: { id: row.id, content: newContent.replace(/\s+/g, ' ').trim() } });
                         dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
                       }
                     }
                  }
                }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span style={{ transform: 'translateY(5%)' }}>Delete</span>
                </div>
                <span style={{ opacity: 0.8, transform: 'translateY(10%)' }}>D</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <input 
                id="save-command-input"
                autoFocus
                placeholder="command_name(<10 chars)"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none', flexGrow: 1, minWidth: '180px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const elName = document.getElementById('save-command-input') as HTMLInputElement;
                    const elDesc = document.getElementById('save-command-desc') as HTMLInputElement;
                    const templateName = elName?.value.trim();
                    const templateDesc = elDesc?.value.trim();
                    if (templateName) {
                      const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
                      const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
                      if (anchorIdx !== -1 && focusIdx !== -1) {
                        const minIdx = Math.min(anchorIdx, focusIdx);
                        const maxIdx = Math.max(anchorIdx, focusIdx);
                        const selectedRows = state.rows.slice(minIdx, maxIdx + 1);
                        const existing = JSON.parse(localStorage.getItem('litedoc_templates') || '[]');
                        existing.push({ name: templateName, description: templateDesc, rows: selectedRows });
                        localStorage.setItem('litedoc_templates', JSON.stringify(existing));
                      }
                      dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
                    }
                  } else if (e.key === 'Escape') {
                    dispatch({ type: 'SET_SELECTION_MENU', payload: { step: 'main' } });
                  }
                }}
              />
              <div style={{ width: '1px', height: '1.2rem', background: 'var(--text-muted)', opacity: 0.3, margin: '0 4px' }} />
              <input
                id="save-command-desc"
                placeholder="description(<20 chars)"
                maxLength={20}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', outline: 'none', flexGrow: 2, fontSize: '0.9em', minWidth: '180px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const elName = document.getElementById('save-command-input') as HTMLInputElement;
                    const elDesc = document.getElementById('save-command-desc') as HTMLInputElement;
                    const templateName = elName?.value.trim();
                    const templateDesc = elDesc?.value.trim();
                    if (templateName) {
                      const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
                      const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
                      if (anchorIdx !== -1 && focusIdx !== -1) {
                        const minIdx = Math.min(anchorIdx, focusIdx);
                        const maxIdx = Math.max(anchorIdx, focusIdx);
                        const selectedRows = state.rows.slice(minIdx, maxIdx + 1);
                        const existing = JSON.parse(localStorage.getItem('litedoc_templates') || '[]');
                        existing.push({ name: templateName, description: templateDesc, rows: selectedRows });
                        localStorage.setItem('litedoc_templates', JSON.stringify(existing));
                      }
                      dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
                    }
                  } else if (e.key === 'Escape') {
                    dispatch({ type: 'SET_SELECTION_MENU', payload: { step: 'main' } });
                  }
                }}
              />
              <button 
                onClick={() => {
                  const elName = document.getElementById('save-command-input') as HTMLInputElement;
                  const elDesc = document.getElementById('save-command-desc') as HTMLInputElement;
                  const templateName = elName?.value.trim();
                  const templateDesc = elDesc?.value.trim();
                  if (templateName) {
                    const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
                    const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
                    if (anchorIdx !== -1 && focusIdx !== -1) {
                      const minIdx = Math.min(anchorIdx, focusIdx);
                      const maxIdx = Math.max(anchorIdx, focusIdx);
                      const selectedRows = state.rows.slice(minIdx, maxIdx + 1);
                      const existing = JSON.parse(localStorage.getItem('litedoc_templates') || '[]');
                      existing.push({ name: templateName, description: templateDesc, rows: selectedRows });
                      localStorage.setItem('litedoc_templates', JSON.stringify(existing));
                    }
                    dispatch({ type: 'SET_SELECTION', payload: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null } });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', background: 'var(--selection-bg)', 
                  border: '1px solid var(--border-color)', borderRadius: '4px', 
                  fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>↵</span> Enter
              </button>
            </div>
          )}
        </div>
      )}

      {state.jumpToRowState.isOpen && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-color)', border: '1px solid var(--text-muted)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1rem', borderRadius: '8px', zIndex: 1000 }}>
          <input
            ref={jumpInputRef}
            type="number"
            min={1}
            max={state.rows.length}
            placeholder="Row #"
            style={{ width: '80px', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-color)', padding: '4px', borderRadius: '4px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const rowNum = parseInt(e.currentTarget.value, 10);
                if (!isNaN(rowNum) && rowNum > 0 && rowNum <= state.rows.length) {
                  const row = state.rows[rowNum - 1];
                  dispatch({ type: 'SET_ACTIVE_ROW', payload: { id: row.id } });
                  const blocksCount = row.content.split(' ').length;
                  if (blocksCount > 0) {
                    dispatch({ type: 'SET_SELECTION', payload: { active: true, anchorRowId: row.id, anchorBlockIndex: 0, focusRowId: row.id, focusBlockIndex: 0 } });
                  }
                }
                dispatch({ type: 'SET_JUMP_TO_ROW', payload: { isOpen: false } });
              }
            }}
          />
        </div>
      )}

      {state.rows.map((row, index) => {
        const isActive = state.activeRowId === row.id;
        const placeholder = (index === 0 && row.content === '' && state.rows.length === 1)
          ? "Write what you want, view commands with '/', get help with '/help'"
          : (isActive ? "..." : "");

        let isMultiSelected = false;
        if (state.selection.active && state.selection.anchorRowId !== state.selection.focusRowId) {
          const anchorIdx = state.rows.findIndex(r => r.id === state.selection.anchorRowId);
          const focusIdx = state.rows.findIndex(r => r.id === state.selection.focusRowId);
          if (anchorIdx !== -1 && focusIdx !== -1) {
            const minIdx = Math.min(anchorIdx, focusIdx);
            const maxIdx = Math.max(anchorIdx, focusIdx);
            if (index >= minIdx && index <= maxIdx) {
              isMultiSelected = true;
            }
          }
        }

        return (
          <div key={row.id} style={{ position: 'relative' }}>
            <RowRenderer
              row={row}
              index={index}
              isActive={isActive}
              isMultiSelected={isMultiSelected}
              selection={state.selection}
              onChange={handleRowChange}
              onKeyDown={handleRowKeyDown}
              onFocus={handleRowFocus}
              placeholder={placeholder}
              activeTableCell={state.activeTableCell}
              slashMenuState={isActive ? state.slashMenuState : undefined}
              onCellChange={handleCellChange}
              onCellKeyDown={handleCellKeyDown}
              onCellFocus={handleCellFocus}
            />
            {state.slashMenuState.isOpen && state.slashMenuState.rowId === row.id && (
              <SlashMenu
                isOpen={state.slashMenuState.isOpen}
                filter={state.slashMenuState.filter}
                selectedIndex={state.slashMenuState.selectedIndex}
                onSelect={(cmd) => executeSlashCommand(cmd, row.id)}
              />
            )}
          </div>
        );
      })}
      
      {/* Help Floating Button */}
      {!state.isHelpOpen && (
        <button
          onClick={() => dispatch({ type: 'SET_HELP_OPEN', payload: { isOpen: true } })}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--accent-color)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        title="Help & Documentation"
      >
        ?
      </button>
      )}

      {/* Help Modal Left Drawer */}
      <HelpModal 
        isOpen={state.isHelpOpen} 
        onClose={() => dispatch({ type: 'SET_HELP_OPEN', payload: { isOpen: false } })} 
      />
    </div>
  );
};
