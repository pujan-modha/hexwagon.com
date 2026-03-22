import { formatDate } from "@primoui/utils"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { H3 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { findComments } from "~/server/admin/comments/queries"

const CommentsPage = async () => {
  const { comments, commentsTotal } = await findComments({})

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <H3>Comments</H3>
        <Note>
          {commentsTotal} comment{commentsTotal === 1 ? "" : "s"}
        </Note>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Port</th>
              <th className="px-4 py-3 text-left font-medium">Author</th>
              <th className="px-4 py-3 text-left font-medium">Content</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {comments.map(comment => (
              <tr key={comment.id} className="border-t">
                <td className="px-4 py-3">{comment.port?.name ?? "Unknown"}</td>
                <td className="px-4 py-3">{comment.author?.name ?? "Anonymous"}</td>
                <td className="px-4 py-3">{comment.content}</td>
                <td className="px-4 py-3">{formatDate(comment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default withAdminPage(CommentsPage)
