"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import {
  approveThemeMaintainerClaim,
  rejectThemeMaintainerClaim,
} from "~/server/admin/theme-claims/actions";
import { Badge } from "~/components/common/badge";
import { Button } from "~/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog";
import { Input } from "~/components/common/input";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import type { findThemeMaintainerClaims } from "~/server/admin/theme-claims/queries";

type ThemeClaimsTableProps = {
  claimsPromise: ReturnType<typeof findThemeMaintainerClaims>;
};

type ThemeClaimRow = {
  id: string;
  status: string;
  claimantName: string;
  claimantEmail: string;
  claimantUrl: string | null;
  details: string | null;
  createdAt: Date;
  theme: {
    slug: string;
    name: string;
  };
};

export const ThemeClaimsTable = ({ claimsPromise }: ThemeClaimsTableProps) => {
  const router = useRouter();
  const claims = use(claimsPromise) as ThemeClaimRow[];
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectClaimId, setRejectClaimId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const approveAction = useServerAction(approveThemeMaintainerClaim, {
    onSuccess: () => {
      toast.success("Claim approved and maintainer assigned");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const rejectAction = useServerAction(rejectThemeMaintainerClaim, {
    onSuccess: () => {
      toast.success("Claim rejected");
      setIsRejectOpen(false);
      setRejectClaimId(null);
      setAdminNote("");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const openRejectDialog = (claimId: string) => {
    setRejectClaimId(claimId);
    setAdminNote("");
    setIsRejectOpen(true);
  };

  const handleReject = () => {
    if (!rejectClaimId) {
      return;
    }

    rejectAction.execute({
      claimId: rejectClaimId,
      adminNote: adminNote.trim() || undefined,
    });
  };

  if (!claims.length) {
    return <Note>No maintainer claims yet.</Note>;
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Theme</th>
            <th className="px-4 py-3 text-left font-medium">Claimant</th>
            <th className="px-4 py-3 text-left font-medium">Details</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Submitted</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>

        <tbody>
          {claims.map((claim) => {
            const isPending = claim.status === "Pending";

            return (
              <tr key={claim.id} className="border-t align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/themes/${claim.theme.slug}`}
                    className="underline"
                  >
                    {claim.theme.name}
                  </Link>
                </td>

                <td className="px-4 py-3">
                  <div className="grid gap-1">
                    <span>{claim.claimantName}</span>
                    <span className="text-muted-foreground">
                      {claim.claimantEmail}
                    </span>
                    {claim.claimantUrl && (
                      <a
                        href={claim.claimantUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        {claim.claimantUrl}
                      </a>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 max-w-md whitespace-pre-wrap break-words">
                  {claim.details || "-"}
                </td>

                <td className="px-4 py-3">
                  <Badge variant={isPending ? "warning" : "outline"}>
                    {claim.status}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(claim.createdAt).toLocaleDateString()}
                </td>

                <td className="px-4 py-3">
                  {isPending ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        isPending={approveAction.isPending}
                        onClick={() =>
                          approveAction.execute({ claimId: claim.id })
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        isPending={rejectAction.isPending}
                        onClick={() => openRejectDialog(claim.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="text-right text-muted-foreground">
                      Reviewed
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject claim?</DialogTitle>
            <DialogDescription>
              You can include an optional note explaining the rejection.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Optional rejection reason"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              isPending={rejectAction.isPending}
              onClick={handleReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
