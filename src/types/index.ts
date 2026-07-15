export type RowType = 'text' | 'bullet' | 'table' | 'math';

export interface Row {
  id: string;
  type: RowType;
  indentLevel: number; // 0-5
  content: string; // Tokenized by words in the UI
  tableData?: string[][]; // 2D array for table cells
  hint?: string; // Optional grayed out hint text
}

export interface SelectionState {
  active: boolean;
  anchorRowId: string | null;
  anchorBlockIndex: number | null;
  focusRowId: string | null;
  focusBlockIndex: number | null;
}

export interface EditorState {
  rows: Row[];
  activeRowId: string | null;
  selection: SelectionState;
  slashMenuState: {
    isOpen: boolean;
    rowId: string | null;
    filter: string;
    selectedIndex: number;
  };
  activeTableCell: { r: number; c: number } | null;
}
