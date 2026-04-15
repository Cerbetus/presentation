/**
 * Office365Provider – Extension point for Microsoft 365 embed.
 *
 * This provider uses the Microsoft Office Online viewer or Graph API
 * to render PPTX files with full fidelity (animations, transitions,
 * embedded video, SmartArt, etc.).
 *
 * HOW TO IMPLEMENT:
 * 1. Upload the PPTX to OneDrive/SharePoint via Microsoft Graph API.
 * 2. Obtain an embed URL for the file.
 * 3. Render the file in an <iframe> pointing to the embed URL.
 * 4. Optionally use the PowerPoint JavaScript API to control slides
 *    programmatically from the presenter/remote.
 *
 * REQUIREMENTS:
 * - Azure AD app registration with Files.ReadWrite scope.
 * - VITE_MS_CLIENT_ID and VITE_MS_TENANT_ID environment variables.
 * - @azure/msal-browser and @microsoft/microsoft-graph-client packages.
 *
 * Uncomment this provider in src/providers/index.js once configured.
 */

// eslint-disable-next-line react-refresh/only-export-components
function SlideViewer() {
  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
      <p className="text-gray-400 text-center px-4">
        Office 365 provider is not configured.
        <br />
        Set VITE_MS_CLIENT_ID and VITE_MS_TENANT_ID, then implement the
        OneDrive upload + iframe embed flow.
      </p>
    </div>
  );
}

export const Office365Provider = {
  name: "office365",
  canRender: () => {
    // Enable when MS credentials are configured
    return !!(
      import.meta.env.VITE_MS_CLIENT_ID &&
      import.meta.env.VITE_MS_TENANT_ID
    );
  },
  SlideViewer,
};
