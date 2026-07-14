import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { parseHuiNotation } from '../model/guqin';
import { engine } from '../audio/engineInstance';

export function TechniqueMenu() {
  const open = useStore(s => s.techniqueMenuOpen);
  const techniques = useStore(s => s.techniques);
  const closeTechniqueMenu = useStore(s => s.closeTechniqueMenu);
  const applyTechnique = useStore(s => s.applyTechnique);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = techniques.filter(t =>
    t.name.includes(query) || t.id.includes(query)
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  function onApply(id: string) {
    const anchorTime = engine.getTime();
    applyTechnique(id, anchorTime, (label) => {
      const raw = window.prompt(`${label}（輸入徽分記法，如 "9"）`);
      if (!raw) return null;
      try { return parseHuiNotation(raw.trim()); }
      catch { alert('徽分記法格式不正確'); return null; }
    });
    closeTechniqueMenu();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[cursor]) onApply(filtered[cursor].id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeTechniqueMenu();
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(43,38,33,0.4)', zIndex: 1000,
      }}
      onClick={closeTechniqueMenu}
    >
      <div
        style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 16, width: 280,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          fontFamily: 'var(--serif)',
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--ink-soft)' }}>套用指法（T）</div>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋指法名稱..."
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '6px 8px', fontSize: 14, background: 'var(--bg)',
            color: 'var(--ink)', fontFamily: 'inherit', marginBottom: 8,
          }}
        />
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '8px 4px', color: 'var(--ink-soft)', fontSize: 13 }}>無符合指法</div>
          )}
          {filtered.map((t, i) => (
            <div
              key={t.id}
              style={{
                padding: '7px 10px', borderRadius: 4, cursor: 'pointer',
                background: i === cursor ? 'var(--border-soft)' : 'transparent',
                color: 'var(--ink)', fontSize: 14,
                display: 'flex', justifyContent: 'space-between',
              }}
              onMouseEnter={() => setCursor(i)}
              onClick={() => onApply(t.id)}
            >
              <span>{t.name}</span>
              <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
                {t.type === 'sequence' ? '音序列' : '走手音'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-soft)' }}>
          ↑↓ 選取・Enter 套用・Esc 關閉
        </div>
      </div>
    </div>
  );
}
