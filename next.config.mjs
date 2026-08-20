/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-syntax-highlighter"],

  // The spec's companion artifacts are read at request time from paths built
  // out of a lookup table, which Next's dependency tracer cannot follow. Name
  // them explicitly or they are missing from the serverless bundle and every
  // request 404s in production while working fine locally.
  outputFileTracingIncludes: {
    "/schemas/[...path]": ["./schemas/**"],
    "/examples/[...path]": ["./examples/**"],
    "/": ["./content/**"],
    "/spec": ["./SPEC.md"],
  },
};

export default nextConfig;
