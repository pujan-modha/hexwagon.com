"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ReportType } from "@prisma/client";
import { sentenceCase } from "change-case";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { reportPlatform, reportPort, reportTheme } from "~/actions/report";
import { Button } from "~/components/common/button";
import { Icon } from "~/components/common/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/common/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form";
import { RadioGroup, RadioGroupItem } from "~/components/common/radio-group";
import { TextArea } from "~/components/common/textarea";
import { LoginDialog } from "~/components/web/auth/login-dialog";
import { useSession } from "~/lib/auth-client";
import { type ReportSchema, reportSchema } from "~/server/web/shared/schema";

type EntityType = "theme" | "platform" | "port";

type EntityReportButtonProps = {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  grouped?: boolean;
};

export const EntityReportButton = ({
  entityType,
  entityId,
  entityName,
  grouped = false,
}: EntityReportButtonProps) => {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ReportSchema>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: ReportType.Outdated,
      message: "",
    },
  });

  const onSuccess = () => {
    toast.success("Thanks. Your report has been submitted.");
    form.reset();
    setIsOpen(false);
  };

  const onError = ({ err }: { err: Error }) => toast.error(err.message);

  const portAction = useServerAction(reportPort, { onSuccess, onError });
  const themeAction = useServerAction(reportTheme, { onSuccess, onError });
  const platformAction = useServerAction(reportPlatform, {
    onSuccess,
    onError,
  });

  const isPending =
    portAction.isPending || themeAction.isPending || platformAction.isPending;

  const handleSubmit = form.handleSubmit((data) => {
    if (entityType === "port") {
      portAction.execute({ portId: entityId, ...data });
      return;
    }

    if (entityType === "theme") {
      themeAction.execute({ themeId: entityId, ...data });
      return;
    }

    platformAction.execute({ platformId: entityId, ...data });
  });

  if (!session?.user) {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant={grouped ? "ghost" : "secondary"}
          onClick={() => setIsOpen(true)}
          className={
            grouped
              ? "h-8 w-10 rounded-none px-0 text-muted-foreground hover:bg-muted/30 [&>span]:flex [&>span]:items-center [&>span]:justify-center"
              : undefined
          }
          aria-label="Report"
          title="Report"
        >
          {grouped ? <Icon name="lucide/flag" /> : "Report"}
        </Button>

        <LoginDialog
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          description="Sign in to report incorrect, outdated, or missing information."
        />
      </>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={grouped ? "ghost" : "secondary"}
          className={
            grouped
              ? "h-8 w-10 rounded-none px-0 text-muted-foreground hover:bg-muted/30 [&>span]:flex [&>span]:items-center [&>span]:justify-center"
              : undefined
          }
          aria-label="Report"
          title="Report"
        >
          {grouped ? <Icon name="lucide/flag" /> : "Report"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report {entityName}</DialogTitle>
          <DialogDescription>
            Let us know if anything is outdated, incorrect, or missing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid gap-3"
                    >
                      {Object.values(ReportType).map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={type}
                            id={`r-${entityType}-${type}`}
                          />
                          <FormLabel htmlFor={`r-${entityType}-${type}`}>
                            {sentenceCase(type)}
                          </FormLabel>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (optional)</FormLabel>
                  <FormControl>
                    <TextArea
                      placeholder="Example: homepage URL is outdated, version details are wrong, or add missing context."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" className="min-w-28" isPending={isPending}>
                Send Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
