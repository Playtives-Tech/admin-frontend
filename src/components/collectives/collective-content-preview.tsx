import { marked } from 'marked';

export type CollectiveAboutFormat = 'TEXT' | 'MARKDOWN' | 'HTML';

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function CollectiveContentPreview({
  format,
  content,
}: Readonly<{ format: CollectiveAboutFormat; content: string }>): React.JSX.Element {
  const rendered =
    format === 'HTML'
      ? content
      : format === 'MARKDOWN'
        ? marked.parse(content, { async: false })
        : `<p class="plain">${escapeHtml(content).replaceAll('\n', '<br>')}</p>`;
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; script-src 'none'"><style>
    *{box-sizing:border-box}body{margin:0;padding:20px;color:#17211c;font:15px/1.7 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere}
    h1,h2,h3{line-height:1.25;margin:1.2em 0 .55em;color:#15221b}h1{font-size:1.7rem}h2{font-size:1.35rem}h3{font-size:1.1rem}
    p{margin:.65em 0}ul,ol{padding-left:1.5rem}li+li{margin-top:.3em}blockquote{margin:1em 0;padding:.25em 1em;border-left:3px solid #25815d;color:#59665f}
    a{color:#19744e;text-decoration:underline}code{padding:.12em .35em;border-radius:4px;background:#f0f3f1;font: .9em ui-monospace,monospace}pre{overflow:auto;padding:12px;border-radius:8px;background:#f0f3f1}hr{border:0;border-top:1px solid #dce3df;margin:1.4em 0}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #dce3df;text-align:left}.plain{white-space:pre-wrap}
  </style></head><body>${rendered}</body></html>`;

  return (
    <iframe
      aria-label="Collective About content preview"
      className="h-80 w-full rounded-xl border bg-white"
      sandbox=""
      srcDoc={srcDoc}
      title="Collective About preview"
    />
  );
}
