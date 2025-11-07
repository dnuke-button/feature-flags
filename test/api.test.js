import { test } from 'tap';
import { buildApp, flags } from '../app.js';

test('GET /flags - should return all flags', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.ok(typeof data === 'object');
  t.ok('feature-new-ui' in data);
  t.ok('feature-analytics' in data);
  t.ok('max-items-per-page' in data);
  t.ok('api-version' in data);
  
  // Check structure of a flag
  const flag = data['feature-new-ui'];
  t.ok('value' in flag);
  t.ok('lastUpdated' in flag);
  t.ok('source' in flag);
  t.equal(typeof flag.lastUpdated, 'string');
  t.equal(typeof flag.source, 'string');
  
  await app.close();
});

test('GET /flags/:flagKey - should return specific flag', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/feature-new-ui'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(data.value, true);
  t.ok('lastUpdated' in data);
  t.ok('source' in data);
  
  await app.close();
});

test('GET /flags/:flagKey - should return 404 for non-existent flag', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/non-existent-flag'
  });
  
  t.equal(response.statusCode, 404);
  const data = response.json();
  t.equal(data.error, 'Flag not found');
  
  await app.close();
});

test('GET /flags/:flagKey - should accept context query parameter', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const context = JSON.stringify({ userId: '123', country: 'US' });
  const response = await app.inject({
    method: 'GET',
    url: `/flags/feature-new-ui?context=${encodeURIComponent(context)}`
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(data.value, true);
  
  await app.close();
});

test('GET /flags/:flagKey/enabled - should return enabled status for boolean flag', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/feature-new-ui/enabled'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(typeof data.enabled, 'boolean');
  t.equal(data.enabled, true);
  t.ok('lastUpdated' in data);
  t.ok('source' in data);
  
  await app.close();
});

test('GET /flags/:flagKey/enabled - should return enabled=false for disabled boolean flag', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/feature-analytics/enabled'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(typeof data.enabled, 'boolean');
  t.equal(data.enabled, false);
  
  await app.close();
});

test('GET /flags/:flagKey/enabled - should convert number flag to boolean', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/max-items-per-page/enabled'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(typeof data.enabled, 'boolean');
  // 50 is non-zero, so should be true
  t.equal(data.enabled, true);
  
  await app.close();
});

test('GET /flags/:flagKey/enabled - should convert string flag to boolean', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/api-version/enabled'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(typeof data.enabled, 'boolean');
  // 'v2' is not 'true' or '1', so should be false
  t.equal(data.enabled, false);
  
  await app.close();
});

test('GET /flags/:flagKey/enabled - should return 404 for non-existent flag', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/non-existent-flag/enabled'
  });
  
  t.equal(response.statusCode, 404);
  const data = response.json();
  t.equal(data.error, 'Flag not found');
  
  await app.close();
});

test('POST /flags/refresh - should refresh all flags', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  // Get initial timestamp
  const initialResponse = await app.inject({
    method: 'GET',
    url: '/flags/feature-new-ui'
  });
  const initialFlag = initialResponse.json();
  const initialTimestamp = initialFlag.lastUpdated;
  
  // Wait a bit to ensure timestamp changes
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Refresh flags
  const refreshResponse = await app.inject({
    method: 'POST',
    url: '/flags/refresh'
  });
  
  t.equal(refreshResponse.statusCode, 200);
  const refreshData = refreshResponse.json();
  t.equal(refreshData.refreshed, true);
  t.ok('timestamp' in refreshData);
  t.equal(typeof refreshData.timestamp, 'string');
  
  // Verify flags were updated
  const updatedResponse = await app.inject({
    method: 'GET',
    url: '/flags/feature-new-ui'
  });
  const updatedFlag = updatedResponse.json();
  
  // Timestamp should be updated (or at least equal to refresh timestamp)
  t.ok(updatedFlag.lastUpdated >= initialTimestamp);
  t.equal(updatedFlag.lastUpdated, refreshData.timestamp);
  
  await app.close();
});

test('POST /flags/refresh - should update all flags with same timestamp', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const refreshResponse = await app.inject({
    method: 'POST',
    url: '/flags/refresh'
  });
  
  t.equal(refreshResponse.statusCode, 200);
  const refreshData = refreshResponse.json();
  const refreshTimestamp = refreshData.timestamp;
  
  // Check all flags have the same timestamp
  const flagsResponse = await app.inject({
    method: 'GET',
    url: '/flags'
  });
  const allFlags = flagsResponse.json();
  
  for (const flagKey in allFlags) {
    t.equal(allFlags[flagKey].lastUpdated, refreshTimestamp, 
      `Flag ${flagKey} should have updated timestamp`);
  }
  
  await app.close();
});

