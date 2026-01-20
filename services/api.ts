type ApiResult<T> = {
  code: number;
  message?: string;
  data: T;
};

const API_BASE = "/api";

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const url = buildUrl(path);
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResult<T>;
  return json;
}

export function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

