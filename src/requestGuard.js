// Token guard tying async explanation results to the newest check submission.
export function createRequestGuard() {
  let counter = 0;
  let current = 0;

  return {
    next() {
      current += 1;
      return current;
    },
    isCurrent(token) {
      return token === current;
    },
    invalidate() {
      current += 1;
    },
  };
}
