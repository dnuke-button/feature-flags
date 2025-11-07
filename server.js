import { buildApp } from './app.js';

// Start server
const start = async () => {
  try {
    const fastify = await buildApp();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3000');
    console.log('Swagger UI available at http://localhost:3000/docs');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

