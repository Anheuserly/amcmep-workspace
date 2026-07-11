"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative } from "@/lib/utils";
import {
  addFeedComment,
  createFeedPost,
  fetchFeed,
  fetchFeedComments,
  toFeedComment,
  toFeedPost,
  toggleFeedLike,
} from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  Heart, MessageCircle, Repeat, Share, Image, Send, MoreHorizontal
} from "lucide-react";
import type { FeedPost, FeedComment } from "@/types";

export function CommunityHome() {
  const { profile, activeRole } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    async function loadFeed() {
      setIsLoading(true);
      try {
        const docs = await fetchFeed({ limit: 50 });
        if (alive) setPosts(docs.map((doc) => toFeedPost(doc, profile?.userId)));
      } catch {
        if (alive) toast.error("Unable to load feed");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadFeed();
    return () => { alive = false; };
  }, [profile?.userId]);

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    try {
      const created = await createFeedPost({
        content: newPostContent,
        authorUserId: profile?.userId || "",
        authorName: profile?.name || "AMC MEP user",
        authorRole: profile?.activeRole || "customer",
      });
      setPosts((prev) => [toFeedPost(created, profile?.userId), ...prev]);
      setNewPostContent("");
      setShowComposer(false);
      toast.success("Post published");
    } catch {
      toast.error("Unable to publish post");
    }
  };

  const toggleLike = async (postId: string) => {
    const post = posts.find((p) => p.$id === postId);
    if (!post || !profile?.userId) return;
    setPosts((prev) => prev.map((p) => p.$id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1 } : p));
    try {
      await toggleFeedLike(postId, profile.userId, post.likedBy || [], post.likes);
    } catch {
      toast.error("Unable to update like");
    }
  };

  const toggleRepost = (postId: string) => {
    setPosts((prev) => prev.map((p) => p.$id === postId ? { ...p, isReposted: !p.isReposted, reposts: p.isReposted ? p.reposts - 1 : p.reposts + 1 } : p));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => { const next = new Set(prev); next.has(postId) ? next.delete(postId) : next.add(postId); return next; });
  };

  const addComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    try {
      const created = await addFeedComment({ postId, text, authorUserId: profile?.userId || "", authorName: profile?.name || "AMC MEP user" });
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), toFeedComment(created)] }));
      setPosts((prev) => prev.map((p) => p.$id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch {
      toast.error("Unable to add comment");
    }
  };

  const loadComments = async (postId: string) => {
    if (commentsByPost[postId]) return;
    try {
      const docs = await fetchFeedComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: docs.map(toFeedComment) }));
    } catch {
      toast.error("Unable to load comments");
    }
  };

  const postComments = (postId: string) => commentsByPost[postId] || [];

  const sharePost = async (post: FeedPost) => {
    const url = `${window.location.origin}/p/${post.$id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Post link copied");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Post link copied");
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">AMC MEP 24x7</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Service updates from your network.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Follow local businesses, service requests, AMC updates, and field activity in one clean feed.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Updates</h2>
          <p className="mt-1 text-sm text-gray-500">Posts from AMC MEP people and businesses</p>
        </div>
      </div>

      {/* Post Composer */}
      <Card>
        <CardContent className="p-4">
          {activeRole === "guest" ? (
            <button onClick={() => window.location.assign("/login")} className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition hover:bg-blue-100">
              <span className="block text-sm font-black text-blue-950">Sign in to post an update</span>
              <span className="mt-1 block text-xs leading-5 text-blue-700">Guests can read public updates. Posting, comments, and likes need an account.</span>
            </button>
          ) : !showComposer ? (
            <button onClick={() => setShowComposer(true)} className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 transition-colors">
              What's happening in your workspace?
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's happening in your workspace?"
                className="w-full h-24 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <Image className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowComposer(false)}>Cancel</Button>
                  <Button size="sm" onClick={handlePost} disabled={!newPostContent.trim()}>
                    <Send className="h-4 w-4 mr-2" />Post
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading feed...</CardContent></Card>
        ) : posts.length === 0 ? (
          <EmptyState icon={<MessageCircle className="h-12 w-12" />} title="No posts yet" description="Updates from your AMC MEP network will appear here." />
        ) : (
          posts.map((post) => (
            <Card key={post.$id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-sm text-gray-900">{post.authorName}</p>
                    <p className="text-xs text-gray-400">{formatRelative(post.createdAt)}</p>
                  </div>
                  <button onClick={() => sharePost(post)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" aria-label="Post actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Media Placeholders */}
                {post.mediaUrls.length > 0 && (
                  <div className={`grid gap-2 mt-3 ${post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.mediaUrls.map((url, i) => (
                      <div key={url || i} className="h-48 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Image className="m-auto mt-20 h-8 w-8 text-gray-300" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100">
                  <button disabled={activeRole === "guest"} onClick={() => toggleLike(post.$id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${post.isLiked ? "text-red-600 bg-red-50" : "text-gray-500 hover:bg-gray-50"}`}>
                    <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
                    <span>{post.likes}</span>
                  </button>
                  <button onClick={() => { toggleComments(post.$id); loadComments(post.$id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.commentsCount}</span>
                  </button>
                  <button disabled={activeRole === "guest"} onClick={() => toggleRepost(post.$id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${post.isReposted ? "text-green-600 bg-green-50" : "text-gray-500 hover:bg-gray-50"}`}>
                    <Repeat className="h-4 w-4" />
                    <span>{post.reposts}</span>
                  </button>
                  <button onClick={() => sharePost(post)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors ml-auto">
                    <Share className="h-4 w-4" />
                  </button>
                </div>

                {/* Comments */}
                {expandedComments.has(post.$id) && (
                  <div className="mt-3 space-y-3">
                    {postComments(post.$id).map((comment) => (
                      <div key={comment.$id} className="flex gap-2">
                        <Avatar src={comment.authorAvatar} name={comment.authorName} size="sm" />
                        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs font-semibold text-gray-900">{comment.authorName}</p>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelative(comment.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    {activeRole !== "guest" && <div className="flex gap-2">
                      <Avatar src={profile?.avatar} name={profile?.name || "You"} size="sm" />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[post.$id] || ""}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.$id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addComment(post.$id)}
                          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <Button size="sm" onClick={() => addComment(post.$id)} disabled={!commentInputs[post.$id]?.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
