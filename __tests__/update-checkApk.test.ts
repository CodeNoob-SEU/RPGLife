import { checkApk } from '../src/services/update/checkApk';

function ghRelease(body: any, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as any);
}

afterEach(() => { (global as any).fetch = undefined; });

test('newer release with .apk asset → available + download url + stripped version + notes', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({
    tag_name: 'v1.1.0',
    html_url: 'https://gh/rel',
    body: 'changelog',
    assets: [{ name: 'rpglife.apk', browser_download_url: 'https://gh/rpglife.apk' }],
  }));
  const r = await checkApk('1.0.0');
  expect(r).toEqual({ available: true, latestVersion: '1.1.0', url: 'https://gh/rpglife.apk', notes: 'changelog' });
});

test('same or older version → not available', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({ tag_name: 'v1.0.0', html_url: 'x', assets: [] }));
  expect((await checkApk('1.0.0')).available).toBe(false);
});

test('no .apk asset → falls back to release html_url', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({
    tag_name: 'v2.0.0',
    html_url: 'https://gh/rel',
    assets: [{ name: 'notes.txt', browser_download_url: 'x' }],
  }));
  const r = await checkApk('1.0.0');
  expect(r.available).toBe(true);
  expect(r.url).toBe('https://gh/rel');
});

test('404 (no releases yet) → not available, no error', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({}, 404));
  expect(await checkApk('1.0.0')).toEqual({ available: false });
});

test('network rejection → available:false with a string error', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
  const r = await checkApk('1.0.0');
  expect(r.available).toBe(false);
  expect(typeof r.error).toBe('string');
});
