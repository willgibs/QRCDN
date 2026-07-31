// Vitest alias target for the `server-only` package (see vitest.config.ts).
// Outside Next's own build, importing the real `server-only` package
// throws unconditionally — it only resolves to a no-op under the
// "react-server" module resolution condition Next's server bundler sets,
// which vitest has no reason to set globally (it would also change how
// every other test resolves React itself). `lib/highlight.ts`'s first
// line is `import "server-only"`, so `lib/highlight.test.ts` needs this
// stood in for the real package to run at all. Production code never
// imports this file directly.
export {};
