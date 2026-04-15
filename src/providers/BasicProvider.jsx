/**
 * BasicProvider – MVP slide renderer.
 *
 * ⚠️  FIDELITY WARNING
 * This provider displays one slide at a time as a simple placeholder
 * with slide-number navigation. It does NOT render actual PPTX content
 * (animations, transitions, embedded video, SmartArt, etc.).
 *
 * For true PPTX fidelity you need one of these approaches:
 *   1. Microsoft 365 embed (Office Online / Graph API) – best fidelity.
 *   2. A third-party render API (e.g. Aspose, GroupDocs, iSpring).
 *   3. Server-side conversion to video (preserves animations).
 *
 * The provider interface is intentionally simple so you can swap this
 * file with a higher-fidelity implementation without touching the rest
 * of the app.  See src/providers/index.js for the registry.
 */

import { useEffect } from "react";

// eslint-disable-next-line react-refresh/only-export-components
function SlideViewer({ fileUrl, currentSlide, totalSlides, onTotalSlidesKnown }) {
  // In the MVP we don't parse the PPTX; we just show a placeholder.
  // A real provider would load the file from fileUrl and render it.
  useEffect(() => {
    if (totalSlides === 0) {
      // Default to 20 slides; the presenter can adjust.
      onTotalSlidesKnown(20);
    }
  }, [totalSlides, onTotalSlidesKnown]);

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center overflow-hidden select-none">
      {/* Fidelity banner */}
      <div className="absolute top-2 left-2 right-2 bg-amber-600/90 text-white text-xs px-3 py-1 rounded">
        ⚠️ MVP renderer — animations, transitions & embedded video are not displayed.
        For full fidelity, configure a Microsoft 365 or third-party rendering provider.
      </div>

      {/* Slide placeholder */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl font-bold text-gray-400">{currentSlide}</div>
        <div className="text-gray-500 text-sm">
          Slide {currentSlide} of {totalSlides || "?"}
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 underline text-xs"
          >
            Download original PPTX
          </a>
        )}
      </div>
    </div>
  );
}

export const BasicProvider = {
  name: "basic",
  canRender: () => true, // fallback – always matches
  SlideViewer,
};
