import { AppState, Boss, Receipt, Trial } from './types';
import { dateStr, weekKey, weekKeyStr } from './dateUtils';
import { addGold, applyExpDelta, pushCelebration } from './economy';
import { computeStreak } from './trials';

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

/** 对单个 Boss 施加 dmg 伤害：扣血 + 跨阶段阈值发该段奖励 + 击杀判定，全部记入 receipt 以便撤销。 */
export function applyBossHit(state: AppState, r: Receipt, b: Boss, dmg: number, now: Date): void {
  if (b.defeated || b.archived) return;
  const before = b.hp;
  b.hp = Math.max(0, b.hp - dmg);
  const actual = before - b.hp; // 记录实际造成的伤害（过量击杀不溢出），撤销才能精确回血
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
  (r.bossHits ??= []).push({ bossId: b.id, damage: actual, clearedStages: cleared, defeated });
}

/** 完成关联任务对 Boss 造成伤害（dmg=damagePerHit）；记入 receipt 以便撤销。 */
export function applyBossDamageForTask(state: AppState, r: Receipt, taskId: string, now: Date): void {
  for (const b of state.bosses) {
    if (b.defeated || b.archived || !b.linkedTaskIds.includes(taskId)) continue;
    applyBossHit(state, r, b, b.damagePerHit, now);
  }
}

