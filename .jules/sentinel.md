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
=======
>>>>>>> 2a2cefb (🛡️ Sentinel: [CRITICAL] Fix hardcoded secret fallbacks)
