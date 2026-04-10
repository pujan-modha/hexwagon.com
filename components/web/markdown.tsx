import type { ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert"
import remarkGfm from "remark-gfm"
import { cx } from "~/utils/cva"

type MarkdownProps = ComponentProps<"div"> & {
  code: string
}

export const Markdown = ({ code, className, ...props }: MarkdownProps) => {
  return (
    <div className={cx("markdown-body github-markdown-body", className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkGithubBlockquoteAlert]}
        rehypePlugins={[rehypeRaw]}
      >
        {code}
      </ReactMarkdown>
    </div>
  )
}
