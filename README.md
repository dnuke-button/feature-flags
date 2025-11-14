# Feature Flag Service API

A provider-agnostic feature flag API built with Fastify.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with hot reloading (automatically restarts on file changes):
```bash
npm run dev
```

The dev server will watch `app.js` and `server.js` and automatically restart when changes are detected.

3. Run tests:
```bash
npm test
```

## API Endpoints

The server will be available at `http://localhost:3000`

- **GET /flags** - List all loaded flags
- **GET /flags/{flagKey}** - Get value for a specific flag
- **GET /flags/{flagKey}/enabled** - Check if a flag is enabled (boolean)
- **POST /flags/refresh** - Refresh flag cache from provider

## Swagger Documentation

Swagger UI is available at `http://localhost:3000/docs`

Online documentation is deployed to `https://dnuke-button.github.io/feature-flags/`

The API specification is defined in `api.swagger`.

## Implementation Notes

- Currently uses an in-memory flag store with sample flags
- The flag store can be replaced with a real provider (e.g., LaunchDarkly, Split.io, etc.)
- Context parameter is parsed from JSON-encoded query string (for future use with targeting rules)

