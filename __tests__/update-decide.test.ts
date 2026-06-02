import { decideUpdate } from '../src/domain/update/decide';

const noOta = { enabled: true, available: false };
const noApk = { available: false };

test('OTA available → ota (OTA 优先)', () => {
  expect(decideUpdate({ enabled: true, available: true }, noApk)).toEqual({ kind: 'ota' });
});

test('OTA + APK both available → ota with alsoApk note', () => {
  const r = decideUpdate(
    { enabled: true, available: true },
    { available: true, latestVersion: '1.1.0', url: 'http://x/app.apk' },
  );
  expect(r).toEqual({ kind: 'ota', alsoApk: { latestVersion: '1.1.0', url: 'http://x/app.apk' } });
});

test('only APK available → apk', () => {
  const r = decideUpdate(noOta, { available: true, latestVersion: '1.2.0', url: 'http://x/app.apk', notes: 'hi' });
  expect(r).toEqual({ kind: 'apk', latestVersion: '1.2.0', url: 'http://x/app.apk', notes: 'hi' });
});

test('nothing available, all checked ok → uptodate', () => {
  expect(decideUpdate(noOta, noApk)).toEqual({ kind: 'uptodate' });
});

test('OTA disabled (web/dev), APK no update → unsupported', () => {
  expect(decideUpdate({ enabled: false, available: false }, noApk)).toEqual({ kind: 'unsupported' });
});

test('a check errored with nothing found → error (not falsely uptodate)', () => {
  expect(decideUpdate(noOta, { available: false, error: 'network' }).kind).toBe('error');
  expect(decideUpdate({ enabled: true, available: false, error: 'x' }, noApk).kind).toBe('error');
});

test('one path errors but the other has an update → still surfaces the update', () => {
  const r = decideUpdate(
    { enabled: true, available: false, error: 'ota down' },
    { available: true, latestVersion: '1.1.0', url: 'u' },
  );
  expect(r.kind).toBe('apk');
});
