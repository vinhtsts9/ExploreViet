import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component to handle scroll restoration:
 * - Scrolls to top when navigating to a new page
 * - Restores scroll position when using browser back/forward buttons
 */
const ScrollToTop = () => {
  const location = useLocation();
  const scrollPositions = useRef(new Map());
  const isBackNavigation = useRef(false);
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    // Listen for popstate (back/forward button)
    const handlePopState = () => {
      isBackNavigation.current = true;
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathname.current;

    // Save scroll position of previous page before navigating
    if (previousPath && previousPath !== currentPath && !isBackNavigation.current) {
      scrollPositions.current.set(previousPath, window.scrollY);
    }

    if (isBackNavigation.current) {
      // Restore scroll position from history
      const savedPosition = scrollPositions.current.get(currentPath);
      if (savedPosition !== undefined) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo({
            top: savedPosition,
            behavior: "auto", // Instant scroll for back navigation
          });
        }, 0);
      } else {
        // No saved position, scroll to top
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      isBackNavigation.current = false;
    } else {
      // Scroll to top for new navigation
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Update previous pathname
    previousPathname.current = currentPath;
  }, [location.pathname]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.current.set(location.pathname, window.scrollY);
    };

    // Throttle scroll events
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", throttledScroll);
    };
  }, [location.pathname]);

  return null;
};

export default ScrollToTop;

