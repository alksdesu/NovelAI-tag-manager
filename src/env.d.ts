/// <reference types="vite-plugin-monkey/client" />

// GM_* API type declarations for Tampermonkey/Violentmonkey
// These are provided by vite-plugin-monkey/client at runtime,
// but we declare them here for IDE support in non-monkey contexts.

interface GMXMLHttpRequestDetails {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  url: string;
  headers?: Record<string, string>;
  data?: string | Blob | FormData;
  timeout?: number;
  responseType?: 'text' | 'json' | 'blob' | 'arraybuffer' | 'document';
  onload?: (response: GMXMLHttpRequestResponse) => void;
  onerror?: (error: GMXMLHttpRequestResponse) => void;
  ontimeout?: () => void;
  onprogress?: (progress: { loaded: number; total: number }) => void;
}

interface GMXMLHttpRequestResponse {
  status: number;
  statusText: string;
  responseText: string;
  responseHeaders: string;
  response: unknown;
  finalUrl: string;
  error?: string;
}

interface GMXMLHttpRequestHandle {
  abort: () => void;
}

declare function GM_xmlhttpRequest(details: GMXMLHttpRequestDetails): GMXMLHttpRequestHandle;

// GM_getValue / GM_setValue for secure storage
declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;
