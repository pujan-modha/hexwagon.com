import { withAdminPage } from "~/components/admin/auth-hoc"
import { H3 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { findComments } from "~/server/admin/comments/queries"
import { CommentsTable } from "./_components/comments-table"

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

      <CommentsTable comments={comments} />
    </div>
  )
}

export default withAdminPage(CommentsPage)
