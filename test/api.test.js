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

test('GET /flags - should accept applicationId query parameter', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags?applicationId=my-app-123'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.ok(typeof data === 'object');
  t.ok('feature-new-ui' in data);
  
  await app.close();
});

test('GET /flags/:flagKey - should accept applicationId query parameter', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/flags/feature-new-ui?applicationId=my-app-123'
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(data.value, true);
  
  await app.close();
});

test('POST /assignment - should return variation object with userId', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment?applicationId=my-app-123',
    payload: {
      userId: 'user-123'
    }
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.ok(typeof data === 'object');
  t.ok('flagKey' in data);
  t.ok('value' in data);
  t.ok('variation' in data);
  t.ok('assigned' in data);
  
  await app.close();
});

test('POST /assignment - should return variation object with userAttributes', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment?applicationId=my-app-123',
    payload: {
      userAttributes: {
        country: 'US',
        plan: 'free'
      }
    }
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.ok(typeof data === 'object');
  t.ok('flagKey' in data);
  t.ok('value' in data);
  t.ok('variation' in data);
  
  await app.close();
});

test('POST /assignment - should return 400 when neither userId nor userAttributes provided', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment?applicationId=my-app-123',
    payload: {}
  });
  
  t.equal(response.statusCode, 400);
  const data = response.json();
  t.equal(data.error, 'Either userId or userAttributes must be provided');
  
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

test('POST /assignment/:flagKey - should return assignment result with userId', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment/feature-new-ui?applicationId=my-app-123',
    payload: {
      userId: 'user-123'
    }
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(typeof data.assigned, 'boolean');
  
  await app.close();
});

test('POST /assignment/:flagKey - should return assignment result with userAttributes', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment/feature-new-ui?applicationId=my-app-123',
    payload: {
      userAttributes: {
        country: 'US',
        plan: 'free'
      }
    }
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(typeof data.assigned, 'boolean');
  
  await app.close();
});

test('POST /assignment/:flagKey - should assign user with US country attribute', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment/feature-new-ui?applicationId=my-app-123',
    payload: {
      userAttributes: {
        country: 'US',
        plan: 'free'
      }
    }
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(data.assigned, true); // US country should assign
  
  await app.close();
});

test('POST /assignment/:flagKey - should assign user with premium plan', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment/feature-new-ui?applicationId=my-app-123',
    payload: {
      userAttributes: {
        country: 'CA',
        plan: 'premium'
      }
    }
  });
  
  t.equal(response.statusCode, 200);
  const data = response.json();
  t.equal(data.assigned, true); // Premium plan should assign
  
  await app.close();
});

test('POST /assignment/:flagKey - should return 400 when neither userId nor userAttributes provided', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment/feature-new-ui?applicationId=my-app-123',
    payload: {}
  });
  
  t.equal(response.statusCode, 400);
  const data = response.json();
  t.equal(data.error, 'Either userId or userAttributes must be provided');
  
  await app.close();
});

test('POST /assignment/:flagKey - should return 404 when flag not found', async (t) => {
  const app = await buildApp({ logger: false, enableSwaggerUI: false });
  
  const response = await app.inject({
    method: 'POST',
    url: '/assignment/non-existent-flag?applicationId=my-app-123',
    payload: {
      userId: 'user-123'
    }
  });
  
  t.equal(response.statusCode, 404);
  const data = response.json();
  t.equal(data.error, 'Flag not found');
  
  await app.close();
});

