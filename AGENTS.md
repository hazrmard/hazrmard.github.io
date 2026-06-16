This is a hugo blog.

The blog uses a custom theme defined in ./themes/hugolb

Content is categorized by:

- Long-form posts ./content/post
- Rough notes ./content/note
- Personal projects ./content/project
- CV ./content/resume (which loads an AngularJS single-page app)
- About ./content/about (news, professional profile)

## Rules

- If needed, each post is a self-contained directory. JS/image/css dependencies are in the directory of the post. The entry point is index.md
- Posts not needing dependencies can be stand-alone .md files in post/ note/ project/ etc.
- There is no JS build step. Everything is static.
- Blog is deployed to github pages. Workflow is defined in ./github/workflows/hugo.yml. The branch "source" is the basis for the github pages site.
- The branch "drafts" is the main trunk of in-development content. Other draft post branches get checked out from "drafts". Naming convention of such branches is "post/POST-NAME".
- Do not push to "source" branch. This is always a manual operation done by the user.