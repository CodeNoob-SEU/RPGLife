import { AppState, Receipt } from './types';
import { dateStr, weekKey } from './dateUtils';
import { addGold, applyExpDelta, pushCelebration } from './economy';

function newReceipt(kind: Receipt['kind'], taskId: string, date: string): Receipt {
  return { rid: `${kind}:${taskId}:${date}`, kind, taskId, date, goldDelta: 0, expDelta: 0 };
}

/** addGold + 计入 receipt.goldDelta。 */
function addGoldR(state: AppState, r: Receipt, n: number, type: 'earn' | 'bonus', note: string, now: Date): void {
  addGold(state, n, type, note, now);
  r.goldDelta += n;
}
/** applyExpDelta + 计入 receipt.expDelta。 */
function addExpR(state: AppState, r: Receipt, n: number): void {
  applyExpDelta(state, n);
  r.expDelta += n;
}

function allDailiesDone(state: AppState, date: string): boolean {
  const active = state.dailies.filter((d) => !d.archived);
  return active.length > 0 && active.every((d) => d.doneDate === date);
}
function allWeekliesDone(state: AppState, week: string): boolean {
  const active = state.weeklies.filter((w) => !w.archived);
  return active.length > 0 && active.every((w) => w.doneWeek === week);
}

/** 完成关联任务对 Boss 造成伤害；跨阶段阈值发该段奖励；记入 receipt 以便撤销。 */
export function applyBossDamageForTask(state: AppState, r: Receipt, taskId: string, now: Date): void {
  for (const b of state.bosses) {
    if (b.defeated || !b.linkedTaskIds.includes(taskId)) continue;
    const dmg = b.damagePerHit;
    b.hp = Math.max(0, b.hp - dmg);
    const cleared: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const threshold = (b.maxHp * (3 - i)) / 3; // 阶段1<=2/3, 2<=1/3, 3<=0
      if (b.hp <= threshold && !b.clearedStages.includes(i)) {
        b.clearedStages.push(i);
        cleared.push(i);
        addGoldR(state, r, Math.floor(b.totalRewardGold * b.weights[i - 1]), 'bonus', `Boss「${b.name}」阶段${i}`, now);
        addExpR(state, r, Math.floor(b.totalRewardExp * b.weights[i - 1]));
      }
    }
    let defeated = false;
    if (b.hp <= 0 && !b.defeated) {
      b.defeated = true;
      defeated = true;
      pushCelebration(state, 'bossDefeated');
    }
    (r.bossHits ??= []).push({ bossId: b.id, damage: dmg, clearedStages: cleared, defeated });
  }
}

export function checkInDaily(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const d = state.dailies.find((x) => x.id === id);
  if (!d || d.archived || d.doneDate === today) return;
  const r = newReceipt('daily', id, today);
  d.doneDate = today;
  addGoldR(state, r, d.gold, 'earn', `完成每日: ${d.name}`, now);
  addExpR(state, r, d.exp);
  applyBossDamageForTask(state, r, id, now);
  state.todayReceipts.push(r);
  if (allDailiesDone(state, today) && state.dailyPerfect?.date !== today) {
    addGold(state, state.config.perfectDailyBonus, 'bonus', '每日全清', now);
    applyExpDelta(state, state.config.perfectDailyBonusExp);
    state.dailyPerfect = { date: today, gold: state.config.perfectDailyBonus, exp: state.config.perfectDailyBonusExp };
    pushCelebration(state, 'perfectDay');
  }
}

export function checkInWeekly(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const week = weekKey(now);
  const w = state.weeklies.find((x) => x.id === id);
  if (!w || w.archived || w.doneWeek === week) return;
  const r = newReceipt('weekly', id, today);
  w.doneWeek = week;
  addGoldR(state, r, w.gold, 'earn', `完成每周: ${w.name}`, now);
  addExpR(state, r, w.exp);
  applyBossDamageForTask(state, r, id, now);
  state.todayReceipts.push(r);
  if (allWeekliesDone(state, week) && state.weeklyPerfect?.week !== week) {
    addGold(state, state.config.perfectWeeklyBonus, 'bonus', '每周全清', now);
    applyExpDelta(state, state.config.perfectWeeklyBonusExp);
    state.weeklyPerfect = { week, gold: state.config.perfectWeeklyBonus, exp: state.config.perfectWeeklyBonusExp };
    pushCelebration(state, 'perfectWeek');
  }
}
