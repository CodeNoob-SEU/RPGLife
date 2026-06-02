/** 语义化版本比较：忽略 'v' 前缀与空白、补齐缺位、按数值（非字典序）比较。返回 -1 / 0 / 1。 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (s: string) =>
    s.trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
