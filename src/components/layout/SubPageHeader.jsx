import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { useNavigationContext } from "@/lib/NavigationContext";

export default function SubPageHeader({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const { isRootTab } = useNavigationContext();

  if (isRootTab) return null;

  const currentPage = location.pathname.replace(/^\//, '').split('/')[0] || 'Dashboard';

  const handleBack = () => {
    triggerHaptic('light');
    playSound('click');
    navigate(-1);
  };

  return (
    <div className="md:hidden sticky top-0 z-40 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800">
      <div
        className="flex items-center h-12 px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Zurueck"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center text-lg font-semibold text-white pr-10">
          {title || currentPage}
        </h1>
      </div>
    </div>
  );
}