## 2026-08-14 - Custom Video Player Accessibility
**Learning:** Custom video controls often lack keyboard focus indicators and ARIA labels, making them difficult or impossible to use for screen reader and keyboard-only users.
**Action:** Always ensure custom interactive elements like buttons and range inputs have `aria-label`s, `focus-visible` styles, and state attributes like `aria-expanded` when applicable.

## 2023-10-25 - [Interactive Header Controls & Focus States]
**Learning:** Screen readers and keyboard users struggle with custom interactive buttons (like notification bells or user menus) that lack explicit ARIA popup states and manual focus rings. Without `aria-expanded`/`aria-haspopup` and `focus-visible`, users with assistive technologies cannot perceive the UI state or track their position when navigating via keyboard.
**Action:** Always add `aria-expanded`, `aria-haspopup`, and clear `focus-visible` styling to any custom button that triggers a dropdown, menu, or modal drawer.
