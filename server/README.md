# server

Spring Boot modular monolith (Spring Modulith), written by hand.

Package-by-module: `people`, `tags`, `search`, `chat`, `media`. Each module owns its data and exposes a small public API; Spring Modulith verifies the boundaries in tests.

It implements the contract in [`../api/openapi.yaml`](../api) and runs against the local stack in [`../infra`](../infra).

No code yet.
