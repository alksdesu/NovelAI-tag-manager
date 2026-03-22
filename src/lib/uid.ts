export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${prefix}-${rand}`;
}
