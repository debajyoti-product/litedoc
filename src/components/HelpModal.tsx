import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  return (
    <div
      className="help-modal-scroll"
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        bottom: '24px',
        width: '420px',
        background: 'var(--bg-color)',
        border: '1px solid var(--text-muted)',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        zIndex: 2000,
        padding: '24px',
        overflowY: 'auto',
        color: 'var(--text-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isOpen ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.95)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Help</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            padding: '4px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      <section>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-color)' }}>Commands</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><kbd style={kbdStyle}>/table</kbd> Insert a table block</li>
          <li><kbd style={kbdStyle}>/math</kbd> Insert inline math</li>
          <li><kbd style={kbdStyle}>/bullet</kbd> Convert to bullet list</li>
          <li><kbd style={kbdStyle}>/help</kbd> Open this guide</li>
        </ul>
      </section>

      <section>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-color)' }}>Global Shortcuts</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>L</kbd> Toggle Dark/Light mode</li>
          <li><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>G</kbd> Jump to row</li>
          <li><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>A</kbd> (x2) Select all rows</li>
        </ul>
      </section>

      <section>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-color)' }}>Block Selection</h3>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', opacity: 0.8 }}>
          Hold <kbd style={kbdStyle}>Shift</kbd> and use <kbd style={kbdStyle}>Arrow Keys</kbd> to select text blocks across rows.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><kbd style={kbdStyle}>S</kbd> Save selection as a custom command</li>
          <li><kbd style={kbdStyle}>D</kbd> Delete the selection</li>
        </ul>
      </section>

      <section>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-color)' }}>Table Interactions</h3>
        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
          While inside a table cell, hold <kbd style={kbdStyle}>Shift</kbd> and use <kbd style={kbdStyle}>Arrow Keys</kbd> to add or remove rows and columns in that direction.
        </p>
      </section>
      
      <section>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-color)' }}>Math Engine</h3>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', opacity: 0.8 }}>
          Inside a <kbd style={kbdStyle}>/math</kbd> block, expressions evaluate automatically in real-time.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><span style={{opacity: 0.8, fontSize: '0.9rem'}}>Supported Operators:</span> <kbd style={kbdStyle}>+</kbd> <kbd style={kbdStyle}>-</kbd> <kbd style={kbdStyle}>*</kbd> <kbd style={kbdStyle}>/</kbd> (or <kbd style={kbdStyle}>d</kbd> for division)</li>
          <li><span style={{opacity: 0.8, fontSize: '0.9rem'}}>Number Suffixes:</span></li>
          <li style={{ paddingLeft: '12px' }}><kbd style={kbdStyle}>k</kbd> Thousand (e.g. 5k = 5000)</li>
          <li style={{ paddingLeft: '12px' }}><kbd style={kbdStyle}>l</kbd> Lakh (e.g. 1l = 100000)</li>
          <li style={{ paddingLeft: '12px' }}><kbd style={kbdStyle}>mn</kbd> Million (e.g. 1mn = 1000000)</li>
          <li style={{ paddingLeft: '12px' }}><kbd style={kbdStyle}>bn</kbd> Billion (e.g. 1bn = 1000000000)</li>
        </ul>
        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.6, fontStyle: 'italic' }}>
          Example: <code>10mn / 2</code> or <code>10mn d 2</code> renders as <code>= 5,000,000</code>
        </p>
      </section>
    </div>
  );
};

const kbdStyle: React.CSSProperties = {
  background: 'var(--bg-color)',
  border: '1px solid var(--text-muted)',
  borderRadius: '4px',
  padding: '2px 6px',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  boxShadow: '0 2px 0 rgba(0,0,0,0.05)',
  marginRight: '4px',
  display: 'inline-block'
};
