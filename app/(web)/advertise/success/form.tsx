"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import {
  createStripeAdPackageCheckout,
  updateAdPackageDraft,
} from "~/actions/stripe";
import { Button } from "~/components/common/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form";
import { Input } from "~/components/common/input";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import { TextArea } from "~/components/common/textarea";
import {
  AdPreviewBanner,
  AdPreviewCard,
} from "~/components/web/ads/ad-preview";
import { Price } from "~/components/web/price";
import {
  type AdDetailsSchema,
  adDetailsSchema,
} from "~/server/web/shared/schema";
import { cx } from "~/utils/cva";

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg";

type BillingCycle = "Weekly" | "Monthly";

type AdDetailsFormProps = ComponentProps<"form"> & {
  draftToken: string;
  pricingSummary: {
    billingCycle: BillingCycle;
    targetCount: number;
    packageCostCents: number;
    targetFeeCents: number;
    totalCostCents: number;
    fullOriginalCostCents: number;
  };
};

export const AdDetailsForm = ({
  className,
  draftToken,
  pricingSummary,
  ...props
}: AdDetailsFormProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeDraftToken, setActiveDraftToken] = useState(draftToken);

  useEffect(() => {
    setActiveDraftToken(draftToken);
  }, [draftToken]);

  const form = useForm<AdDetailsSchema>({
    resolver: zodResolver(adDetailsSchema),
    defaultValues: {
      email: "",
      name: "",
      websiteUrl: "",
      description: "",
      faviconUrl: "",
      faviconFile: undefined,
      buttonLabel: "",
    },
  });

  const checkoutAction = useServerAction(createStripeAdPackageCheckout, {
    onSuccess: ({ data }) => {
      window.location.href = data;
    },
    onError: ({ err }) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    checkoutAction.execute({
      draftToken: activeDraftToken,
      ...data,
    });
  });

  const switchToMonthlyAction = useServerAction(updateAdPackageDraft, {
    onSuccess: ({ data }) => {
      setActiveDraftToken(data);

      const params = new URLSearchParams(searchParams.toString());
      params.set("draft", data);
      params.delete("sessionId");

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    onError: ({ err }) => {
      toast.error(err.message);
    },
  });

  const values = form.watch();

  const getHostnameSafe = (urlStr: string) => {
    if (!urlStr) return null;
    try {
      const url = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
      return new URL(url).hostname;
    } catch (e) {
      return null;
    }
  };

  const previewAd = useMemo(() => {
    const hostname = getHostnameSafe(values.websiteUrl || "");

    let finalFaviconUrl = values.faviconUrl;
    if (!finalFaviconUrl) {
      if (values.faviconFile) {
        try {
          finalFaviconUrl = URL.createObjectURL(values.faviconFile);
        } catch (e) {}
      } else if (hostname) {
        finalFaviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      } else {
        finalFaviconUrl = "/favicon.svg";
      }
    }

    return {
      type: "All" as const,
      name: values.name || "Ad preview",
      description:
        values.description || "Your campaign description will appear here.",
      websiteUrl: values.websiteUrl || "https://example.com",
      buttonLabel: values.buttonLabel || "Get started",
      faviconUrl: finalFaviconUrl ?? null,
    };
  }, [values]);

  const isPending = checkoutAction.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className={cx("flex flex-col w-full gap-8", className)}
        noValidate
        {...props}
      >
        <div className="w-full">
          <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3 font-mono">
            Top Banner Preview
          </p>
          <div className="w-full rounded-2xl border border-dashed py-4 shadow-sm overflow-hidden flex justify-center bg-muted/20 relative px-4">
            <AdPreviewBanner ad={previewAd} interactive={false} />
          </div>
        </div>

        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_minmax(0,380px)] items-start">
          <div className="grid gap-5 sm:grid-cols-2 border rounded-xl p-5 sm:p-6 bg-card">
            <div className="sm:col-span-2 mb-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Ad Details
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure what your audience will see.
              </p>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel isRequired>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      size="lg"
                      placeholder="you@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel isRequired>Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      size="lg"
                      placeholder="Product name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel isRequired>Website URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      size="lg"
                      placeholder="https://yourwebsite.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buttonLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Label</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      size="lg"
                      placeholder="Get started for free"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <Stack className="w-full justify-between">
                    <FormLabel isRequired>Description</FormLabel>
                    <Note className="text-xs">Max. 160 chars</Note>
                  </Stack>
                  <FormControl>
                    <TextArea
                      size="lg"
                      placeholder="Brief description of your product"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="faviconUrl"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <div className="mb-3">
                    <FormLabel>Icon</FormLabel>
                    <p className="text-[13px] text-muted-foreground leading-tight mt-1">
                      Auto-fetched from website URL. You can override via direct
                      URL or file upload.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {previewAd.faviconUrl &&
                    previewAd.faviconUrl !== "/favicon.svg" ? (
                      <Image
                        src={previewAd.faviconUrl}
                        alt="favicon preview"
                        width={104}
                        height={104}
                        unoptimized
                        className="size-16 sm:size-[104px] rounded-xl border bg-muted object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect width="18" height="18" x="3" y="3" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="9" cy="9" r="2"%3E%3C/circle%3E%3Cpath d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"%3E%3C/path%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="size-16 sm:size-[104px] rounded-xl border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground border-dashed">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="opacity-50"
                        >
                          <title>Image placeholder</title>
                          <rect
                            width="18"
                            height="18"
                            x="3"
                            y="3"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 w-full grid gap-3">
                      <FormControl>
                        <Input
                          type="url"
                          size="lg"
                          placeholder="https://yourwebsite.com/icon.png"
                          className="w-full"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormField
                        control={form.control}
                        name="faviconFile"
                        render={({
                          field: { value, onChange, ...fieldProps },
                        }) => (
                          <FormControl>
                            <Input
                              {...fieldProps}
                              type="file"
                              size="lg"
                              hover
                              accept={IMAGE_ACCEPT}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                onChange(file);
                              }}
                            />
                          </FormControl>
                        )}
                      />
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 lg:sticky lg:top-[120px] h-fit">
            <div className="w-full">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Card Preview
              </h3>
            </div>
            <div className="rounded-2xl border border-dashed bg-card p-4 shadow-sm overflow-hidden flex flex-col items-center">
              <div className="w-full flex justify-center relative">
                <AdPreviewCard
                  ad={previewAd}
                  interactive={false}
                  className="w-full max-w-[328px]"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-3">
                  Total summary
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                  <Price
                    price={pricingSummary.totalCostCents / 100}
                    fullPrice={pricingSummary.fullOriginalCostCents / 100}
                    interval={
                      pricingSummary.billingCycle === "Monthly"
                        ? "month"
                        : "week"
                    }
                    priceClassName="text-4xl font-extrabold tracking-tight"
                  />
                </div>

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex justify-between items-center">
                    <span>
                      Base package ({pricingSummary.billingCycle.toLowerCase()})
                    </span>
                    <span className="font-medium text-foreground">
                      ${pricingSummary.packageCostCents / 100}
                    </span>
                  </li>
                  {pricingSummary.targetCount > 0 && (
                    <li className="flex justify-between items-center">
                      <span>
                        Targeting ({pricingSummary.targetCount} target
                        {pricingSummary.targetCount === 1 ? "" : "s"})
                      </span>
                      <span className="font-medium text-foreground">
                        ${pricingSummary.targetFeeCents / 100}
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {pricingSummary.billingCycle === "Weekly" && (
                <div className="mx-5 mb-5 rounded-xl border bg-muted/40 p-4 flex flex-col gap-3">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold">
                      Save 25% with Monthly!!
                    </strong>
                    <br />
                    Monthly plan includes a flat 25% discount on both the base
                    package and per-target pricing.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full shadow-sm font-medium"
                    isPending={switchToMonthlyAction.isPending}
                    onClick={() => {
                      switchToMonthlyAction.execute({
                        draftToken: activeDraftToken,
                        billingCycle: "Monthly",
                      });
                    }}
                  >
                    Switch to Monthly
                  </Button>
                </div>
              )}

              <div className="p-5 border-t bg-muted/20">
                <Button
                  type="submit"
                  size="lg"
                  variant="fancy"
                  className="w-full font-semibold"
                  isPending={isPending}
                >
                  Continue to checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
