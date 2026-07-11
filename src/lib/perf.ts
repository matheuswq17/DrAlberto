const ENABLED = process.env.PERF_LOG === "1";

/**
 * Timing de diagnóstico, sem PII — só nomes de etapa e duração em ms.
 * Fica em no-op a menos que PERF_LOG=1 (dev/staging), custo zero em produção
 * normal.
 */
export async function perfTime<T>(label: string, promise: PromiseLike<T>): Promise<T> {
  if (!ENABLED) return promise;
  const t0 = performance.now();
  const result = await promise;
  console.log(`[perf] ${label} completed in ${Math.round(performance.now() - t0)}ms`);
  return result;
}
