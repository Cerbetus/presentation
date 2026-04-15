/**
 * ThirdPartyProvider – Extension point for third-party render APIs.
 *
 * This provider integrates with commercial PPTX rendering services
 * such as Aspose, GroupDocs, or iSpring to convert slides to HTML5
 * with animations and video preserved.
 *
 * HOW TO IMPLEMENT:
 * 1. On upload, call the third-party API to convert the PPTX.
 * 2. Store the converted HTML/images in Supabase Storage.
 * 3. Render the converted output in the SlideViewer component.
 *
 * REQUIREMENTS:
 * - API key for the chosen service (VITE_RENDER_API_KEY).
 * - Supabase Edge Function to orchestrate the conversion server-side.
 *
 * Uncomment this provider in src/providers/index.js once configured.
 */

// eslint-disable-next-line react-refresh/only-export-components
function SlideViewer() {
  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
      <p className="text-gray-400 text-center px-4">
        Third-party render provider is not configured.
        <br />
        Set VITE_RENDER_API_KEY and implement the conversion flow.
      </p>
    </div>
  );
}

export const ThirdPartyProvider = {
  name: "thirdparty",
  canRender: () => {
    return !!import.meta.env.VITE_RENDER_API_KEY;
  },
  SlideViewer,
};
