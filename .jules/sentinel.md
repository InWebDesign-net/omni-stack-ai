## 2024-05-18 - Prevent Directory Traversal via startsWith Incomplete Matching
**Vulnerability:** Directory traversal allowed access to siblings of the target directory (e.g., `/root/media-secret`) due to `resolvedPath.startsWith(MEDIA_ROOT)` missing a trailing separator.
**Learning:** `startsWith` on a directory path without a trailing separator acts as a string prefix match, not a path component match. Thus, `/root/media-secret` starts with `/root/media`.
**Prevention:** Always ensure directory checks append the OS-specific path separator (`path.sep`) to the target base directory, or strictly compare the full resolved path.

## 2026-08-15 - [CRITICAL] Path Traversal Vulnerabilities in Next.js API Routes
**Vulnerability:** The API routes for the feed proxy (`/api/feed/[...path]/route.ts`) and chunk upload (`/api/upload/chunk/route.ts`) were susceptible to path traversal attacks. The proxy blindly constructed paths using user-controlled input, potentially allowing access to arbitrary endpoints on the backend proxy server. The upload route used the `uploadId` parameter to construct local temp file paths without sanitization, leading to an arbitrary file write vulnerability on the filesystem.
**Learning:** Even internal or proxy Next.js route handlers must heavily validate all dynamic segments (`[...path]`) and user-supplied form data, as Node/Next APIs accept and process malicious characters like `..` natively, passing them directly to filesystem operations or downstream requests.
**Prevention:** Always validate and sanitize all dynamic path segments and user-provided IDs using regular expressions (e.g. `/[^a-zA-Z0-9_-]/g`) and reject payloads containing directory traversal characters (`.`, `..`) before processing them.

## 2026-08-15 - [CRITICAL] Hardcoded Secrets Fallbacks
**Vulnerability:** Fallbacks for INGEST_WORKER_SECRET and STRAPI_PREVIEW_SECRET were hardcoded in NextJS preview routes and Strapi config/endpoints.
**Learning:** Relying on '|| "hardcoded_string"' in environment variable resolution creates severe backdoors in security-sensitive endpoints (like video ingestion and preview functionality) if the actual environment variables fail to load or are forgotten.
**Prevention:** Never use hardcoded fallbacks for secrets. Enforce the presence of configuration and fail safely (throw Error or return HTTP 500/401/403) when required secrets are missing from the environment.

## 2026-08-15 - [Fix Hardcoded JWT Secret in socket Microservice]
**Vulnerability:** Found a hardcoded fallback value (`'9ukrMWtnoIulQCWQbXoWRQ=='`) for the `JWT_SECRET` in `socket/src/index.ts`.
**Learning:** Hardcoding a fallback secret introduces a critical vulnerability where an attacker with access to the codebase can forge authentication tokens if the environment variable is not explicitly set. The service allowed silent fallback to insecure states.
**Prevention:** Always enforce "fail-fast" or "fail securely" patterns. If a critical security variable is missing, explicitly log a fatal error and call `process.exit(1)` rather than providing a default secret.

## 2026-08-16 - [HIGH] XSS Vulnerability in JSON-LD Metadata & Unauthenticated Mutation Fallback
**Vulnerability:** Next.js pages embedded JSON-LD SEO metadata using `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` without escaping HTML tag break-outs (`<`, `>`, `&`). Additionally, `/api/video/settings/route.ts` fell back to `process.env.STRAPI_API_TOKEN` for `PUT` mutations when no user token was provided.
**Learning:** `JSON.stringify` does not escape HTML characters such as `<` or `>`, allowing user-controlled input (like usernames, titles, or bios) to breakout of `<script type="application/ld+json">` tags. Furthermore, proxy API routes must strictly enforce user authentication for state mutation routes without falling back to master API tokens.
**Prevention:** Always sanitize JSON-LD string representations by escaping HTML characters (`<` -> `\u003c`, `>` -> `\u003e`, `&` -> `\u0026`) via `safeJsonLd()`. For API mutation routes, enforce user bearer token verification and reject unauthenticated requests with HTTP 401.

## 2026-08-16 - [CRITICAL] Authorization Bypass in Webhook Logic
**Vulnerability:** The `ingestFinalizedVideo` webhook in the feed controller contained flawed boolean logic (`!providedSecret && !authHeader`) that allowed an attacker to bypass the `workerSecret` check by simply providing an arbitrary `Authorization` header (e.g. `Authorization: Bearer fake`). The second check `providedSecret && providedSecret !== expectedSecret && !authHeader` also allowed a bad secret to be accepted if an auth header was present.
**Learning:** Flawed boolean logic in authentication middleware/handlers can inadvertently allow combinations of inputs that bypass security controls. Checking for the mere presence of an authorization header without validating it (e.g. using `ctx.state.user` which Strapi populates on valid JWT) leads to severe authorization bypass.
**Prevention:** Ensure that when multiple authentication schemes are supported (e.g. a worker secret or a user session), the logic strictly enforces that the provided secret matches if present, and that user session validation checks the actual authenticated user state (`!!ctx.state?.user`) rather than just the presence of a header string.

## 2026-08-16 - [CRITICAL] Authentication Bypass in API Mutation Routes
**Vulnerability:** The `/api/video/settings/route.ts` and `/api/image/settings/route.ts` endpoints permitted a fallback to the `STRAPI_API_TOKEN` (via `buildHeaders(req, false)`) for `PUT` and `DELETE` mutations when no valid client JWT was provided.
**Learning:** Fallback mechanisms meant for safe, read-only queries can inadvertently grant admin-level privileges to unauthenticated users if applied to mutation endpoints, completely bypassing intended client authorization checks.
**Prevention:** Strictly enforce authentication for mutating API endpoints (e.g., using `buildHeaders(req, true)`) and ensure that unauthenticated requests immediately fail with a `401 Unauthorized` status before attempting any state changes.
