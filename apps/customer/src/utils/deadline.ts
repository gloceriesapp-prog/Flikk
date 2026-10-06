// Native promises cannot always be cancelled. Bound the wait and ignore late
// completion; callers still guard whether the result belongs to their screen.
export function withDeadline<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Location lookup timed out. Please retry or choose it manually.')), milliseconds);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
