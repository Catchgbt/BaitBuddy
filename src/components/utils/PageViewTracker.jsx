import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/components/utils/tracker";

// Trackt automatisch jeden Seitenwechsel.
export default function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/^\//, "") || "Home";
    trackPageView(path);
  }, [location.pathname]);

  return null;
}