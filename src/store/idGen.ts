let counter = 0;

/** 运行期唯一 id（用于 UI 新建任务/试炼/Boss）。非确定式，仅在 store 层使用。 */
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
