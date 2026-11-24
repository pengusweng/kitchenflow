const { test } = require('node:test');
const assert = require('node:assert/strict');
const configure = require('./android-build-config.cjs');

test('staging publishes updates against the shared API', () => {
  assert.deepEqual(configure({ branch: 'staging', env: {
    ANDROID_API_URL: 'https://shared.example.com/api/',
  } }), { apiUrl: 'https://shared.example.com/api', updatesEnabled: true });
});

test('development builds use the hosted demo but do not publish by default', () => {
  assert.deepEqual(configure({ branch: 'development', env: {} }), {
    apiUrl: 'https://kkfc-demo-api.onrender.com/api', updatesEnabled: false,
  });
});

test('every promotion branch uses the same configured URL and default', () => {
  for (const branch of ['development', 'staging', 'main']) {
    assert.equal(configure({ branch, env: {
      ANDROID_API_URL: 'https://shared.example.com/api',
    } }).apiUrl, 'https://shared.example.com/api');
    assert.equal(configure({ branch, env: {} }).apiUrl,
      'https://kkfc-demo-api.onrender.com/api');
  }
});

test('the update publisher can move to main without changing the API', () => {
  assert.deepEqual(configure({ branch: 'main', env: {
    ANDROID_API_URL: 'https://shared.example.com/api',
    ANDROID_UPDATE_BRANCH: 'main',
  } }), { apiUrl: 'https://shared.example.com/api', updatesEnabled: true });
  assert.equal(configure({ branch: 'staging', env: {
    ANDROID_UPDATE_BRANCH: 'main',
  } }).updatesEnabled, false);
});

test('main does not publish until the shared update channel is explicitly moved', () => {
  assert.equal(configure({ branch: 'main', env: {} }).updatesEnabled, false);
});

test('rejects insecure and malformed API configuration', () => {
  for (const apiUrl of ['http://example.com/api', 'https://example.com',
    'https://user:password@example.com/api', 'https://example.com/api?key=x',
    'https://example.com/api#fragment', 'not-a-url']) {
    assert.throws(() => configure({ branch: 'staging', env: {
      ANDROID_API_URL: apiUrl,
    } }));
  }
});
