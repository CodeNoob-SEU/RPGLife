import { AppState, DateStr, WeekKey } from './types';
import { dateStr, weekKey, weekKeyStr, daysFrom, daysBetween, isWeekEnd } from './dateUtils';
import { settleTrials } from './trials';

export function ensureRestDayQuota(state: AppState, wk: WeekKey): void {
  if (state.restDays.weekKey !== wk) {
    state.restDays = { weekKey: wk, remaining: state.config.restDaysPerWeek };
  }
}

export function settleDailies(state: AppState, D: DateStr, now: Date): void {
  const incomplete = state.dailies.filter((d) => !d.archived && d.doneDate !== D);
  let penalty = incomplete.reduce((sum, d) => sum + Math.floor(d.gold * state.config.missedDailyPenaltyRate), 0);
  penalty = Math.min(penalty, state.config.dailyPenaltyCap);
  if (penalty > 0) {
    state.player.gold = Math.max(0, state.player.gold - penalty);
    state.ledger.push({ ts: now.getTime(), date: D, type: 'penalty', amount: -penalty, note: `漏做每日任务 x${incomplete.length}` });
  }
}

export function settleWeeklies(state: AppState, D: DateStr, now: Date): void {
  const week = weekKeyStr(D);
  const incomplete = state.weeklies.filter((w) => !w.archived && w.doneWeek !== week);
  const penalty = incomplete.reduce((sum, w) => sum + Math.floor(w.gold * state.config.weeklyPenaltyRate), 0);
  if (penalty > 0) {
    state.player.gold = Math.max(0, state.player.gold - penalty);
    state.ledger.push({ ts: now.getTime(), date: D, type: 'penalty', amount: -penalty, note: `漏做每周任务 x${incomplete.length}` });
  }
}

export function recordHistory(state: AppState, D: DateStr, forceRest: boolean): void {
  const active = state.dailies.filter((d) => !d.archived);
  const total = active.length;
  const done = active.filter((d) => d.doneDate === D).length;
  const goldNet = state.ledger.filter((l) => l.date === D).reduce((sum, l) => sum + l.amount, 0);
  const status = forceRest ? 'rest' : total === 0 ? 'rest' : done === total ? 'perfect' : done === 0 ? 'missed' : 'partial';
  state.history[D] = { status, dailiesDone: done, dailiesTotal: total, goldNet };
}

export function processRollover(state: AppState, now: Date): void {
  const today = dateStr(now);
  const last = state.player.lastActiveDate;
  if (last === null) {
    state.player.lastActiveDate = today;
    ensureRestDayQuota(state, weekKey(now));
    return;
  }
  if (today === last) return;

  state.todayReceipts = []; // 跨天 -> 清空回执（撤销天然限当天）
  const gap = daysBetween(last, today);
  const longAbsence = gap > state.config.longAbsenceThreshold;

  for (const D of daysFrom(last, today)) {
    ensureRestDayQuota(state, weekKeyStr(D));
    if (!longAbsence) settleDailies(state, D, now);
    settleTrials(state, D);
    if (isWeekEnd(D) && !longAbsence) settleWeeklies(state, D, now);
    recordHistory(state, D, longAbsence);
  }

  ensureRestDayQuota(state, weekKey(now));
  if (longAbsence) state.pendingNotice = 'longAbsence';
  state.player.lastActiveDate = today;
}