/** 手动攻击 Boss（自定义伤害值，下限 1）。建 'boss' 回执，同日可撤。不依赖关联任务。 */
export function attackBoss(state: AppState, bossId: string, damage: number, now: Date): void {
  const b = state.bosses.find((x) => x.id === bossId);
  if (!b || b.defeated || b.archived) return;
  const dmg = Math.max(1, Math.floor(damage));
  const r = newReceipt('boss', bossId, dateStr(now));
  applyBossHit(state, r, b, dmg, now);
  state.todayReceipts.push(r);
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

/** 一次性委托打卡：纯发金币/经验 + 回执（同日可撤）。不触发每日全清、不联动 Boss、不参与 rollover。 */
export function checkInOneoff(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const o = state.oneoffs.find((x) => x.id === id);
  if (!o || o.archived || o.doneDate !== null) return; // doneDate!==null 即永久完成
  const r = newReceipt('oneoff', id, today);
  o.doneDate = today;
  addGoldR(state, r, o.gold, 'earn', `完成委托: ${o.name}`, now);
  addExpR(state, r, o.exp);
  state.todayReceipts.push(r);
}

function graduateTrial(state: AppState, t: Trial): string {
  t.graduated = true;
  const newId = `daily-from-${t.id}`;
  state.dailies.push({ id: newId, name: t.name, gold: 15, exp: 8, icon: t.icon, doneDate: null, archived: false });
  return newId;
}

export function checkInTrial(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const t = state.trials.find((x) => x.id === id);
  if (!t || t.archived || t.graduated || t.completedDates.includes(today)) return;
  const r = newReceipt('trial', id, today);
  t.completedDates.push(today);
  t.streak = computeStreak(t, today);
  const claimed: number[] = [];
  for (const m of [...t.milestones].sort((a, b) => a.day - b.day)) {
    if (t.streak >= m.day && !t.claimedMilestones.includes(m.day)) {
      addGoldR(state, r, m.gold, 'bonus', `试炼里程碑 D${m.day}: ${t.name}`, now);
      addExpR(state, r, m.exp);
      t.claimedMilestones.push(m.day);
      claimed.push(m.day);
    }
  }
  if (claimed.length) r.claimedMilestones = claimed;
  if (t.streak >= 14 && !t.graduated) {
    const newId = graduateTrial(state, t);
    r.graduation = { addedDailyId: newId };
    pushCelebration(state, 'graduation');
  }
  applyBossDamageForTask(state, r, id, now);
  state.todayReceipts.push(r);
}

export function undoCheckIn(state: AppState, rid: string, now: Date): void {
  const idx = state.todayReceipts.findIndex((x) => x.rid === rid);
  if (idx === -1) return;
  const r = state.todayReceipts[idx];
  const ts = now.getTime();

  // 1) 结构回退
  if (r.kind === 'daily') {
    const d = state.dailies.find((x) => x.id === r.taskId);
    if (d) d.doneDate = null;
  } else if (r.kind === 'weekly') {
    const w = state.weeklies.find((x) => x.id === r.taskId);
    if (w) w.doneWeek = null;
  } else if (r.kind === 'trial') {
    const t = state.trials.find((x) => x.id === r.taskId);
    if (t) {
      t.completedDates = t.completedDates.filter((x) => x !== r.date);
      if (r.claimedMilestones) t.claimedMilestones = t.claimedMilestones.filter((m) => !r.claimedMilestones!.includes(m));
      if (r.graduation) {
        t.graduated = false;
        const gid = r.graduation.addedDailyId;
        state.dailies = state.dailies.filter((x) => x.id !== gid);
      }
      t.streak = computeStreak(t, r.date);
    }
  } else if (r.kind === 'oneoff') {
    const o = state.oneoffs.find((x) => x.id === r.taskId);
    if (o) o.doneDate = null;
  }

  // 2) Boss 回退
  for (const h of r.bossHits ?? []) {
    const b = state.bosses.find((x) => x.id === h.bossId);
    if (!b) continue;
    b.hp = Math.min(b.maxHp, b.hp + h.damage);
    b.clearedStages = b.clearedStages.filter((s) => !h.clearedStages.includes(s));
    if (h.defeated) b.defeated = false;
  }

  // 3) 金币/经验完整回退
  state.player.gold = Math.max(0, state.player.gold - r.goldDelta);
  applyExpDelta(state, -r.expDelta);
  state.ledger.push({ ts, date: r.date, type: 'undo', amount: -r.goldDelta, expAmount: -r.expDelta, note: `撤销: ${r.taskId}` });

  // 4) 全清奖励重判（按回执自身日期 r.date，使撤销在缺少 rollover 时也自洽）
  if (r.kind === 'daily' && state.dailyPerfect?.date === r.date && !allDailiesDone(state, r.date)) {
    state.player.gold = Math.max(0, state.player.gold - state.dailyPerfect.gold);
    applyExpDelta(state, -state.dailyPerfect.exp);
    state.ledger.push({ ts, date: r.date, type: 'undo', amount: -state.dailyPerfect.gold, expAmount: -state.dailyPerfect.exp, note: '撤销每日全清' });
    state.dailyPerfect = null;
  }
  if (r.kind === 'weekly') {
    const week = weekKeyStr(r.date);
    if (state.weeklyPerfect?.week === week && !allWeekliesDone(state, week)) {
      state.player.gold = Math.max(0, state.player.gold - state.weeklyPerfect.gold);
      applyExpDelta(state, -state.weeklyPerfect.exp);
      state.ledger.push({ ts, date: r.date, type: 'undo', amount: -state.weeklyPerfect.gold, expAmount: -state.weeklyPerfect.exp, note: '撤销每周全清' });
      state.weeklyPerfect = null;
    }
  }

  state.todayReceipts.splice(idx, 1);
}

export function buyFreezeCard(state: AppState, now: Date): boolean {
  if (state.player.gold < state.config.freezeCardCost) return false;
  state.player.gold -= state.config.freezeCardCost;
  state.inventory.freezeCards += 1;
  state.ledger.push({ ts: now.getTime(), date: dateStr(now), type: 'purchase', amount: -state.config.freezeCardCost, note: '购买冻结卡' });
  return true;
}

export function cashOut(state: AppState, amount: number, now: Date): boolean {
  if (amount < state.config.cashOutThreshold || amount > state.player.gold) return false;
  state.player.gold -= amount;
  state.ledger.push({ ts: now.getTime(), date: dateStr(now), type: 'cashout', amount: -amount, note: `提现 ${amount}金 = ¥${amount / state.config.goldToYuanRate}` });
  return true;
}

/** 开启每日宝箱：随机金币（[min,max]，rand∈[0,1) 由调用方注入便于测试），同日仅一次。返回奖励额（0=今日已开）。 */
export function openDailyChest(state: AppState, now: Date, rand: number): number {
  const today = dateStr(now);
  if (state.dailyChest?.date === today) return 0;
  const min = state.config.dailyChestMin ?? 10; // 兜底：旧/残缺存档缺该配置时不致 NaN
  const max = state.config.dailyChestMax ?? 60;
  const reward = min + Math.floor(rand * (max - min + 1));
  addGold(state, reward, 'bonus', '每日宝箱', now);
  state.dailyChest = { date: today };
  return reward;
}
