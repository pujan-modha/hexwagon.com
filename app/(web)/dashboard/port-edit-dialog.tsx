"use client";

import { PortStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { submitPortEdit } from "~/actions/port-edit";
import { Button } from "~/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/common/dialog";
import { Input } from "~/components/common/input";
import { Label } from "~/components/common/label";
import { TextArea } from "~/components/common/textarea";

type PendingEdit = {
  id: string;
  diff: unknown;
};

type PortEditDialogProps = {
  port: {
    id: string;
    name: string | null;
    description: string | null;
    content: string | null;
    repositoryUrl: string | null;
    license: string | null;
    status: PortStatus;
    pendingEdits: PendingEdit[];
  };
};

type EditablePortFields = {
  name: string;
  description: string;
  content: string;
  repositoryUrl: string;
  license: string;
};

const getPendingDiff = (pendingEdit?: PendingEdit) => {
  if (
    !pendingEdit ||
    typeof pendingEdit.diff !== "object" ||
    pendingEdit.diff === null
  ) {
    return {} as Partial<EditablePortFields>;
  }

  return pendingEdit.diff as Partial<EditablePortFields>;
};

export const PortEditDialog = ({ port }: PortEditDialogProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const pendingEdit = port.pendingEdits[0];
  const pendingDiff = getPendingDiff(pendingEdit);

  const initialValues = useMemo<EditablePortFields>(
    () => ({
      name: pendingDiff.name ?? port.name ?? "",
      description: pendingDiff.description ?? port.description ?? "",
      content: pendingDiff.content ?? port.content ?? "",
      repositoryUrl: pendingDiff.repositoryUrl ?? port.repositoryUrl ?? "",
      license: pendingDiff.license ?? port.license ?? "",
    }),
    [
      pendingDiff.content,
      pendingDiff.description,
      pendingDiff.license,
      pendingDiff.name,
      pendingDiff.repositoryUrl,
      port.content,
      port.description,
      port.license,
      port.name,
      port.repositoryUrl,
    ],
  );

  const [values, setValues] = useState<EditablePortFields>(initialValues);

  const { execute, isPending } = useServerAction(submitPortEdit, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.appliedDirectly
          ? "Edit applied and published immediately."
          : "Edit submitted for review.",
      );
      setIsOpen(false);
      router.refresh();
    },
    onError: ({ err }) => {
      toast.error(err.message);
    },
  });

  const canEdit = port.status !== PortStatus.Draft;

  if (!canEdit) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Under review
      </Button>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setValues(initialValues);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          {pendingEdit ? "Edit pending" : "Edit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Port</DialogTitle>
          <DialogDescription>
            Changes are submitted for processing. Maintainers of this theme get
            immediate publish without admin approval.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            execute({
              portId: port.id,
              diff: {
                name: values.name,
                description: values.description,
                content: values.content,
                repositoryUrl: values.repositoryUrl,
                license: values.license,
              },
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={`name-${port.id}`}>Port Name</Label>
            <Input
              id={`name-${port.id}`}
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Port name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`description-${port.id}`}>Short Description</Label>
            <Input
              id={`description-${port.id}`}
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Short description"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`content-${port.id}`}>Details (Markdown)</Label>
            <TextArea
              id={`content-${port.id}`}
              value={values.content}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              rows={8}
              placeholder="Installation details, notes, links..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`repository-${port.id}`}>Port URL</Label>
            <Input
              id={`repository-${port.id}`}
              type="url"
              value={values.repositoryUrl}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  repositoryUrl: event.target.value,
                }))
              }
              placeholder="https://example.com/port"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`license-${port.id}`}>License</Label>
            <Input
              id={`license-${port.id}`}
              value={values.license}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  license: event.target.value,
                }))
              }
              placeholder="MIT"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isPending={isPending}>
              Submit Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
