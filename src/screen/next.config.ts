import type { NextConfig } from "next";

// The screen is a separate deployable (Vercel) rooted at src/screen. It
// reaches src/shared and usecase/sandbox.ts by relative import; the repo
// root is the tracing root so those files ship with the functions.
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongodb"],
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  // The baseline report is read from disk at request time; the tracer
  // cannot see a readFile path, so it is named here for that route.
  outputFileTracingIncludes: { "/api/baseline": ["../../usecase/tools/baseline.json", "../../usecase/tools/baseline-400.json"] },
};

export default config;
