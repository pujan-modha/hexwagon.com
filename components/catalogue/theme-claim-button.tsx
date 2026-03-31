"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { submitThemeMaintainerClaim } from "~/actions/theme-claims"
import { Button } from "~/components/common/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/common/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form"
import { Input } from "~/components/common/input"
import { TextArea } from "~/components/common/textarea"

const themeClaimSchema = z.object({
  claimantName: z.string().min(2, "Name is required"),
  claimantEmail: z.string().email("Valid email is required"),
  claimantUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  details: z.string().min(10, "Please provide more details"),
})

type ThemeClaimButtonProps = {
  themeId: string
  themeName: string
}

export const ThemeClaimButton = ({ themeId, themeName }: ThemeClaimButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<z.infer<typeof themeClaimSchema>>({
    resolver: zodResolver(themeClaimSchema),
    defaultValues: {
      claimantName: "",
      claimantEmail: "",
      claimantUrl: "",
      details: "",
    },
  })

  const submitAction = useServerAction(submitThemeMaintainerClaim, {
    onSuccess: () => {
      toast.success("Your claim has been submitted for review")
      form.reset()
      setIsOpen(false)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const handleSubmit = form.handleSubmit(values => {
    submitAction.execute({
      themeId,
      ...values,
    })
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          Claim
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim {themeName}</DialogTitle>
          <DialogDescription>
            Share your details and why you should maintain this theme. Admin will review your request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <FormField
              control={form.control}
              name="claimantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claimantEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claimantUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://github.com/your-profile" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why should you maintain this theme?</FormLabel>
                  <FormControl>
                    <TextArea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isPending={submitAction.isPending}>
                Submit Claim
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
