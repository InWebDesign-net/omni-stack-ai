## 2026-08-14 - Custom Video Player Accessibility
**Learning:** Custom video controls often lack keyboard focus indicators and ARIA labels, making them difficult or impossible to use for screen reader and keyboard-only users.
**Action:** Always ensure custom interactive elements like buttons and range inputs have `aria-label`s, `focus-visible` styles, and state attributes like `aria-expanded` when applicable.

## 2026-08-15 - [Added ARIA Labels & Form Associations]
**Learning:** React inputs within Modals need proper ID generation and htmlFor mapping to support screen readers effectively, especially when component logic separates the label from the input element structure.
**Action:** Always include `id` and `htmlFor` pairs on newly created inputs inside modals and complex forms to assure a11y compliance.

