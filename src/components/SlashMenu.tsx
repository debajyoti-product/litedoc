/**
 * SlashMenu.tsx — Slash command palette.
 *
 * Provides getCommands(), which merges built-in commands with any user-saved
 * custom templates from localStorage. SlashMenu renders the filtered dropdown
 * that appears when a user types '/' in a text row.
 */

interface SlashMenuProps {
  isOpen: boolean;
  filter: string;
  selectedIndex: number;
  onSelect: (command: string) => void;
}

export const getCommands = () => {
  const base = [
    { id: 'table', label: '/table', desc: 'table block' },
    { id: 'math', label: '/math', desc: 'inline math' },
    { id: 'bullet', label: '/bullet', desc: 'bulleted list' },
    { id: 'help', label: '/help', desc: 'help doc' },
    { id: 'design', label: '/design', desc: 'product design' },
    { id: 'rca', label: '/rca', desc: 'root cause analysis' },
    { id: 'strategy', label: '/strategy', desc: 'product strategy' }
  ];
  try {
    const custom = JSON.parse(localStorage.getItem('litedoc_templates') || '[]');
    custom.forEach((t: any) => {
      base.push({ id: t.name, label: `/${t.name}`, desc: t.description || 'custom command' });
    });
  } catch(e) {}
  return base;
};

export const SlashMenu = ({ isOpen, filter, selectedIndex, onSelect }: SlashMenuProps) => {
  if (!isOpen) return null;

  const filteredCommands = getCommands().filter(c => c.id.startsWith(filter.toLowerCase()));

  if (filteredCommands.length === 0) return null;

  return (
    <div className="slash-menu" style={{
      position: 'absolute',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '4px',
      padding: '4px',
      zIndex: 100,
      marginTop: '24px', // Below the text
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
    }}>
      {filteredCommands.map((cmd, i) => (
        <div 
          key={cmd.id}
          className={`slash-menu-item ${i === selectedIndex ? 'selected' : ''}`}
          style={{
            padding: '4px 8px',
            cursor: 'default',
            backgroundColor: i === selectedIndex ? '#3b82f6' : 'transparent',
            color: i === selectedIndex ? 'white' : '#e2e8f0',
            borderRadius: '2px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px'
          }}
          onMouseDown={(e) => {
             // We use onMouseDown to prevent the input from losing focus before we select
             e.preventDefault();
             onSelect(cmd.id);
          }}
        >
          <span style={{ fontWeight: 500 }}>{cmd.label}</span>
          <span style={{ fontSize: '0.8em', opacity: 0.7 }}>{cmd.desc}</span>
        </div>
      ))}
    </div>
  );
};
