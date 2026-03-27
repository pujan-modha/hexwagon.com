"use client";

import { useSubmissionStore } from "~/stores/submission-store";
import { Button } from "~/components/common/button";
import { Input } from "~/components/common/input";
import { Label } from "~/components/common/label";
import { Textarea } from "~/components/common/textarea";
import { Switch } from "~/components/common/switch";
import { LICENSE_SUGGESTIONS } from "~/config/licenses";

type StepDetailsProps = {
  onNext: () => void;
  onBack: () => void;
};

const StepDetails = ({ onNext, onBack }: StepDetailsProps) => {
  const {
    name,
    description,
    content,
    repositoryUrl,
    installUrl,
    websiteUrl,
    license,
    submitterName,
    submitterEmail,
    submitterNote,
    newsletterOptIn,
    setPortDetails,
  } = useSubmissionStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="port-name">Port Name</Label>
        <Input
          id="port-name"
          value={name}
          onChange={(e) => setPortDetails({ name: e.target.value })}
          placeholder="e.g., Dracula for VS Code"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="port-description">Short Description</Label>
        <Input
          id="port-description"
          value={description}
          onChange={(e) => setPortDetails({ description: e.target.value })}
          placeholder="Brief description of this port"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="port-content">Full Description (Markdown)</Label>
        <Textarea
          id="port-content"
          value={content}
          onChange={(e) => setPortDetails({ content: e.target.value })}
          placeholder="Detailed description, installation instructions, etc."
          rows={6}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="repository-url">Repository URL</Label>
        <Input
          id="repository-url"
          type="url"
          value={repositoryUrl}
          onChange={(e) => setPortDetails({ repositoryUrl: e.target.value })}
          placeholder="https://github.com/..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="install-url">Install URL (optional)</Label>
        <Input
          id="install-url"
          type="url"
          value={installUrl}
          onChange={(e) => setPortDetails({ installUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="website-url">Website URL (optional)</Label>
        <Input
          id="website-url"
          type="url"
          value={websiteUrl}
          onChange={(e) => setPortDetails({ websiteUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="port-license">License</Label>
        <Input
          id="port-license"
          value={license}
          onChange={(e) => setPortDetails({ license: e.target.value })}
          placeholder="MIT"
          list="submission-license-suggestions"
        />
        <datalist id="submission-license-suggestions">
          {LICENSE_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="submitter-name">Your Name</Label>
        <Input
          id="submitter-name"
          value={submitterName}
          onChange={(e) => setPortDetails({ submitterName: e.target.value })}
          placeholder="Your name"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="submitter-email">Your Email</Label>
        <Input
          id="submitter-email"
          type="email"
          value={submitterEmail}
          onChange={(e) => setPortDetails({ submitterEmail: e.target.value })}
          placeholder="your@email.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="submitter-note">Note for moderators</Label>
        <Textarea
          id="submitter-note"
          value={submitterNote}
          onChange={(e) => setPortDetails({ submitterNote: e.target.value })}
          placeholder="Anything the review team should know?"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="newsletter-opt-in"
          checked={newsletterOptIn}
          onCheckedChange={(checked) =>
            setPortDetails({ newsletterOptIn: checked })
          }
        />
        <Label htmlFor="newsletter-opt-in">Subscribe to newsletter</Label>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!name || !license || !submitterName || !submitterEmail}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export { StepDetails };
