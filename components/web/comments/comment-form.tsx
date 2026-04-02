"use client";

import { useState } from "react";
import { useAuth } from "~/lib/auth-client";
import { addComment } from "~/actions/comment";
import { Button } from "~/components/common/button";
import { Link } from "~/components/common/link";
import { Textarea } from "~/components/common/textarea";
import { toast } from "sonner";

type CommentFormProps = {
  portId: string;
  parentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
};

const CommentForm = ({
  portId,
  parentId,
  onSuccess,
  onCancel,
  placeholder = "Write a comment...",
}: CommentFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await addComment({ portId, parentId, content });
      setContent("");
      onSuccess?.();
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/auth/login" className="underline">
          Sign in
        </Link>{" "}
        to comment.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
      />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
};

export { CommentForm };
