/**
 * 持久化存档当前版本号。每新增持久化字段即 +1（见
 * docs/superpowers/specs/2026-06-01-commercialization-enhancement-design.md §2）。
 * initialState / migrate / store persist 三处共用此常量，旧存档加载时会重跑 migrate 补默认。
 *
 * 版本链：v1 基线 → v2 配置偏好(reduceMotion/sound/haptics) → v3 一次性委托(oneoffs) → v4 成就(achievements)
 *  → v5 每日宝箱(dailyChest + config 区间) → v6 首启引导(onboarded) → v7 昨日战报(reportSeenDate)
 *  → v8 本地提醒(config reminderEnabled/reminderHour) → v9 禁忌任务(antis) → v10 成就名队列(pendingAchievements)
 *  → v11 委托页分区折叠偏好(ui.questsCollapsed)。
 */
export const CURRENT_VERSION = 11;
