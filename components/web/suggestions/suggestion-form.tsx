"use client";

import { useState } from "react";
import { useAuth } from "~/lib/auth-client";
import { submitSuggestion } from "~/actions/suggest";
import { SuggestionType } from "@prisma/client";
import { Button } from "~/components/common/button";
import { Input } from "~/components/common/input";
import { Label } from "~/components/common/label";
import { Link } from "~/components/common/link";
import { RadioGroup, RadioGroupItem } from "~/components/common/radio-group";
import { Textarea } from "~/components/common/textarea";
import { toast } from "sonner";

type SuggestionFormProps = {
  defaultType?: "Theme" | "Platform";
  onSuccess?: () => void;
};

const SuggestionForm = ({
  defaultType = "Theme",
  onSuccess,
}: SuggestionFormProps) => {
  const { user } = useAuth();
  const [type, setType] = useState<SuggestionType>(defaultType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsLoading(true);
    try {
      await submitSuggestion({
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
      });
      setName("");
      setDescription("");
      setWebsiteUrl("");
      onSuccess?.();
      toast.success("Thank you for your suggestion!");
    } catch {
      toast.error("Failed to submit suggestion");
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
        to submit a suggestion.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 min-w-md mx-auto"
    >
      <div className="flex flex-col gap-2">
        <Label>What are you suggesting?</Label>
        <RadioGroup
          value={type}
          onValueChange={(value) => setType(value as SuggestionType)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Theme" id="type-theme" />
            <Label htmlFor="type-theme" className="font-normal">
              Theme
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Platform" id="type-platform" />
            <Label htmlFor="type-platform" className="font-normal">
              Platform
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggestion-name">Name</Label>
        <Input
          id="suggestion-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`e.g., ${type === "Theme" ? "Nord" : "VS Code"}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggestion-description">Description (optional)</Label>
        <Textarea
          id="suggestion-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggestion-url">Website URL (optional)</Label>
        <Input
          id="suggestion-url"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Submitting..." : "Submit Suggestion"}
      </Button>
    </form>
  );
};

export { SuggestionForm };
