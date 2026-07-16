/**
 * RowRenderer.tsx — Per-row rendering component.
 *
 * Renders a single document row in one of four modes: text, bullet, table,
 * or math. In block-selection mode it switches from a controlled input to
 * a word-block grid. Wrapped in React.memo with a custom comparator to
 * prevent unnecessary re-renders. Math results are evaluated inline and
 * rendered via KaTeX.
 */
import React, { useRef, useLayoutEffect } from 'react';
import type { Row, SelectionState } from '../types';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface RowProps {
  row: Row;
  index: number;
  isActive: boolean;
  selection: SelectionState;
  onChange: (id: string, newContent: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, id: string, cursorPosition: number) => void;
  onFocus: (id: string) => void;
  placeholder?: string;
  activeTableCell?: {r: number, c: number} | null;
  slashMenuState?: { isOpen: boolean, rowId: string | null, filter: string, selectedIndex: number };
  isMultiSelected?: boolean;
  onCellChange?: (id: string, r: number, c: number, newContent: string) => void;
  onCellKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, id: string, r: number, c: number, cursorPosition: number) => void;
  onCellFocus?: (id: string, r: number, c: number) => void;
}

export const RowRenderer = React.memo(({
  row,
  index,
  isActive,
  selection,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  activeTableCell,
  isMultiSelected,
  onCellChange,
  onCellKeyDown,
  onCellFocus
}: RowProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus management: focus input if active and NOT in block selection mode
  useLayoutEffect(() => {
    if (isActive) {
      if (!selection.active && inputRef.current) {
        inputRef.current.focus();
      } else if (selection.active && containerRef.current) {
        containerRef.current.focus();
      }
    }
  }, [isActive, selection.active, activeTableCell?.r, activeTableCell?.c]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(row.id, e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown(e, row.id, inputRef.current?.selectionStart || 0);
  };

  const handleFocus = () => {
    if (!isActive) {
      onFocus(row.id);
    }
  };

  const indentStyle = { marginLeft: `${row.indentLevel * 2}rem` };

  // If in block selection mode and this row is active, render blocks
  if ((isActive && selection.active) || isMultiSelected) {
    const blocks = row.content.split(' ');
    if (blocks.length === 1 && blocks[0] === '') {
      blocks.length = 0;
    }
    
    return (
      <div 
        className={`row-container ${row.type}`} 
        style={{...indentStyle, outline: 'none'}}
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        <span className="row-number">{index + 1}</span>
        {row.type === 'bullet' && <span className="type-icon" style={{ marginRight: '8px' }}>•</span>}
        {row.type === 'table' && <span className="type-icon" style={{ marginRight: '8px' }}>📊</span>}
        {row.type === 'math' && <span className="type-icon" style={{ marginRight: '8px' }}>∑</span>}
        <div className="row-content block-selection-mode">
          {blocks.map((block, i) => {
            const isSelected = isMultiSelected || (
              selection.anchorBlockIndex !== null && 
              selection.focusBlockIndex !== null &&
              i >= Math.min(selection.anchorBlockIndex, selection.focusBlockIndex) &&
              i <= Math.max(selection.anchorBlockIndex, selection.focusBlockIndex)
            );
            
            return (
              <span key={i} className={`word-block ${isSelected ? 'selected' : ''}`}>
                {block}{' '}
              </span>
            );
          })}
          {blocks.length === 0 && <span className="word-block selected empty-block">&nbsp;</span>}
        </div>
      </div>
    );
  }

  // Math evaluation logic
  let mathResult = '';
  if (row.type === 'math' && row.content) {
    try {
      let expression = row.content;
      
      // Handle unit suffixes
      expression = expression.replace(/bn/gi, '*1000000000');
      expression = expression.replace(/mn/gi, '*1000000');
      expression = expression.replace(/k/gi, '*1000');
      expression = expression.replace(/l/gi, '*100000');
      
      // Replace 'd' with '/' for division
      expression = expression.replace(/d/gi, '/');
      
      // Sanitize to only allow numbers and operators
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      if (sanitized.match(/\d/)) {
        // Safe evaluation since we stripped everything except math chars
        const result = new Function(`return ${sanitized}`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
           mathResult = `= ${result.toLocaleString('en-US')}`;
        }
      }
    } catch(e) {
      // ignore eval errors (e.g., incomplete formula)
    }
  }

  // Normal text input mode
  if (row.type === 'table') {
    const tableData = row.tableData || [['', ''], ['', '']];
    return (
      <div className={`row-container table-container ${isMultiSelected ? 'multi-selected' : ''}`} style={indentStyle}>
        <span className="row-number">{index + 1}</span>
        <table className="editor-table">
          <tbody>
            {tableData.map((tr, rIndex) => (
              <tr key={rIndex}>
                {tr.map((td, cIndex) => {
                  const isCellActive = isActive && activeTableCell?.r === rIndex && activeTableCell?.c === cIndex;
                  return (
                    <td key={cIndex}>
                      <input
                        ref={isCellActive ? inputRef : null}
                        type="text"
                        className="cell-input"
                        value={td}
                        onChange={(e) => onCellChange && onCellChange(row.id, rIndex, cIndex, e.target.value)}
                        onKeyDown={(e) => onCellKeyDown && onCellKeyDown(e, row.id, rIndex, cIndex, e.currentTarget.selectionStart || 0)}
                        onFocus={() => {
                          if (!isCellActive && onCellFocus) {
                            onCellFocus(row.id, rIndex, cIndex);
                          }
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div 
      className={`row-container ${row.type}`} 
      style={indentStyle}
      onClick={(e) => {
        // Only focus if they didn't click on another interactive element
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          inputRef.current?.focus();
        }
      }}
    >
      <span className="row-number">{index + 1}</span>
      {row.type === 'bullet' && <span className="type-icon" style={{ marginRight: '8px' }}>•</span>}
      {row.type === 'math' && <span className="type-icon" style={{ marginRight: '8px', opacity: 0.5 }}>∑</span>}
      
      <div style={{ display: 'inline-grid', alignItems: 'center' }}>
        <span style={{ visibility: 'hidden', gridArea: '1 / 1', whiteSpace: 'pre' }}>
          {row.content || placeholder || (isActive ? "..." : "")}
        </span>
        <input
          id={`input-${row.id}`}
          ref={inputRef}
          type="text"
          className="row-input"
          style={{ gridArea: '1 / 1', width: '100%', minWidth: '2px' }}
          value={row.content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder || (isActive ? "..." : "")}
        />
      </div>

      {row.hint && (
        <span className="row-hint" style={{ color: '#888', fontSize: '85%', marginLeft: '10%', transform: 'translateY(2%)', pointerEvents: 'none', userSelect: 'none', flexShrink: 0 }}>
          {row.hint}
        </span>
      )}
      {mathResult && (
        <span className="math-result" style={{ marginLeft: '10px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
          <InlineMath math={mathResult} />
        </span>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.row.id === next.row.id &&
    prev.row.content === next.row.content &&
    prev.row.indentLevel === next.row.indentLevel &&
    prev.row.type === next.row.type &&
    prev.row.tableData === next.row.tableData &&
    prev.index === next.index &&
    prev.isActive === next.isActive &&
    prev.isMultiSelected === next.isMultiSelected &&
    (!prev.isActive && !next.isActive && !prev.isMultiSelected && !next.isMultiSelected ? true : prev.selection === next.selection) &&
    (!prev.isActive && !next.isActive ? true : 
      (prev.activeTableCell?.r === next.activeTableCell?.r && prev.activeTableCell?.c === next.activeTableCell?.c &&
       prev.slashMenuState?.isOpen === next.slashMenuState?.isOpen && 
       prev.slashMenuState?.selectedIndex === next.slashMenuState?.selectedIndex &&
       prev.slashMenuState?.filter === next.slashMenuState?.filter))
  );
});
