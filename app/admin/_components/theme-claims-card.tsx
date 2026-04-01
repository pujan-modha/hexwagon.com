import { Card, CardDescription, CardHeader } from "~/components/common/card";
import { H2 } from "~/components/common/heading";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import {
  countPendingThemeMaintainerClaims,
  findPendingThemeMaintainerClaims,
} from "~/server/admin/theme-claims/queries";

export const ThemeClaimsCard = async () => {
  const [pendingCount, claims] = await Promise.all([
    countPendingThemeMaintainerClaims(),
    findPendingThemeMaintainerClaims(5),
  ]);

  return (
    <Card hover={false} focus={false} className="items-stretch">
      <CardHeader direction="column">
        <CardDescription>Theme Maintainer Claims</CardDescription>
        <H2>{pendingCount}</H2>
      </CardHeader>

      {claims.length ? (
        <div className="grid gap-1.5 text-sm">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/admin/themes/${claim.theme.slug}`}
              className="truncate underline"
            >
              {claim.theme.name} · {claim.claimantEmail}
            </Link>
          ))}

          <Link href="/admin/theme-claims" className="text-xs underline mt-1">
            Review all claims
          </Link>
        </div>
      ) : (
        <Note>No pending claims right now.</Note>
      )}
    </Card>
  );
};
