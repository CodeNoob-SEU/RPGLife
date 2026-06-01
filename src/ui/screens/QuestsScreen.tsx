import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr } from '../../domain/dateUtils';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, SectionTitle, EmptyState, ConfirmDialog } from '../components/Pixel';
import { QuestFormModal, QuestKind, QuestDraft } from '../components/QuestFormModal';
import { AntiFormModal, AntiDraft } from '../components/AntiFormModal';
import { useGainFloat } from '../components/GainFloat';
import { haptics } from '../haptics';

type Item = { id: string; name: string; gold: number; exp: number; icon: string; category?: string };

export function QuestsScreen() {
  // Select stable refs, filter in render body (filtering inside the selector → React #185).
  const dailies = useGameStore((s) => s.dailies).filter((d) => !d.archived);
  const weeklies = useGameStore((s) => s.weeklies).filter((w) => !w.archived);
  const oneoffs = useGameStore((s) => s.oneoffs).filter((o) => !o.archived);
  const antis = useGameStore((s) => s.antis).filter((a) => !a.archived);
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const dailyChest = useGameStore((s) => s.dailyChest);
  const actions = useGameStore((s) => s.actions);
  const { floatNode, fire } = useGainFloat();

  const today = dateStr(new Date());
  const chestReady = dailyChest?.date !== today;
  const doneCount = dailies.filter((d) => d.doneDate === today).length;
  const activeOneoffs = oneoffs.filter((o) => o.doneDate === null);
  const doneOneoffs = oneoffs.filter((o) => o.doneDate !== null);
  const categories = [...new Set([...dailies, ...weeklies, ...oneoffs].map((t) => t.category).filter(Boolean))] as string[];

  const [manage, setManage] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // 分区折叠偏好：持久化在 store（跨重启记住）。默认仅「每日」展开、其余收起，让页面打开即短。
  const collapsed = useGameStore((s) => s.ui.questsCollapsed);
  const toggleSection = (k: string) => actions.toggleQuestSection(k);
  const [form, setForm] = useState<{ kind: QuestKind; editId: string | null; initial: QuestDraft } | null>(null);
  const [del, setDel] = useState<{ kind: QuestKind | 'anti'; id: string; name: string } | null>(null);
  const [antiForm, setAntiForm] = useState<{ editId: string | null; initial: AntiDraft } | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const catMatch = (c?: string) => !catFilter || c === catFilter;

  const ridFor = (kind: string, id: string) => todayReceipts.find((r) => r.kind === kind && r.taskId === id)?.rid;
  const onUndo = (rid: string) => { haptics.medium(); actions.undo(rid); };
  const openChest = () => {
    haptics.success();
    const before = useGameStore.getState().player.gold;
    actions.openDailyChest();
    const dg = useGameStore.getState().player.gold - before;
    if (dg > 0) fire(dg, 0);
  };

  const checkIn = (kind: QuestKind, id: string) => {
    haptics.light();
    const before = useGameStore.getState().player;
    if (kind === 'daily') actions.checkInDaily(id);
    else if (kind === 'weekly') actions.checkInWeekly(id);
    else actions.checkInOneoff(id);
    const after = useGameStore.getState().player;
    const dg = after.gold - before.gold;
    const de = after.expTotal - before.expTotal;
    if (dg !== 0 || de !== 0) fire(dg, de);
  };

  const DEFAULTS: Record<QuestKind, QuestDraft> = {
    daily: { name: '', gold: '15', exp: '8', icon: '📝', category: '' },
    weekly: { name: '', gold: '60', exp: '30', icon: '🗓️', category: '' },
    oneoff: { name: '', gold: '40', exp: '20', icon: '📦', category: '' },
  };
  const openAdd = (kind: QuestKind) => setForm({ kind, editId: null, initial: DEFAULTS[kind] });
  const openEdit = (kind: QuestKind, it: Item) => setForm({ kind, editId: it.id, initial: { name: it.name, gold: String(it.gold), exp: String(it.exp), icon: it.icon, category: it.category ?? '' } });

  const saveForm = (vals: { name: string; gold: number; exp: number; icon: string; category?: string }) => {
    if (!form) return;
    const { kind, editId } = form;
    if (editId) {
      if (kind === 'daily') actions.editDaily(editId, vals);
      else if (kind === 'weekly') actions.editWeekly(editId, vals);
      else actions.editOneoff(editId, vals);
    } else if (kind === 'daily') actions.addDaily(vals.name, vals.gold, vals.exp, vals.icon, vals.category);
    else if (kind === 'weekly') actions.addWeekly(vals.name, vals.gold, vals.exp, vals.icon, vals.category);
    else actions.addOneoff(vals.name, vals.gold, vals.exp, vals.icon, vals.category);
    setForm(null);
  };
  const doDelete = () => {
    if (!del) return;
    if (del.kind === 'daily') actions.archiveDaily(del.id);
    else if (del.kind === 'weekly') actions.archiveWeekly(del.id);
    else if (del.kind === 'oneoff') actions.archiveOneoff(del.id);
    else actions.archiveAnti(del.id);
    setDel(null);
  };
  const onSlip = (id: string) => {
    haptics.warning();
    const before = useGameStore.getState().player.gold;
    actions.slipAnti(id);
    const dg = useGameStore.getState().player.gold - before;
    if (dg !== 0) fire(dg, 0);
  };
  const openAddAnti = () => setAntiForm({ editId: null, initial: { name: '', icon: '📵', penalty: '30' } });
  const openEditAnti = (a: { id: string; name: string; icon: string; penalty: number }) => setAntiForm({ editId: a.id, initial: { name: a.name, icon: a.icon, penalty: String(a.penalty) } });
  const saveAntiForm = (v: { name: string; icon: string; penalty: number }) => {
    if (!antiForm) return;
    if (antiForm.editId) actions.editAnti(antiForm.editId, v);
    else actions.addAnti(v.name, v.penalty, v.icon);
    setAntiForm(null);
  };

  const renderHeader = (title: string, kind: QuestKind, count: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) }}>
      <Pressable onPress={() => toggleSection(kind)} style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), flex: 1 }}>
        <PixelText style={{ color: colors.gold, fontSize: 12 }}>{collapsed[kind] ? '▶' : '▼'}</PixelText>
        <SectionTitle>{count > 0 ? `${title} · ${count}` : title}</SectionTitle>
      </Pressable>
      <PixelButton label="＋ 发布" color={colors.bgPanel} onPress={() => openAdd(kind)} />
    </View>
  );
  const renderManage = (kind: QuestKind, it: Item) => (
    <View style={{ flexDirection: 'row', gap: space(2) }}>
      <PixelButton label="编辑" color={colors.bgPanel} onPress={() => openEdit(kind, it)} />
      <PixelButton label="删除" color={colors.danger} onPress={() => setDel({ kind, id: it.id, name: it.name })} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {floatNode}
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
        <PixelPanel style={chestReady ? { borderColor: colors.gold } : { opacity: 0.7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <PixelText style={{ fontSize: 24 }}>{chestReady ? '🎁' : '📦'}</PixelText>
            <PixelText style={{ color: colors.ink, flex: 1 }}>{chestReady ? '每日宝箱已就绪！' : '今日宝箱已开启 · 明日再来'}</PixelText>
            {chestReady ? <PixelButton label="开启" color={colors.gold} onPress={openChest} /> : null}
          </View>
        </PixelPanel>

        {/* 顶部工具条：分类筛选（左）+ 管理开关（右）。管理不再单独悬浮成一行。 */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space(2) }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), flex: 1 }}>
            {categories.length > 0 ? (
              <>
                <PixelButton label="全部" color={catFilter === null ? colors.gold : colors.bgPanel} onPress={() => setCatFilter(null)} />
                {categories.map((c) => (
                  <PixelButton key={c} label={c} color={catFilter === c ? colors.gold : colors.bgPanel} onPress={() => setCatFilter(c)} />
                ))}
              </>
            ) : null}
          </View>
          <PixelButton label={manage ? '✓ 完成' : '✎ 管理'} color={manage ? colors.success : colors.bgPanel} onPress={() => setManage((m) => !m)} />
        </View>

        {renderHeader('每日委托', 'daily', dailies.length)}
        {!collapsed.daily ? (
        <>
        {dailies.length === 0 ? (
          <EmptyState icon="📜" title="还没有每日委托" hint="点「＋ 发布」添加你想每天坚持的小事，打卡赚金币与经验。" />
        ) : (
          <PixelText style={{ color: colors.ink }}>
            {doneCount}/{dailies.length} 完成{doneCount < dailies.length ? `（再完成 ${dailies.length - doneCount} 个解锁全清奖励）` : '　★ 全清达成'}
          </PixelText>
        )}
        {dailies.filter((d) => catMatch(d.category)).map((d) => {
          const done = d.doneDate === today;
          const rid = ridFor('daily', d.id);
          return (
            <PixelPanel key={d.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{d.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{d.name}　🪙{d.gold} ✨{d.exp}</PixelText>
                {manage ? renderManage('daily', d) : done && rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkIn('daily', d.id)} />}
              </View>
            </PixelPanel>
          );
        })}
        </>
        ) : null}

        {renderHeader('每周委托', 'weekly', weeklies.length)}
        {!collapsed.weekly ? (
        <>
        {weeklies.length === 0 ? <EmptyState icon="🗓️" title="还没有每周委托" hint="点「＋ 发布」添加每周目标，比如复盘、大扫除。" /> : null}
        {weeklies.filter((w) => catMatch(w.category)).map((w) => {
          const rid = ridFor('weekly', w.id);
          const done = !!w.doneWeek;
          return (
            <PixelPanel key={w.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{w.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{w.name}　🪙{w.gold} ✨{w.exp}</PixelText>
                {manage ? renderManage('weekly', w) : done && rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkIn('weekly', w.id)} />}
              </View>
            </PixelPanel>
          );
        })}
        </>
        ) : null}

        {renderHeader('一次性委托', 'oneoff', activeOneoffs.length)}
        {!collapsed.oneoff ? (
        <>
        {activeOneoffs.length === 0 && doneOneoffs.length === 0 ? (
          <EmptyState icon="📦" title="还没有一次性委托" hint="一次性的小目标放这里：完成即得奖励，无截止、不惩罚。" />
        ) : null}
        {activeOneoffs.filter((o) => catMatch(o.category)).map((o) => {
          const rid = ridFor('oneoff', o.id);
          return (
            <PixelPanel key={o.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{o.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{o.name}　🪙{o.gold} ✨{o.exp}</PixelText>
                {manage ? renderManage('oneoff', o) : rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label="完成" color={colors.success} onPress={() => checkIn('oneoff', o.id)} />}
              </View>
            </PixelPanel>
          );
        })}
        {doneOneoffs.length > 0 ? (
          <PixelButton label={`${showDone ? '▼' : '▶'} 已完成（${doneOneoffs.length}）`} color={colors.bgPanel} onPress={() => setShowDone((v) => !v)} />
        ) : null}
        {showDone
          ? doneOneoffs.filter((o) => catMatch(o.category)).map((o) => (
              <PixelPanel key={o.id} style={{ opacity: 0.7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                  <PixelText style={{ fontSize: 18 }}>{o.icon}</PixelText>
                  <PixelText style={{ color: colors.ink, flex: 1 }}>{o.name}</PixelText>
                  <PixelText style={{ color: colors.success }}>✅ {o.doneDate}</PixelText>
                </View>
              </PixelPanel>
            ))
          : null}
        </>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) }}>
          <Pressable onPress={() => toggleSection('anti')} style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), flex: 1 }}>
            <PixelText style={{ color: colors.gold, fontSize: 12 }}>{collapsed.anti ? '▶' : '▼'}</PixelText>
            <SectionTitle>{antis.length > 0 ? `禁忌（想避免） · ${antis.length}` : '禁忌（想避免）'}</SectionTitle>
          </Pressable>
          <PixelButton label="＋ 新增" color={colors.bgPanel} onPress={openAddAnti} />
        </View>
        {!collapsed.anti ? (
        <>
        {antis.length === 0 ? (
          <EmptyState icon="🚫" title="还没有禁忌" hint="把想戒掉的行为放这里；每犯一次点「记一次」扣金币，温柔提醒自己。" />
        ) : null}
        {antis.map((a) => (
          <PixelPanel key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <PixelText style={{ fontSize: 18 }}>{a.icon}</PixelText>
              <PixelText style={{ color: colors.ink, flex: 1 }}>{a.name}　-🪙{a.penalty}</PixelText>
              {manage ? (
                <View style={{ flexDirection: 'row', gap: space(2) }}>
                  <PixelButton label="编辑" color={colors.bgPanel} onPress={() => openEditAnti(a)} />
                  <PixelButton label="删除" color={colors.danger} onPress={() => setDel({ kind: 'anti', id: a.id, name: a.name })} />
                </View>
              ) : (
                <PixelButton label="记一次" color={colors.danger} onPress={() => onSlip(a.id)} />
              )}
            </View>
          </PixelPanel>
        ))}
        </>
        ) : null}
      </ScrollView>

      <QuestFormModal
        visible={!!form}
        kind={form?.kind ?? 'daily'}
        editing={!!form?.editId}
        initial={form?.initial ?? { name: '', gold: '', exp: '', icon: '', category: '' }}
        onCancel={() => setForm(null)}
        onSave={saveForm}
      />
      <AntiFormModal
        visible={!!antiForm}
        editing={!!antiForm?.editId}
        initial={antiForm?.initial ?? { name: '', icon: '', penalty: '' }}
        onCancel={() => setAntiForm(null)}
        onSave={saveAntiForm}
      />
      <ConfirmDialog
        visible={!!del}
        title="删除这个委托？"
        message={del ? `「${del.name}」将被归档（不再显示，历史与统计保留）。` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => setDel(null)}
        onConfirm={doDelete}
      />
    </View>
  );
}
