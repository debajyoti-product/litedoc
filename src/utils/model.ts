/**
 * model.ts — Row factory and word-block utilities.
 *
 * createRow() is the canonical way to construct a new row with a fresh UUID.
 * The word-block helpers (splitIntoWordBlocks, getWordBlockAtCursor,
 * replaceWordBlocks) power the block-selection mode where text is tokenized
 * by spaces and manipulated as discrete units.
 */
import type { Row, RowType } from '../types';

export const createRow = (type: RowType = 'text', content: string = '', indentLevel: number = 0, tableData?: string[][]): Row => ({
  id: crypto.randomUUID(),
  type,
  content,
  indentLevel,
  tableData: type === 'table' ? (tableData || [['', ''], ['', '']]) : undefined,
});

export const splitIntoWordBlocks = (text: string) => {
  // Split by whitespace but keep the words and whitespace separate or just keep words
  // For simplicity, let's just split by spaces and assume single spaces for now,
  // or use a regex to capture words and spaces.
  // Actually, standardizing on single spaces for block tokenization is easiest.
  return text.split(' ');
};

export const getWordBlockAtCursor = (text: string, cursorPosition: number): number => {
  const textBeforeCursor = text.slice(0, cursorPosition);
  return textBeforeCursor.split(' ').length - 1;
};

// Returns [newContent, newCursorPosition] after replacing blocks
export const replaceWordBlocks = (text: string, startIndex: number, endIndex: number, replacement: string): [string, number] => {
  const blocks = text.split(' ');
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  
  blocks.splice(start, end - start + 1, replacement);
  const newContent = blocks.join(' ');
  
  // Calculate new cursor position
  const newCursor = blocks.slice(0, start).join(' ').length + (start > 0 ? 1 : 0) + replacement.length;
  
  return [newContent, newCursor];
};
