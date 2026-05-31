/**
 * 持久化存档当前版本号。每新增持久化字段即 +1（见
 * docs/superpowers/specs/2026-06-01-commercialization-enhancement-design.md §2）。
 * initialState / migrate / store persist 三处共用此常量，旧存档加载时会重跑 migrate 补默认。
 *
 * 版本链：v1 基线 → v2 配置偏好(reduceMotion/sound/haptics)。
 */
export const CURRENT_VERSION = 2;
