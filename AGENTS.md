<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Types live in src/types, mock seed data in src/mocks, Excel helpers in src/services; UI reads via the useIams store — so mocks can be swapped for REST API calls without touching pages.
- All Excel imports use the shared ExcelImportDialog (template → upload → validate → preview → confirm) — keeps import UX consistent.
