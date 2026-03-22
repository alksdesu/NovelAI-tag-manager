export interface GmRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  url: string;
  headers?: Record<string, string>;
  data?: string | Blob | FormData;
  timeout?: number;
  responseType?: 'text' | 'json' | 'blob' | 'arraybuffer';
}

export interface GmResponse {
  status: number;
  statusText: string;
  text: string;
  headers: string;
  response: unknown;
  finalUrl: string;
}

export interface GmAbortHandle {
  abort: () => void;
}

export interface GmRequestResult {
  promise: Promise<GmResponse>;
  handle: GmAbortHandle;
}

/**
 * Promise wrapper for GM_xmlhttpRequest.
 * Returns both the promise and an abort handle.
 */
export function gmRequest(options: GmRequestOptions): GmRequestResult {
  let handle: GmAbortHandle = { abort: () => {} };

  const promise = new Promise<GmResponse>((resolve, reject) => {
    const h = GM_xmlhttpRequest({
      method: options.method,
      url: options.url,
      headers: options.headers,
      data: options.data as string | Blob | FormData | undefined,
      timeout: options.timeout ?? 30000,
      responseType: options.responseType as XMLHttpRequestResponseType | undefined,
      onload(resp) {
        resolve({
          status: resp.status,
          statusText: resp.statusText,
          text: resp.responseText,
          headers: resp.responseHeaders,
          response: resp.response,
          finalUrl: resp.finalUrl,
        });
      },
      onerror(err) {
        reject(new Error((err as { error?: string })?.error || 'Network error'));
      },
      ontimeout() {
        reject(new Error('Request timed out'));
      },
    });
    handle = { abort: () => (h as { abort?: () => void })?.abort?.() };
  });

  return { promise, handle };
}

/**
 * Convenience: GET JSON
 */
export async function gmGetJSON<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
  const { promise } = gmRequest({
    method: 'GET',
    url,
    headers: { Accept: 'application/json', ...headers },
  });
  const resp = await promise;
  if (resp.status >= 400 || resp.status === 0) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText || 'Request failed'}`);
  }
  try {
    return JSON.parse(resp.text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

/**
 * Convenience: GET blob (for image proxy)
 */
export function gmGetBlob(
  url: string,
  headers?: Record<string, string>,
  timeout?: number,
): GmRequestResult {
  return gmRequest({
    method: 'GET',
    url,
    headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*', ...headers },
    responseType: 'blob',
    timeout: timeout ?? 20000,
  });
}
