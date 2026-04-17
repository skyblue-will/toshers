import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the markdown source files with the serverless functions so they
  // can be read at runtime via fs.readFileSync.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./source.txt",
      "./source/**/*.md",
      "./characters/**/*.md",
    ],
    "/": [
      "./source.txt",
      "./source/**/*.md",
      "./characters/**/*.md",
    ],
  },
};

export default nextConfig;
