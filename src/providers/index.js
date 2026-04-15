/**
 * Rendering-provider abstraction.
 *
 * Each provider must export an object shaped like:
 *   { name, canRender(file), SlideViewer }
 *
 * SlideViewer is a React component that receives:
 *   { fileUrl, currentSlide, totalSlides, onTotalSlidesKnown }
 *
 * MVP ships with BasicProvider (image-per-slide via canvas/PDF).
 * For true PowerPoint fidelity (animations, transitions, embedded video)
 * plug in one of the extension-point providers described below.
 */

import { BasicProvider } from "./BasicProvider";
// import { Office365Provider } from "./Office365Provider";  // extension point
// import { ThirdPartyProvider } from "./ThirdPartyProvider"; // extension point

const providers = [
  // Ordered by preference – first provider that can render wins.
  // Office365Provider,   // Uncomment when configured
  // ThirdPartyProvider,  // Uncomment when configured
  BasicProvider,
];

export function getProvider(file) {
  for (const p of providers) {
    if (p.canRender(file)) return p;
  }
  return BasicProvider; // ultimate fallback
}

export { BasicProvider };
