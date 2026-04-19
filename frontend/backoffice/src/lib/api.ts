import { dispatchMock } from "./mock/handlers";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): URL {
  const url = new URL(
    path.startsWith("http") ? path : `${BASE_URL}${path}`,
    typeof window === "undefined" ? undefined : window.location.origin,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  const message =
    (body as { title?: string; message?: string } | null)?.title ??
    (body as { title?: string; message?: string } | null)?.message ??
    res.statusText;
  throw new ApiError(res.status, message, body);
}

function actorHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const label = window.localStorage.getItem("catl.actorLabel");
  return label ? { "X-Actor-Label": label } : {};
}

function performFetch(url: URL, init: RequestInit): Promise<Response> {
  if (USE_MOCKS) return dispatchMock(url, init);
  return fetch(url.toString(), init);
}

export const api = {
  get<T>(path: string, query?: Query): Promise<T> {
    const url = buildUrl(path, query);
    return performFetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...actorHeader() },
    }).then((r) => handle<T>(r));
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    const url = buildUrl(path);
    return performFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...actorHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((r) => handle<T>(r));
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    const url = buildUrl(path);
    return performFetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...actorHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((r) => handle<T>(r));
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    const url = buildUrl(path);
    return performFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...actorHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((r) => handle<T>(r));
  },
  delete<T>(path: string): Promise<T> {
    const url = buildUrl(path);
    return performFetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json", ...actorHeader() },
    }).then((r) => handle<T>(r));
  },
};
