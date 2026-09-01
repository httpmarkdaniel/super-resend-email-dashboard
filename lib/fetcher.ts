export class ApiError extends Error {}

export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? "Request failed.");
  }
  return res.json() as Promise<T>;
}
