const BASE = (window as any).__CONFIG__?.API_URL ?? "http://localhost:8080";
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}


function friendly(status: number, body: any): string {
  if (body?.error) return body.error;
  if (body?.errors) return Object.values(body.errors).flat().join(" ");
  if (status === 404) return "Not found.";
  if (status === 403) return "This application belongs to another student.";
  if (status === 409) return "That action is no longer possible. Please refresh.";
  return "Something went wrong. Please try again.";
}

export async function api<T>(path: string, opts: RequestInit & { studentId?: string } = {}): Promise<T> {
  const { studentId, ...init } = opts;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(studentId ? { "X-Student-Id": studentId } : {}),
      },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, friendly(res.status, body));
  return body as T;
}