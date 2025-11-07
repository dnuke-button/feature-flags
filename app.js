import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

// In-memory flag store (can be replaced with a real provider)
export const flags = new Map();

// Initialize with some sample flags
flags.set('feature-new-ui', {
  value: true,
  lastUpdated: new Date().toISOString(),
  source: 'bootstrap'
});

flags.set('feature-analytics', {
  value: false,
  lastUpdated: new Date().toISOString(),
  source: 'bootstrap'
});

flags.set('max-items-per-page', {
  value: 50,
  lastUpdated: new Date().toISOString(),
  source: 'bootstrap'
});

flags.set('api-version', {
  value: 'v2',
  lastUpdated: new Date().toISOString(),
  source: 'bootstrap'
});

// Helper function to parse context
function parseContext(contextString) {
  if (!contextString) return {};
  try {
    return JSON.parse(contextString);
  } catch (e) {
    return {};
  }
}

// Build Fastify app
export async function buildApp(opts = {}) {
  const fastify = Fastify({
    logger: opts.logger !== false
  });

  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Feature Flag Service API',
        version: '1.0.0',
        description: 'Provider-agnostic feature flag API'
      },
      servers: [
        {
          url: 'http://localhost:3000'
        }
      ]
    }
  });

  // Register Swagger UI (only in non-test mode)
  if (opts.enableSwaggerUI !== false) {
    await fastify.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      },
      staticCSP: true,
      transformStaticCSP: (header) => header
    });
  }

  // GET /flags - List all flags
  fastify.get('/flags', {
    schema: {
      description: 'List all loaded flags',
      response: {
        200: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              value: {
                oneOf: [
                  { type: 'boolean' },
                  { type: 'number' },
                  { type: 'string' },
                  { type: 'object' }
                ]
              },
              lastUpdated: { type: 'string', format: 'date-time' },
              source: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = {};
    for (const [key, flag] of flags.entries()) {
      result[key] = flag;
    }
    return result;
  });

  // GET /flags/{flagKey} - Get specific flag
  fastify.get('/flags/:flagKey', {
    schema: {
      description: 'Get value for a specific flag',
      params: {
        type: 'object',
        properties: {
          flagKey: { type: 'string' }
        },
        required: ['flagKey']
      },
      querystring: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'JSON-encoded context (userId, country, etc.)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            value: {
              oneOf: [
                { type: 'boolean' },
                { type: 'number' },
                { type: 'string' },
                { type: 'object' }
              ]
            },
            lastUpdated: { type: 'string', format: 'date-time' },
            source: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { flagKey } = request.params;
    const context = parseContext(request.query.context);
    
    const flag = flags.get(flagKey);
    if (!flag) {
      return reply.code(404).send({ error: 'Flag not found' });
    }
    
    return flag;
  });

  // GET /flags/{flagKey}/enabled - Check if flag is enabled
  fastify.get('/flags/:flagKey/enabled', {
    schema: {
      description: 'Check if a flag is enabled (boolean)',
      params: {
        type: 'object',
        properties: {
          flagKey: { type: 'string' }
        },
        required: ['flagKey']
      },
      querystring: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'JSON-encoded context' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            lastUpdated: { type: 'string', format: 'date-time' },
            source: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { flagKey } = request.params;
    const context = parseContext(request.query.context);
    
    const flag = flags.get(flagKey);
    if (!flag) {
      return reply.code(404).send({ error: 'Flag not found' });
    }
    
    // Convert value to boolean if needed
    let enabled = false;
    if (typeof flag.value === 'boolean') {
      enabled = flag.value;
    } else if (typeof flag.value === 'string') {
      enabled = flag.value.toLowerCase() === 'true' || flag.value === '1';
    } else if (typeof flag.value === 'number') {
      enabled = flag.value !== 0;
    }
    
    return {
      enabled,
      lastUpdated: flag.lastUpdated,
      source: flag.source
    };
  });

  // POST /flags/refresh - Refresh flag cache
  fastify.post('/flags/refresh', {
    schema: {
      description: 'Refresh flag cache from provider',
      response: {
        200: {
          type: 'object',
          properties: {
            refreshed: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // In a real implementation, this would fetch from a provider
    // For now, we'll just update the lastUpdated timestamp
    const timestamp = new Date().toISOString();
    
    for (const [key, flag] of flags.entries()) {
      flags.set(key, {
        ...flag,
        lastUpdated: timestamp
      });
    }
    
    return {
      refreshed: true,
      timestamp
    };
  });

  return fastify;
}

