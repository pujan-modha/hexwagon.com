import type { ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prose } from "~/components/common/prose"
import { MDXComponents } from "~/components/web/mdx-components"

type MarkdownProps = ComponentProps<typeof Prose> & {
  code: string
}

export const Markdown = ({ code, ...props }: MarkdownProps) => {
  return (
    <Prose {...props}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MDXComponents}>
        {code}
      </ReactMarkdown>
    </Prose>
  )
}
