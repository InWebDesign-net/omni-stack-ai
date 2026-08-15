## 2023-10-18 - Native lazy loading for images below the fold
**Learning:** Native `<img>` tags for dynamically rendered lists (like video thumbnails and avatars) can severely impact initial page load speed and bandwidth if not deferred.
**Action:** Always add `loading="lazy"` to `<img>` tags used within lists or grids that extend below the fold to improve performance.
