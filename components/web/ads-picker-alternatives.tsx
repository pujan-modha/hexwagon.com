"use client";

import { AdType } from "@prisma/client";
import Image from "next/image";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { createStripeThemeAdsCheckout } from "~/actions/stripe";
import { RelationSelector } from "~/components/admin/relation-selector";
import { Button } from "~/components/common/button";
import { Card } from "~/components/common/card";
import { H5 } from "~/components/common/heading";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import { ExternalLink } from "~/components/web/external-link";
import { config } from "~/config";
import type { ThemeMany } from "~/server/web/themes/payloads";

type AdsPickerThemesProps = {
  themes: ThemeMany[];
  selectedId?: string;
  relatedIds?: string[];
};

export const AdsPickerThemes = ({
  themes,
  selectedId,
  relatedIds,
}: AdsPickerThemesProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedId ? [selectedId] : [],
  );
  const [selectedThemes, setSelectedThemes] = useState<ThemeMany[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const thms = themes.filter(({ id }) => selectedIds.includes(id));
    setSelectedThemes(thms);
  }, [themes, selectedIds]);

  const { execute, isPending } = useServerAction(createStripeThemeAdsCheckout, {
    onSuccess: ({ data }) => {
      posthog.capture("stripe_checkout_ad", { totalPrice });

      window.open(data, "_blank")?.focus();
    },

    onError: ({ err }) => {
      toast.error(err.message);
    },
  });

  const handleCheckout = () => {
    execute({
      type: AdType.ThemePage,
      themes: selectedThemes.map(({ slug, name }) => ({
        slug,
        name: `${name} Theme Ad`,
      })),
    });
  };

  return (
    <Stack size="lg" direction="column" className="w-full max-w-md mx-auto">
      <Card hover={false}>
        <H5 className="w-full">Select the themes to advertise on:</H5>

        <RelationSelector
          relations={themes}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          suggestedIds={relatedIds}
          mapFunction={({ id, name, faviconUrl }) => {
            return {
              id,
              name: (
                <Stack size="xs">
                  {faviconUrl && (
                    <Image
                      src={faviconUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="shrink-0 size-4 rounded-sm mr-0.5"
                      loading="lazy"
                    />
                  )}

                  <span className="truncate">{name}</span>
                </Stack>
              ),
            };
          }}
        />

        <Stack className="w-full justify-between">
          {selectedThemes.length > 0 ? (
            <Stack size="sm" className="mr-auto">
              <Note>Selected:</Note>
              <Note>{selectedThemes.length} theme(s)</Note>
            </Stack>
          ) : (
            <Note>Please select at least one theme</Note>
          )}

          <Button
            variant="fancy"
            size="md"
            disabled={!selectedIds.length || isPending}
            isPending={isPending}
            className="ml-auto"
            onClick={handleCheckout}
          >
            Purchase Now
          </Button>
        </Stack>
      </Card>

      <Note className="w-full text-xs text-center">
        Pricing is calculated based on the number of pageviews.
        <br /> You can cancel at any time. Have any questions? Please{" "}
        <ExternalLink
          href={`mailto:${config.site.email}`}
          className="underline hover:text-foreground"
        >
          contact us
        </ExternalLink>
        .
      </Note>
    </Stack>
  );
};
