import { useEffect } from "react";

/**
 * Hook to update meta tags for social sharing (Open Graph, Twitter Cards)
 * @param {Object} meta - Meta data object
 * @param {string} meta.title - Page title
 * @param {string} meta.description - Page description
 * @param {string} meta.image - Image URL for preview
 * @param {string} meta.url - Page URL
 */
export const useMetaTags = ({ title, description, image, url }) => {
  useEffect(() => {
    // Update or create meta tags
    const updateMetaTag = (property, content) => {
      if (!content) return;
      
      let element = document.querySelector(`meta[property="${property}"]`) || 
                    document.querySelector(`meta[name="${property}"]`);
      
      if (!element) {
        element = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("twitter:")) {
          element.setAttribute("property", property);
        } else {
          element.setAttribute("name", property);
        }
        document.head.appendChild(element);
      }
      
      element.setAttribute("content", content);
    };

    // Update title
    if (title) {
      document.title = title;
      updateMetaTag("og:title", title);
      updateMetaTag("twitter:title", title);
    }

    // Update description
    if (description) {
      updateMetaTag("description", description);
      updateMetaTag("og:description", description);
      updateMetaTag("twitter:description", description);
    }

    // Update image
    if (image) {
      updateMetaTag("og:image", image);
      updateMetaTag("og:image:width", "1200");
      updateMetaTag("og:image:height", "630");
      updateMetaTag("og:image:type", "image/jpeg");
      updateMetaTag("twitter:image", image);
      updateMetaTag("twitter:card", "summary_large_image");
    }

    // Update URL
    if (url) {
      updateMetaTag("og:url", url);
    }

    // Always set og:type
    updateMetaTag("og:type", "article");
    updateMetaTag("og:site_name", "ExploreViet");

    // Cleanup function to restore default meta tags when component unmounts
    return () => {
      // Optionally restore default meta tags
      document.title = "ExploreViet - Khám phá Việt Nam";
    };
  }, [title, description, image, url]);
};

