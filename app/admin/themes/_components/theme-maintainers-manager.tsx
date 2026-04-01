"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { Button } from "~/components/common/button";
import { Input } from "~/components/common/input";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import {
  assignThemeMaintainer,
  removeThemeMaintainer,
} from "~/server/admin/themes/actions";

type ThemeMaintainersManagerProps = {
  themeId: string;
  maintainers: {
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  }[];
};

export const ThemeMaintainersManager = ({
  themeId,
  maintainers,
}: ThemeMaintainersManagerProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const assignAction = useServerAction(assignThemeMaintainer, {
    onSuccess: () => {
      toast.success("Maintainer assigned");
      setEmail("");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const removeAction = useServerAction(removeThemeMaintainer, {
    onSuccess: () => {
      toast.success("Maintainer removed");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  return (
    <div className="rounded-md border p-4 grid gap-3 col-span-full">
      <Stack className="justify-between">
        <strong>Theme Maintainers</strong>
        <span className="text-xs text-muted-foreground">
          {maintainers.length} assigned
        </span>
      </Stack>

      {maintainers.length ? (
        <div className="grid gap-2">
          {maintainers.map((maintainer) => (
            <Stack
              key={maintainer.userId}
              className="justify-between rounded border px-3 py-2"
            >
              <div className="truncate">
                <div className="text-sm font-medium truncate">
                  {maintainer.user.name || "Unknown"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {maintainer.user.email}
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                isPending={removeAction.isPending}
                onClick={() =>
                  removeAction.execute({
                    themeId,
                    userId: maintainer.userId,
                  })
                }
              >
                Remove
              </Button>
            </Stack>
          ))}
        </div>
      ) : (
        <Note>No maintainers assigned yet.</Note>
      )}

      <Stack size="sm" className="w-full">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="maintainer@email.com"
          className="flex-1"
        />

        <Button
          type="button"
          size="md"
          isPending={assignAction.isPending}
          disabled={!email}
          onClick={() =>
            assignAction.execute({
              themeId,
              email,
            })
          }
        >
          Assign Maintainer
        </Button>
      </Stack>
    </div>
  );
};
