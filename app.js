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
      querystring: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application identifier to scope flags' }
        }
      },
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
    const { applicationId } = request.query;
    // applicationId is available for future scoping logic
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
          applicationId: { type: 'string', description: 'Application identifier to scope flags' },
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
    const { applicationId } = request.query;
    const context = parseContext(request.query.context);
    
    // applicationId is available for future scoping logic
    const flag = flags.get(flagKey);
    if (!flag) {
      return reply.code(404).send({ error: 'Flag not found' });
    }
    
    return flag;
  });

  // POST /flags/refresh - Refresh flag cache
  fastify.post('/flags/refresh', {
    schema: {
      description: 'Refresh flag cache from provider',
      querystring: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application identifier to scope flags' }
        }
      },
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
    const { applicationId } = request.query;
    // applicationId is available for future scoping logic
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

  // POST /assignment - Get variation assignment for a user
  fastify.post('/assignment', {
    schema: {
      description: 'Get variation assignment for a user',
      querystring: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application identifier to scope flags' }
        }
      },
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User identifier (alternative to userAttributes)' },
          userAttributes: { 
            type: 'object', 
            description: 'User attributes object (alternative to userId)',
            additionalProperties: true
          }
        }
      },
      response: {
        200: {
          type: 'object',
          description: 'Variation object containing flag and assignment information',
          additionalProperties: true
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { applicationId } = request.query;
    const { userId, userAttributes } = request.body;
    
    // Validate that either userId or userAttributes is provided
    if (!userId && !userAttributes) {
      return reply.code(400).send({ 
        error: 'Either userId or userAttributes must be provided' 
      });
    }
    
    // In a real implementation, this would evaluate all flags and return variations
    // For now, we'll return a demo variation object
    // A Variation typically contains: flag key, variation value, and metadata
    
    // Build variation object - in real implementation, this would come from flag evaluation
    const variation = {
      flagKey: 'feature-new-ui',
      value: true,
      variation: 'on',
      assigned: true,
      reason: 'DEFAULT',
      lastUpdated: new Date().toISOString(),
      source: 'bootstrap'
    };
    
    return variation;
  });

  // POST /assignment/{flagKey} - Check if a user is assigned to a feature flag
  fastify.post('/assignment/:flagKey', {
    schema: {
      description: 'Check if a user is assigned to a feature flag',
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
          applicationId: { type: 'string', description: 'Application identifier to scope flags' }
        }
      },
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User identifier (alternative to userAttributes)' },
          userAttributes: { 
            type: 'object', 
            description: 'User attributes object (alternative to userId)',
            additionalProperties: true
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            assigned: { type: 'boolean', description: 'Whether the user is assigned' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
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
    const { applicationId } = request.query;
    const { userId, userAttributes } = request.body;
    
    // Validate that either userId or userAttributes is provided
    if (!userId && !userAttributes) {
      return reply.code(400).send({ 
        error: 'Either userId or userAttributes must be provided' 
      });
    }
    
    // Check if flag exists
    const flag = flags.get(flagKey);
    if (!flag) {
      return reply.code(404).send({ 
        error: 'Flag not found' 
      });
    }
    
    // In a real implementation, this would check assignment rules based on:
    // - applicationId
    // - flagKey
    // - userId or userAttributes
    // - flag targeting rules
    // For now, we'll implement a simple demo logic
    // This could check against assignment rules, user segments, etc.
    
    let assigned = false;
    
    if (userId) {
      // Simple demo: assign based on userId hash (deterministic)
      // In real implementation, this would check against assignment rules
      const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      assigned = hash % 2 === 0; // 50% assignment for demo
    } else if (userAttributes) {
      // Simple demo: assign based on userAttributes
      // In real implementation, this would check against targeting rules
      // For demo, check if user has certain attributes
      assigned = userAttributes.country === 'US' || userAttributes.plan === 'premium';
    }
    
    return {
      assigned
    };
  });

  return fastify;
}

