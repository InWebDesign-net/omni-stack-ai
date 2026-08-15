## 2024-05-18 - Prevent Directory Traversal via startsWith Incomplete Matching
**Vulnerability:** Directory traversal allowed access to siblings of the target directory (e.g., `/root/media-secret`) due to `resolvedPath.startsWith(MEDIA_ROOT)` missing a trailing separator.
**Learning:** `startsWith` on a directory path without a trailing separator acts as a string prefix match, not a path component match. Thus, `/root/media-secret` starts with `/root/media`.
**Prevention:** Always ensure directory checks append the OS-specific path separator (`path.sep`) to the target base directory, or strictly compare the full resolved path.
