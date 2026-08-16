## 2026-08-14 - Custom Video Player Accessibility
**Learning:** Custom video controls often lack keyboard focus indicators and ARIA labels, making them difficult or impossible to use for screen reader and keyboard-only users.
**Action:** Always ensure custom interactive elements like buttons and range inputs have `aria-label`s, `focus-visible` styles, and state attributes like `aria-expanded` when applicable.
