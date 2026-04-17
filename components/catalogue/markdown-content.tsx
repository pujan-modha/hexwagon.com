import type { ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert"
import { Card } from "~/components/common/card"
import { cx } from "~/utils/cva"

type MarkdownContentProps = {
  content?: string | null
  emptyState?: string
  className?: string
} & ComponentProps<"div">

const MarkdownContent = ({ content, emptyState, className, ...props }: MarkdownContentProps) => {
  if (!content) {
    return (
      <Card className={cx("p-6 text-muted-foreground", className)} {...props}>
        {emptyState ?? "No content available."}
      </Card>
    )
  }

  return (
    <Card className={cx("p-6", className)} {...props}>
      <div className="markdown-body github-markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkGithubBlockquoteAlert]}
          rehypePlugins={[rehypeRaw]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  )
}

export { MarkdownContent }
