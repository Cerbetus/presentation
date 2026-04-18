/**
 * Office365Provider – Microsoft 365 embed renderer.
 *
 * This provider uses Microsoft Office Online embed to render PPTX
 * with high fidelity (animations, transitions, embedded video, etc).
 *
 * It tries to drive native Office next/prev controls first and
 * falls back to URL-driven slide sync when direct access is blocked.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SLIDE_SYNC_DEBOUNCE_MS = 1400;
const FRAME_SWAP_DELAY_MS = 900;
const OFFICE_PREV_BUTTON_ID = "ButtonFastBack-Small14";
const OFFICE_NEXT_BUTTON_ID = "ButtonFastFwd-Small14";

function isPptFile(fileName) {
  return typeof fileName === "string" && /\.pptx?$/i.test(fileName);
}

function getEmbedUrl(fileUrl, currentSlide) {
  if (!fileUrl) return null;

  const embedUrl = new URL("https://view.officeapps.live.com/op/embed.aspx");
  embedUrl.searchParams.set("src", fileUrl);
  embedUrl.searchParams.set("wdSlideIndex", String(Math.max(1, currentSlide)));

  return embedUrl.toString();
}

// eslint-disable-next-line react-refresh/only-export-components
function SlideViewer({
  fileUrl,
  currentSlide,
  totalSlides,
  onTotalSlidesKnown,
  fullscreen = false,
}) {
  const [syncedSlide, setSyncedSlide] = useState(currentSlide);
  const [frameUrls, setFrameUrls] = useState([null, null]);
  const [visibleFrame, setVisibleFrame] = useState(0);
  const iframeRefs = useRef([null, null]);
  const swapTimeoutsRef = useRef([null, null]);
  const frameUrlsRef = useRef(frameUrls);
  const visibleFrameRef = useRef(visibleFrame);
  const requestedSlideRef = useRef(currentSlide);
  const targetUrlRef = useRef(null);
  const directControlBlockedRef = useRef(false);

  useEffect(() => {
    if (totalSlides === 0) onTotalSlidesKnown(20);
  }, [totalSlides, onTotalSlidesKnown]);

  const tryNativeOfficeStep = useCallback((direction) => {
    const iframe = iframeRefs.current[visibleFrameRef.current];
    if (!iframe) return false;

    const buttonId =
      direction === "next" ? OFFICE_NEXT_BUTTON_ID : OFFICE_PREV_BUTTON_ID;

    try {
      const frameDocument = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!frameDocument) return false;

      const button = frameDocument.getElementById(buttonId);
      if (!button) return false;

      button.click();
      return true;
    } catch (error) {
      if (!directControlBlockedRef.current) {
        directControlBlockedRef.current = true;
        console.warn(
          "Office iframe blocked direct control clicks; using URL slide sync.",
          error
        );
      }
      return false;
    }
  }, []);

  useEffect(() => {
    const previousRequestedSlide = requestedSlideRef.current;
    requestedSlideRef.current = currentSlide;

    const delta = currentSlide - previousRequestedSlide;
    const direction = delta === 1 ? "next" : delta === -1 ? "prev" : null;

    if (direction && tryNativeOfficeStep(direction)) {
      return;
    }

    const timeout = window.setTimeout(
      () => setSyncedSlide(currentSlide),
      SLIDE_SYNC_DEBOUNCE_MS
    );

    return () => window.clearTimeout(timeout);
  }, [currentSlide, tryNativeOfficeStep]);

  const embedUrl = useMemo(
    () => getEmbedUrl(fileUrl, syncedSlide),
    [fileUrl, syncedSlide]
  );

  useEffect(() => {
    frameUrlsRef.current = frameUrls;
  }, [frameUrls]);

  useEffect(() => {
    visibleFrameRef.current = visibleFrame;
  }, [visibleFrame]);

  useEffect(() => {
    return () => {
      swapTimeoutsRef.current.forEach((timeoutId) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  const queueFrameUrl = useCallback((nextUrl) => {
    if (!nextUrl) return;

    targetUrlRef.current = nextUrl;

    setFrameUrls((prev) => {
      const currentVisible = visibleFrameRef.current;
      const hidden = currentVisible === 0 ? 1 : 0;

      // First load: use visible slot directly.
      if (!prev[currentVisible]) {
        const next = [...prev];
        next[currentVisible] = nextUrl;
        return next;
      }

      // Already loaded or currently loading this target.
      if (prev[currentVisible] === nextUrl || prev[hidden] === nextUrl) {
        return prev;
      }

      // Preload next slide in hidden slot; swap after onLoad.
      const next = [...prev];
      next[hidden] = nextUrl;
      return next;
    });
  }, []);

  useEffect(() => {
    queueFrameUrl(embedUrl);
  }, [embedUrl, queueFrameUrl]);

  const handleFrameLoad = useCallback((frameIndex) => {
    const currentVisible = visibleFrameRef.current;
    if (frameIndex === currentVisible) return;

    const loadedUrl = frameUrlsRef.current[frameIndex];
    if (!loadedUrl) return;

    // Keep current slide visible a little longer to hide Office splash flashes.
    if (swapTimeoutsRef.current[frameIndex]) {
      window.clearTimeout(swapTimeoutsRef.current[frameIndex]);
    }

    swapTimeoutsRef.current[frameIndex] = window.setTimeout(() => {
      if (frameUrlsRef.current[frameIndex] === targetUrlRef.current) {
        setVisibleFrame(frameIndex);
      }
      swapTimeoutsRef.current[frameIndex] = null;
    }, FRAME_SWAP_DELAY_MS);
  }, []);

  if (!embedUrl) {
    return (
      <div
        className={`relative w-full bg-gray-900 flex items-center justify-center ${
          fullscreen ? "h-full" : "aspect-video rounded-xl"
        }`}
      >
        <p className="text-gray-400 text-center px-4">
          Preparing Office 365 viewer…
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full bg-gray-900 overflow-hidden ${
        fullscreen ? "h-full" : "aspect-video rounded-xl"
      }`}
    >
      {frameUrls.map((url, index) => {
        if (!url) return null;
        const isVisible = index === visibleFrame;

        return (
          <iframe
            key={index}
            title={`Office 365 slide viewer ${index + 1}`}
            src={url}
            ref={(node) => {
              iframeRefs.current[index] = node;
            }}
            className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-150 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              zIndex: isVisible ? 2 : 1,
              pointerEvents: isVisible ? "auto" : "none",
            }}
            onLoad={() => handleFrameLoad(index)}
            allowFullScreen
          />
        );
      })}
    </div>
  );
}

export const Office365Provider = {
  name: "office365",
  canRender: (fileName) => isPptFile(fileName),
  SlideViewer,
};
