import { useEffect, useRef } from 'react';

export default function useAnalysisUpdates(projectId, refresh) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!projectId) return undefined;
    const updated = event => {
      if (event.detail == null || String(projectId) === String(event.detail)) latest.current();
    };
    window.addEventListener('cfp-analysis-updated', updated);
    return () => window.removeEventListener('cfp-analysis-updated', updated);
  }, [projectId]);
}
