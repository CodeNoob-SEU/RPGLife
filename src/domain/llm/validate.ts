export function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not an object');
  return raw as Record<string, unknown>;
}

/** 转整数并夹到 [min,max]；非有限数抛错（视为模型失败，触发上层重试）。 */
export function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) throw new Error(`not a finite number: ${String(v)}`);
  return Math.max(min, Math.min(max, n));
}
