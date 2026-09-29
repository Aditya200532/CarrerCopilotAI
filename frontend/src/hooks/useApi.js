import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../api/client.js';

/**
 * Polls an AI analysis until it leaves the queued/processing state.
 * This is the frontend half of the queue architecture: POST returns 202 with
 * an analysisId, then we poll for completion (notifications also arrive live).
 */
export function useAnalysisPolling(analysisId, { intervalMs = 3000 } = {}) {
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!analysisId) return undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await endpoints.analysis.status(analysisId);
        if (cancelled) return;
        setAnalysis(res.data);
        if (res.data.status === 'queued' || res.data.status === 'processing') {
          timer.current = setTimeout(tick, intervalMs);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [analysisId, intervalMs]);

  return { analysis, error, done: analysis?.status === 'completed', failed: analysis?.status === 'failed' };
}

/** Simple fetch-on-mount helper with loading/error state and manual refetch. */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res?.data !== undefined ? res.data : res);
      setMeta(res?.meta || null);
      return res;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, deps);
  return { data, meta, loading, error, refetch: load, setData };
}
