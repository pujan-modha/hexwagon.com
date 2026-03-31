"use client";

import { useSubmissionStore } from "~/stores/submission-store";
import { submitPort } from "~/actions/submit";
import { Button } from "~/components/common/button";
import { Card } from "~/components/common/card";
import { useRouter } from "next/navigation";

type StepReviewProps = {
  onBack: () => void;
};

const StepReview = ({ onBack }: StepReviewProps) => {
  const router = useRouter();
  const {
    themeName,
    platformName,
    name,
    description,
    content,
    repositoryUrl,
    license,
    submitterName,
    submitterEmail,
    submitterNote,
    newsletterOptIn,
    reset,
  } = useSubmissionStore();

  const handleSubmit = async () => {
    try {
      const [result, error] = await submitPort({
        themeId: useSubmissionStore.getState().themeId!,
        platformId: useSubmissionStore.getState().platformId!,
        name,
        description,
        content,
        repositoryUrl,
        license,
        submitterName,
        submitterEmail,
        submitterNote,
        newsletterOptIn,
      });

      if (error) {
        throw error;
      }

      if (result?.id) {
        reset();
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to submit port:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Review Your Submission</h3>

        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Theme:</span>
            <span>{themeName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Platform:</span>
            <span>{platformName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Port Name:</span>
            <span>{name}</span>
          </div>
          {description && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Description:</span>
              <span>{description}</span>
            </div>
          )}
          {repositoryUrl && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Port URL:</span>
              <a href={repositoryUrl} className="underline">
                {repositoryUrl}
              </a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">License:</span>
            <span>{license}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Submitter:</span>
            <span>
              {submitterName} ({submitterEmail})
            </span>
          </div>
          {submitterNote && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Moderator note:</span>
              <span>{submitterNote}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Newsletter:</span>
            <span>{newsletterOptIn ? "Yes" : "No"}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleSubmit}>Submit Port</Button>
      </div>
    </div>
  );
};

export { StepReview };
