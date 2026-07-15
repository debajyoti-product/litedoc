/**
 * useEditorState.ts — Core state engine.
 *
 * Provides the single source of truth for all editor state (rows, selection,
 * slash menu, table cells, help modal). Exposes a dispatch function with
 * action-based updates. Persists rows to localStorage on change and on
 * page unload.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { EditorState } from '../types';
import { createRow } from '../utils/model';

const STORAGE_KEY = 'litedoc-state';

export interface ExtendedEditorState extends EditorState {
  jumpToRowState: { isOpen: boolean };
  selectionMenu: { isOpen: boolean, step: 'main' | 'save_template' };
  isHelpOpen: boolean;
}

type HistorySnapshot = Pick<ExtendedEditorState, 'rows' | 'activeRowId' | 'selection' | 'activeTableCell'>;

const getInitialState = (): ExtendedEditorState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const rows = JSON.parse(saved);
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          rows,
          activeRowId: rows[0].id,
          selection: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null },
          slashMenuState: { isOpen: false, rowId: null, filter: '', selectedIndex: 0 },
          jumpToRowState: { isOpen: false },
          activeTableCell: null,
          selectionMenu: { isOpen: false, step: 'main' },
          isHelpOpen: false
        };
      }
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  const initialRow = createRow();
  return {
    rows: [initialRow],
    activeRowId: initialRow.id,
    selection: { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null },
    slashMenuState: { isOpen: false, rowId: null, filter: '', selectedIndex: 0 },
    jumpToRowState: { isOpen: false },
    activeTableCell: null,
    selectionMenu: { isOpen: false, step: 'main' },
    isHelpOpen: false
  };
};

export const useEditorState = () => {
  const [state, setState] = useState<ExtendedEditorState>(getInitialState);
  const historyRef = useRef<{ past: HistorySnapshot[], future: HistorySnapshot[], lastSavedTextTime: number }>({
    past: [],
    future: [],
    lastSavedTextTime: 0
  });
  
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows));
    }, 400); 
    return () => clearTimeout(timer);
  }, [state.rows]);
  
  useEffect(() => {
    const flushSave = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows));
    };
    window.addEventListener('beforeunload', flushSave);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushSave();
    });
    return () => {
      window.removeEventListener('beforeunload', flushSave);
      window.removeEventListener('visibilitychange', flushSave);
    };
  }, [state.rows]);

  const dispatch = useCallback((action: any) => {
    setState(prev => {
      let newState = { ...prev };
      
      const recordHistory = (debounceText = false) => {
        const now = Date.now();
        if (debounceText) {
          if (now - historyRef.current.lastSavedTextTime < 1000) {
            historyRef.current.lastSavedTextTime = now;
            return;
          }
          historyRef.current.lastSavedTextTime = now;
        }
        
        historyRef.current.past.push({
          rows: JSON.parse(JSON.stringify(prev.rows)),
          activeRowId: prev.activeRowId,
          selection: JSON.parse(JSON.stringify(prev.selection)),
          activeTableCell: prev.activeTableCell ? { ...prev.activeTableCell } : null
        });
        if (historyRef.current.past.length > 100) {
          historyRef.current.past.shift();
        }
        historyRef.current.future = [];
      };

      switch (action.type) {
        case 'UNDO': {
          if (historyRef.current.past.length > 0) {
            const previous = historyRef.current.past.pop()!;
            historyRef.current.future.push({
              rows: JSON.parse(JSON.stringify(prev.rows)),
              activeRowId: prev.activeRowId,
              selection: JSON.parse(JSON.stringify(prev.selection)),
              activeTableCell: prev.activeTableCell ? { ...prev.activeTableCell } : null
            });
            newState = { ...newState, ...previous };
          }
          break;
        }
        case 'REDO': {
          if (historyRef.current.future.length > 0) {
            const next = historyRef.current.future.pop()!;
            historyRef.current.past.push({
              rows: JSON.parse(JSON.stringify(prev.rows)),
              activeRowId: prev.activeRowId,
              selection: JSON.parse(JSON.stringify(prev.selection)),
              activeTableCell: prev.activeTableCell ? { ...prev.activeTableCell } : null
            });
            newState = { ...newState, ...next };
          }
          break;
        }
        case 'UPDATE_ROW': {
          recordHistory(true);
          const { id, content } = action.payload;
          newState.rows = prev.rows.map(r => r.id === id ? { ...r, content } : r);
          break;
        }
        case 'UPDATE_TABLE_CELL': {
          recordHistory(true);
          const { id, r, c, content } = action.payload;
          newState.rows = prev.rows.map(row => {
            if (row.id === id && row.tableData) {
              const newData = row.tableData.map(tr => [...tr]);
              if (newData[r] && newData[r][c] !== undefined) {
                newData[r][c] = content;
              }
              return { ...row, tableData: newData };
            }
            return row;
          });
          break;
        }
        case 'RESIZE_TABLE': {
          recordHistory(false);
          const { id, rDelta, cDelta } = action.payload;
          newState.rows = prev.rows.map(row => {
            if (row.id === id && row.tableData) {
              let newData = row.tableData.map(tr => [...tr]);
              
              if (rDelta > 0) {
                // Add row at bottom
                const emptyRow = Array(newData[0].length).fill('');
                newData.push(emptyRow);
              } else if (rDelta < 0 && newData.length > 1) {
                // Remove bottom row
                newData.pop();
                if (newState.activeTableCell && newState.activeTableCell.r >= newData.length) {
                  newState.activeTableCell = { ...newState.activeTableCell, r: newData.length - 1 };
                }
              }

              if (cDelta > 0) {
                // Add column to right
                newData = newData.map(tr => [...tr, '']);
              } else if (cDelta < 0 && newData[0].length > 1) {
                // Remove right column
                newData = newData.map(tr => {
                  const newTr = [...tr];
                  newTr.pop();
                  return newTr;
                });
                if (newState.activeTableCell && newState.activeTableCell.c >= newData[0].length) {
                  newState.activeTableCell = { ...newState.activeTableCell, c: newData[0].length - 1 };
                }
              }
              
              return { ...row, tableData: newData };
            }
            return row;
          });
          break;
        }
        case 'INSERT_ROW': {
          recordHistory(false);
          const { afterId, row } = action.payload;
          const idx = prev.rows.findIndex(r => r.id === afterId);
          if (idx !== -1) {
            newState.rows = [...prev.rows.slice(0, idx + 1), row, ...prev.rows.slice(idx + 1)];
          } else {
            newState.rows = [...prev.rows, row];
          }
          newState.activeRowId = row.id;
          newState.activeTableCell = null;
          break;
        }
        case 'DELETE_ROW': {
          recordHistory(false);
          const { id } = action.payload;
          if (prev.rows.length <= 1) {
            newState.rows = [{ ...prev.rows[0], content: '', type: 'text', tableData: undefined }];
            break;
          }
          const idx = prev.rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            newState.rows = prev.rows.filter(r => r.id !== id);
            const newActiveIdx = Math.max(0, idx - 1);
            newState.activeRowId = newState.rows[newActiveIdx].id;
            newState.activeTableCell = null;
          }
          break;
        }
        case 'DELETE_MULTIPLE_ROWS': {
          recordHistory(false);
          const { minIdx, maxIdx } = action.payload;
          if (minIdx === 0 && maxIdx === prev.rows.length - 1) {
            // Delete all
            const initialRow = createRow();
            newState.rows = [initialRow];
            newState.activeRowId = initialRow.id;
            newState.activeTableCell = null;
          } else {
            newState.rows = prev.rows.filter((_, i) => i < minIdx || i > maxIdx);
            if (newState.rows.length === 0) {
              const initialRow = createRow();
              newState.rows = [initialRow];
              newState.activeRowId = initialRow.id;
            } else {
              const newActiveIdx = Math.max(0, minIdx - 1);
              newState.activeRowId = newState.rows[newActiveIdx].id;
            }
            newState.activeTableCell = null;
          }
          newState.selection = { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null };
          break;
        }
        case 'INDENT_ROW': {
          recordHistory(false);
          const { id, delta } = action.payload; 
          newState.rows = prev.rows.map(r => {
            if (r.id === id) {
              const newIndent = Math.max(0, Math.min(5, r.indentLevel + delta));
              return { ...r, indentLevel: newIndent };
            }
            return r;
          });
          break;
        }
        case 'CHANGE_ROW_TYPE': {
          recordHistory(false);
          const { id, type } = action.payload;
          newState.rows = prev.rows.map(r => r.id === id ? { ...r, type, tableData: type === 'table' ? [['', ''], ['', '']] : undefined } : r);
          if (type === 'table' && prev.activeRowId === id) {
            newState.activeTableCell = { r: 0, c: 0 };
          }
          break;
        }
        case 'INSERT_MULTIPLE_ROWS': {
          recordHistory(false);
          const { afterId, newRows } = action.payload;
          const idx = prev.rows.findIndex(r => r.id === afterId);
          if (idx !== -1) {
            newState.rows = [...prev.rows.slice(0, idx + 1), ...newRows, ...prev.rows.slice(idx + 1)];
          } else {
            newState.rows = [...prev.rows, ...newRows];
          }
          break;
        }
        case 'REPLACE_ROW_WITH_MULTIPLE': {
          recordHistory(false);
          const { id, newRows } = action.payload;
          const idx = prev.rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            newState.rows = [...prev.rows.slice(0, idx), ...newRows, ...prev.rows.slice(idx + 1)];
            newState.activeRowId = newRows[0].id;
            newState.activeTableCell = null;
          }
          break;
        }
        case 'SET_ACTIVE_ROW': {
          newState.activeRowId = action.payload.id;
          newState.selection = { active: false, anchorRowId: null, anchorBlockIndex: null, focusRowId: null, focusBlockIndex: null };
          
          const row = newState.rows.find(r => r.id === newState.activeRowId);
          if (row && row.type === 'table') {
            // Coming into a table, focus first cell if not specified
            newState.activeTableCell = action.payload.cell || { r: 0, c: 0 };
          } else {
            newState.activeTableCell = null;
          }
          break;
        }
        case 'MOVE_ACTIVE_ROW': {
          const { delta } = action.payload;
          const idx = prev.rows.findIndex(r => r.id === prev.activeRowId);
          if (idx !== -1) {
            let newIdx = idx + delta;
            newIdx = Math.max(0, Math.min(newIdx, prev.rows.length - 1));
            if (newIdx !== idx) {
              newState.activeRowId = prev.rows[newIdx].id;
              if (newState.rows[newIdx].type === 'table') {
                const rowTable = newState.rows[newIdx].tableData || [['', ''], ['', '']];
                newState.activeTableCell = delta === 1 ? { r: 0, c: 0 } : { r: rowTable.length - 1, c: 0 };
              }
            }
          }
          break;
        }
        case 'SET_SELECTION': {
          newState.selection = action.payload;
          if (action.payload.active) {
            newState.selectionMenu = { isOpen: true, step: 'main' };
          } else {
            newState.selectionMenu = { isOpen: false, step: 'main' };
          }
          break;
        }
        case 'SET_SELECTION_MENU': {
          newState.selectionMenu = { ...prev.selectionMenu, ...action.payload };
          break;
        }
        case 'SET_ACTIVE_TABLE_CELL': {
          newState.activeTableCell = action.payload;
          break;
        }
        case 'OPEN_SLASH_MENU': {
          newState.slashMenuState = { isOpen: true, rowId: action.payload.rowId, filter: action.payload.filter, selectedIndex: 0 };
          break;
        }
        case 'CLOSE_SLASH_MENU': {
          newState.slashMenuState = { ...prev.slashMenuState, isOpen: false };
          break;
        }
        case 'SLASH_MENU_NAVIGATE': {
          newState.slashMenuState = { ...prev.slashMenuState, selectedIndex: action.payload.index };
          break;
        }
        case 'SET_JUMP_TO_ROW': {
          newState.jumpToRowState = { isOpen: action.payload.isOpen };
          break;
        }
        case 'SET_HELP_OPEN': {
          newState.isHelpOpen = action.payload.isOpen;
          break;
        }
      }
      return newState;
    });
  }, []);

  return [state, dispatch] as const;
};
