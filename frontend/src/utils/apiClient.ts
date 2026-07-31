/**
 * Safe API Client & JSON Response Parser
 * Guarantees that HTML error responses (404/500/IIS fallback pages) never crash React with SyntaxError ('Unexpected token <').
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    return await parseResponse<T>(res);
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Network communication failure.',
    };
  }
}

export async function parseResponse<T = any>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: `Server returned non-JSON format (${res.status} ${res.statusText || 'Error'}).`,
    };
  }

  try {
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.message || data?.details || data?.error || `HTTP ${res.status} ${res.statusText}`;
      return {
        ok: false,
        status: res.status,
        data,
        error: errorMsg,
      };
    }
    return {
      ok: true,
      status: res.status,
      data,
      error: null,
    };
  } catch (parseErr: any) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: `Invalid JSON response: ${parseErr.message}`,
    };
  }
}
