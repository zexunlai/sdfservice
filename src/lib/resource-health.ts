export type ResourceHealth = 'healthy' | 'redirected' | 'blocked' | 'broken' | 'timeout' | 'unknown';

export interface ResourceCheckResult {
  method: 'HEAD' | 'GET';
  http_status: number | null;
  final_url: string | null;
  redirect_count: number;
  content_type: string | null;
  duration_ms: number;
  result: ResourceHealth;
  error_code: string | null;
  error_detail: string | null;
  headers: Headers | null;
}

export function classifyResourceStatus(status: number, redirected = false): ResourceHealth {
  if (status === 403) return 'blocked';
  if (status === 404 || status === 410 || status >= 500) return 'broken';
  if (status >= 200 && status < 300) return redirected ? 'redirected' : 'healthy';
  if (status >= 300 && status < 400) return 'redirected';
  return 'unknown';
}

export async function checkResourceUrl(
  url: string,
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ResourceCheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    let method: 'HEAD' | 'GET' = 'HEAD';
    let response = await fetchImpl(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'EnvironmentalIntelligenceResourceMonitor/1.0' },
    });
    if (response.status === 405 || response.status === 501) {
      method = 'GET';
      response = await fetchImpl(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: { Range: 'bytes=0-32767', 'user-agent': 'EnvironmentalIntelligenceResourceMonitor/1.0' },
      });
    }
    return {
      method,
      http_status: response.status,
      final_url: response.url || url,
      redirect_count: response.redirected ? 1 : 0,
      content_type: response.headers.get('content-type'),
      duration_ms: Date.now() - started,
      result: classifyResourceStatus(response.status, response.redirected),
      error_code: null,
      error_detail: null,
      headers: response.headers,
    };
  } catch (error: any) {
    const timedOut = error?.name === 'AbortError';
    return {
      method: 'HEAD', http_status: null, final_url: null, redirect_count: 0,
      content_type: null, duration_ms: Date.now() - started,
      result: timedOut ? 'timeout' : 'unknown',
      error_code: error?.name ?? 'fetch_error', error_detail: String(error?.message ?? error), headers: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
