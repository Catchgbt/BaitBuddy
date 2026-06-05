import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    loadComments();
    const unsubscribe = base44.entities.Comment.subscribe((event) => {
      if (event.type === 'create' && event.data?.post_id === postId) {
        setComments(prev => [event.data, ...prev]);
      }
    });
    return unsubscribe;
  }, [postId]);

  const loadComments = async () => {
    try {
      const data = await base44.entities.Comment.filter({ post_id: postId }, '-created_date', 50);
      setComments(data);
    } catch (e) {
      console.error("Error loading comments:", e);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    
    setLoading(true);
    try {
      await base44.entities.Comment.create({
        post_id: postId,
        text: newComment
      });
      setNewComment("");
    } catch (e) {
      console.error("Error posting comment:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-700 pt-4">
      {user && (
        <div className="mb-4 space-y-2">
          <Textarea
            placeholder="Kommentar schreiben..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-20 bg-slate-900 border-slate-700 text-sm"
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || loading}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {loading ? "Wird gesendet..." : "Kommentieren"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400">Keine Kommentare yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-900 rounded p-3">
              <p className="text-xs text-slate-300 mb-1">
                <span className="font-semibold text-cyan-400">{comment.created_by}</span>
              </p>
              <p className="text-sm text-slate-200">{comment.text}</p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(comment.created_date).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}