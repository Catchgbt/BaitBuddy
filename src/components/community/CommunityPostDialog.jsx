import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function CommunityPostDialog({ isOpen, onOpenChange }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchLatestPosts();
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const fetchLatestPosts = async () => {
    setLoading(true);
    try {
      const result = await base44.entities.Post.list("-created_date", 4);
      setPosts(result || []);
    } catch (error) {
      console.error("Fehler beim Laden der Community-Posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : posts.length - 1));
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev < posts.length - 1 ? prev + 1 : 0));
  };

  const currentPost = posts[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl">Neueste Beitraege</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentPost ? (
            <>
              {currentPost.photo_url && (
                <img
                  src={currentPost.photo_url}
                  alt="Community Beitrag"
                  className="w-full rounded-lg object-cover max-h-56"
                />
              )}
              {currentPost.text && (
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{currentPost.text}</p>
              )}
              <Button
                asChild
                onClick={() => onOpenChange(false)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-full"
              >
                <Link to={createPageUrl('Community')}>Zur Community</Link>
              </Button>
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">Keine Beitraege gefunden.</p>
          )}
        </div>

        {posts.length > 1 && (
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between border-t border-gray-800 pt-3">
            <button
              onClick={goPrev}
              className="text-gray-300 hover:text-white px-3 py-1 rounded-md min-h-[44px] min-w-[44px]"
              aria-label="Vorheriger Beitrag"
            >
              {"<"}
            </button>
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {posts.length}
            </span>
            <button
              onClick={goNext}
              className="text-gray-300 hover:text-white px-3 py-1 rounded-md min-h-[44px] min-w-[44px]"
              aria-label="Naechster Beitrag"
            >
              {">"}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}