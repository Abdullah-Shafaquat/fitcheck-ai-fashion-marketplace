import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The compiler's set-state-in-effect rule flags the legitimate
      // fetch-on-mount / polling pattern (~30 admin & store pages use
      // useEffect(() => { fetchX(); }, [fetchX])). These are intentional;
      // the actual setState happens asynchronously after the network call.
      "react-hooks/set-state-in-effect": "off",
      // API routes and import/export tooling intentionally use `any` for
      // JSON payloads parsed from unknown sources. Keep the rule visible
      // as a warning so it stays reviewable without blocking the build.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
