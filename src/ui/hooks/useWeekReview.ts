import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { isLLMReady, getClient } from '../../services/llm/getClient';
import { buildWeekReviewContext, buildWeekReviewPrompt } from '../../domain/llm/reportContext';
import { DateStr } from '../../domain/types';

const cache = new Map<DateStr, string>(); // 内存缓存，不进存档

export function useWeekReview(asOf: DateStr): { text: string | null; loading: boolean } {
  const [text, setText] = useState<string | null>(cache.get(asOf) ?? null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    if (cache.has(asOf)) { setText(cache.get(asOf)!); return; }
    if (!isLLMReady()) { setText(null); return; }
    setLoading(true);
    const facts = buildWeekReviewContext(useGameStore.getState(), asOf);
    getClient().generateText(buildWeekReviewPrompt(facts))
      .then((t) => { if (!alive) return; const v = t.trim(); if (v) cache.set(asOf, v); setText(v || null); })
      .catch(() => { if (alive) setText(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [asOf]);
  return { text, loading };
}
