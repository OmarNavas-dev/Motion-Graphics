import { config } from "@remotion/eslint-config-flat";

export default [...(Array.isArray(config) ? config : [config]), {
  // These files author HTML/GSAP or editor metadata, not Remotion frame styles.
  files: ['src/hyperframes-bridge.mjs','src/explainer-contract.mjs','src/StudioApp.tsx'],
  rules: {'@remotion/non-pure-animation':'off'},
}];
