// Types mirror ServiceTracker.Contracts (System.Text.Json writes camelCase, DateOnly as "yyyy-MM-dd").

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface WorkDay {
  id: string;
  userId: string;
  date: string;
  workedHours: number;
}

export interface RegisterData {
  username: string;
  name: string;
  surname: string;
  email: string;
  password: string;
}

/** Thrown for every failed call; `messages` are ready to show to the user. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(' '));
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

// ---- token + session handling ----

const TOKEN_KEY = 'serviceTracker.token';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: the session just won't survive a reload */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

let unauthorizedHandler: (() => void) | undefined;

/** Called when an authenticated request comes back 401 (expired or invalid token). */
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler;
}

// ---- request plumbing ----

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

function fallbackMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return "You don't have access to that.";
    case 404:
      return 'Not found.';
    default:
      return `Something went wrong (HTTP ${status}).`;
  }
}

// The API answers with ProblemDetails ({ title, errors: { Field: [..] } }),
// or { errors: [..] } for registration, or an empty body (401/403/404).
async function readMessages(response: Response): Promise<string[]> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (body && typeof body === 'object') {
    const { errors, title } = body as { errors?: unknown; title?: unknown };
    if (Array.isArray(errors) && errors.length > 0) return errors.map(String);
    if (errors && typeof errors === 'object') {
      const flat = Object.values(errors).flat().map(String);
      if (flat.length > 0) return flat;
    }
    if (typeof title === 'string' && title) return [title];
  }
  return [fallbackMessage(response.status)];
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Send the bearer token and treat 401 as "session expired". Default true. */
  auth?: boolean;
  unauthorizedMessage?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, unauthorizedMessage } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, ['Cannot reach the server. Is the API running?']);
  }

  if (response.status === 401 && auth) {
    tokenStore.clear();
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const messages =
      response.status === 401 && unauthorizedMessage ? [unauthorizedMessage] : await readMessages(response);
    throw new ApiError(response.status, messages);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ---- endpoints ----

export async function login(username: string, password: string): Promise<string> {
  const result = await request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
    unauthorizedMessage: 'Wrong username or password, or the account is temporarily locked.',
  });
  return result.token;
}

export function register(data: RegisterData): Promise<User> {
  return request<User>('/api/auth/register', { method: 'POST', body: data, auth: false });
}

export function me(): Promise<User> {
  return request<User>('/api/auth/me');
}

export function listWorkDays(from?: string, to?: string): Promise<WorkDay[]> {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const suffix = query.size > 0 ? `?${query}` : '';
  return request<WorkDay[]>(`/api/workdays${suffix}`);
}

export function createWorkDay(date: string, workedHours: number): Promise<WorkDay> {
  return request<WorkDay>('/api/workdays', { method: 'POST', body: { date, workedHours } });
}

export function updateWorkDay(id: string, workedHours: number): Promise<WorkDay> {
  return request<WorkDay>(`/api/workdays/${id}`, { method: 'PUT', body: { workedHours } });
}

export function deleteWorkDay(id: string): Promise<void> {
  return request<void>(`/api/workdays/${id}`, { method: 'DELETE' });
}
