import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { isLLMReady, getClient } from '../../services/llm/getClient';
import { buildReportContext, buildReportPrompt } from '../../domain/llm/reportContext';
import { DateStr } from '../../domain/types';

const cache = new Map<DateStr, string>(); // 内存缓存，重启清空，不进存档

export function useNarrativeReport(date: DateStr): { text: string | null; loading: boolean } {
  const [text, setText] = useState<string | null>(cache.get(date) ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (cache.has(date)) { setText(cache.get(date)!); return; }
    if (!isLLMReady()) { setText(null); return; }
    setLoading(true);
    const facts = buildReportContext(useGameStore.getState(), date);
    getClient().generateText(buildReportPrompt(facts))
      .then((t) => { if (!alive) return; const v = t.trim(); if (v) cache.set(date, v); setText(v || null); })
      .catch(() => { if (alive) setText(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [date]);

  return { text, loading };
}
