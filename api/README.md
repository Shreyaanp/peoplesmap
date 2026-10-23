# api

The shared API contract. It is the only place an endpoint is defined:

- `openapi.yaml`: the REST API (OpenAPI 3.1). `web/` generates its TypeScript types and typed mock handlers from it; `server/` implements it.
- `realtime.md`: the STOMP over WebSocket events, which OpenAPI cannot describe.

Lint it with:

```
npx @redocly/cli lint api/openapi.yaml --config api/redocly.yaml
```

Change the contract first, then the code on both sides.
