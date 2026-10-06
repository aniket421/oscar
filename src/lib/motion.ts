/**
 * JS mirror of the motion tokens in `src/styles/tokens.css`, for motion that has
 * to be coordinated from script (e.g. removing an element after its exit
 * transition). A unit test keeps these values in sync with the CSS tokens.
 */
export const motion = {
  duration: {
    fast: 120,
    standard: 200,
    slow: 480,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;
