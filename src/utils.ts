export function esc(str: any): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function escAttr(str: any): string {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function guessType(val: any): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return 'bool';
  if (typeof val === 'number') return 'number';
  // Date heuristic
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return 'date';
  return 'string';
}

export function tryParseJson(str: any): any {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }
  return null;
}
