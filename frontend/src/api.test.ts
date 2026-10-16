import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createWorkDay,
  deleteWorkDay,
  listWorkDays,
  login,
  me,
  register,
  setUnauthorizedHandler,
  tokenStore,
} from './api';

const fetchMock = vi.fn();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit & { headers: Record<string, string> } };
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
  setUnauthorizedHandler(undefined);
});

describe('login', () => {
  it('posts the credentials, returns the token and never sends a stale token', async () => {
    tokenStore.set('stale');
    fetchMock.mockResolvedValue(json({ token: 'jwt-123' }));

    expect(await login('jane', 'Passw0rd!')).toBe('jwt-123');

    const { url, init } = lastCall();
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ username: 'jane', password: 'Passw0rd!' });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('turns a 401 into a friendly message and keeps the stored token untouched', async () => {
    tokenStore.set('keep-me');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(login('jane', 'nope')).rejects.toMatchObject({
      status: 401,
      messages: ['Wrong username or password, or the account is temporarily locked.'],
    });
    expect(tokenStore.get()).toBe('keep-me');
  });
});

describe('authenticated requests', () => {
  it('send the bearer token', async () => {
    tokenStore.set('jwt-123');
    fetchMock.mockResolvedValue(json({ id: '1' }));

    await me();

    expect(lastCall().init.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('clear the token and notify the app on 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    tokenStore.set('expired');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(me()).rejects.toBeInstanceOf(ApiError);

    expect(tokenStore.get()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('report an unreachable server', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(me()).rejects.toMatchObject({ status: 0, messages: ['Cannot reach the server. Is the API running?'] });
  });
});

describe('work days', () => {
  it('listWorkDays sends the date range as query parameters', async () => {
    fetchMock.mockResolvedValue(json([]));

    await listWorkDays('2026-10-01', '2026-10-31');

    expect(lastCall().url).toBe('/api/workdays?from=2026-10-01&to=2026-10-31');
  });

  it('listWorkDays without a range has no query string', async () => {
    fetchMock.mockResolvedValue(json([]));

    await listWorkDays();

    expect(lastCall().url).toBe('/api/workdays');
  });

  it('createWorkDay posts the date and hours', async () => {
    fetchMock.mockResolvedValue(json({ id: '1', userId: 'u', date: '2026-10-16', workedHours: 8 }, 201));

    const created = await createWorkDay('2026-10-16', 8);

    expect(created.id).toBe('1');
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ date: '2026-10-16', workedHours: 8 });
  });

  it('deleteWorkDay resolves on 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteWorkDay('abc')).resolves.toBeUndefined();
    expect(lastCall().url).toBe('/api/workdays/abc');
    expect(lastCall().init.method).toBe('DELETE');
  });
});

describe('error messages', () => {
  it('flatten ASP.NET validation errors', async () => {
    fetchMock.mockResolvedValue(
      json({ title: 'One or more validation errors occurred.', errors: { WorkedHours: ['must be between 0.01 and 24'] } }, 400),
    );

    await expect(createWorkDay('2026-10-16', 99)).rejects.toMatchObject({ messages: ['must be between 0.01 and 24'] });
  });

  it('use the plain list from registration failures', async () => {
    fetchMock.mockResolvedValue(json({ errors: ['Password too short.', 'Email taken.'] }, 400));

    await expect(
      register({ username: 'a', name: 'A', surname: 'B', email: 'a@b.c', password: 'x' }),
    ).rejects.toMatchObject({ messages: ['Password too short.', 'Email taken.'] });
  });

  it('use the problem title, e.g. for a duplicate day (409)', async () => {
    fetchMock.mockResolvedValue(json({ title: 'A work day already exists for this date.', status: 409 }, 409));

    await expect(createWorkDay('2026-10-16', 8)).rejects.toMatchObject({
      status: 409,
      messages: ['A work day already exists for this date.'],
    });
  });

  it('fall back to a status based message for empty bodies', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(listWorkDays()).rejects.toMatchObject({ messages: ["You don't have access to that."] });
  });
});
