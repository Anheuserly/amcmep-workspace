"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyFeedPostRoute() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;

  useEffect(() => {
    router.replace(postId ? `/p/${postId}` : "/");
  }, [postId, router]);

  return null;
}
