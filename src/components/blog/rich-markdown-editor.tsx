'use client';

import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type RichMarkdownEditorProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  uploading: boolean;
}>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function safeUrl(value: string): string | null {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function inlineHtml(markdown: string): string {
  const token =
    /(<u>[^<]*<\/u>|<sub>[^<]*<\/sub>|<sup>[^<]*<\/sup>|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let result = '';
  let previous = 0;

  for (const match of markdown.matchAll(token)) {
    const part = match[0];
    const offset = match.index ?? 0;
    result += escapeHtml(markdown.slice(previous, offset));
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    const markup = part.match(/^<(u|sub|sup)>(.*?)<\/\1>$/);
    if (markup) {
      result += `<${markup[1]}>${escapeHtml(markup[2])}</${markup[1]}>`;
    } else if (image) {
      const src = safeUrl(image[2]);
      result += src
        ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(image[1])}" />`
        : escapeHtml(image[1]);
    } else if (link) {
      const href = safeUrl(link[2]);
      result += href
        ? `<a href="${escapeHtml(href)}">${escapeHtml(link[1])}</a>`
        : escapeHtml(link[1]);
    } else if (part.startsWith('**')) {
      result += `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    } else if (part.startsWith('*')) {
      result += `<em>${escapeHtml(part.slice(1, -1))}</em>`;
    } else {
      result += `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    }
    previous = offset + part.length;
  }

  return result + escapeHtml(markdown.slice(previous));
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (
      index + 1 < lines.length &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[index + 1].trim())
    ) {
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());
      const headers = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      const headerHtml = headers.map((cell) => `<th>${inlineHtml(cell)}</th>`).join('');
      const rowsHtml = rows
        .map(
          (row) =>
            `<tr>${headers.map((_, column) => `<td>${inlineHtml(row[column] ?? '')}</td>`).join('')}</tr>`,
        )
        .join('');
      blocks.push(`<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const tag = heading[1].length === 3 ? 'h3' : 'h2';
      blocks.push(`<${tag}>${inlineHtml(heading[2])}</${tag}>`);
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      const src = safeUrl(image[2]);
      if (src) blocks.push(`<p><img src="${escapeHtml(src)}" alt="${escapeHtml(image[1])}" /></p>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index++].trim().replace(/^>\s?/, ''));
      }
      blocks.push(
        `<blockquote>${quote.map((item) => `<p>${inlineHtml(item)}</p>`).join('')}</blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const ordered = /^\d+[.)]\s+/.test(line);
      const listPattern = ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/;
      const items: string[] = [];
      while (index < lines.length && listPattern.test(lines[index].trim())) {
        items.push(`<li>${inlineHtml(lines[index++].trim().replace(listPattern, ''))}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3}\s|>\s?|[-*]\s+|\d+[.)]\s+|!\[)/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index++].trim());
    }
    blocks.push(`<p>${inlineHtml(paragraph.join(' '))}</p>`);
  }

  return blocks.join('');
}

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.tagName === 'IMG') {
    const src = safeUrl(node.getAttribute('src') ?? '');
    return src ? `![${node.getAttribute('alt') ?? ''}](${src})` : '';
  }
  const content = Array.from(node.childNodes).map(serializeInline).join('');
  if (node.tagName === 'STRONG' || node.tagName === 'B') return `**${content}**`;
  if (node.tagName === 'EM' || node.tagName === 'I') return `*${content}*`;
  if (node.tagName === 'U') return `<u>${content}</u>`;
  if (node.tagName === 'SUB') return `<sub>${content}</sub>`;
  if (node.tagName === 'SUP') return `<sup>${content}</sup>`;
  if (node.tagName === 'CODE') return `\`${content}\``;
  if (node.tagName === 'A') {
    const href = safeUrl(node.getAttribute('href') ?? '');
    return href ? `[${content}](${href})` : content;
  }
  if (node.tagName === 'BR') return '\n';
  return content;
}

function serializeBlock(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() ?? '';
  if (!(node instanceof HTMLElement)) return '';
  const content = Array.from(node.childNodes).map(serializeInline).join('').trim();
  if (node.tagName === 'H1' || node.tagName === 'H2') return content ? `## ${content}` : '';
  if (node.tagName === 'H3') return content ? `### ${content}` : '';
  if (node.tagName === 'UL' || node.tagName === 'OL') {
    const items = Array.from(node.children)
      .filter((child) => child.tagName === 'LI')
      .map(
        (child, index) =>
          `${node.tagName === 'OL' ? `${index + 1}.` : '-'} ${serializeInline(child).trim()}`,
      );
    return items.join('\n');
  }
  if (node.tagName === 'BLOCKQUOTE') {
    return Array.from(node.children)
      .map((child) => serializeInline(child).trim())
      .filter(Boolean)
      .join('\n')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  }
  if (node.tagName === 'TABLE') {
    const rows = Array.from(node.querySelectorAll('tr')).map((row) =>
      Array.from(row.children).map((cell) => serializeInline(cell).trim()),
    );
    if (rows.length === 0) return '';
    const columns = Math.max(...rows.map((row) => row.length));
    const formatRow = (row: string[]) =>
      `| ${Array.from({ length: columns }, (_, index) => row[index] ?? '').join(' | ')} |`;
    return [
      formatRow(rows[0]),
      `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`,
      ...rows.slice(1).map(formatRow),
    ].join('\n');
  }
  if (node.tagName === 'FIGURE') {
    const image = node.querySelector('img');
    return image ? serializeInline(image) : content;
  }
  if (node.tagName === 'P' || node.tagName === 'DIV') return content;
  return serializeInline(node).trim();
}

function serializeEditor(editor: HTMLDivElement): string {
  return Array.from(editor.childNodes)
    .map(serializeBlock)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function RichMarkdownEditor({
  value,
  onChange,
  onUploadImage,
  uploading,
}: RichMarkdownEditorProps): React.JSX.Element {
  const editor = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastAppliedValue = useRef<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageAlt, setImageAlt] = useState('');

  useEffect(() => {
    const element = editor.current;
    if (!element || lastAppliedValue.current === value) return;
    element.innerHTML = markdownToHtml(value);
    lastAppliedValue.current = value;
    setSelectedImage(null);
    setImageAlt('');
  }, [value]);

  const rememberSelection = () => {
    const element = editor.current;
    const currentSelection = window.getSelection();
    if (
      element &&
      currentSelection?.rangeCount &&
      element.contains(currentSelection.getRangeAt(0).commonAncestorContainer)
    ) {
      savedRange.current = currentSelection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const element = editor.current;
    if (!element) return null;
    element.focus();
    const currentSelection = window.getSelection();
    if (
      currentSelection &&
      savedRange.current &&
      element.contains(savedRange.current.commonAncestorContainer)
    ) {
      currentSelection.removeAllRanges();
      currentSelection.addRange(savedRange.current);
    } else if (currentSelection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      currentSelection.removeAllRanges();
      currentSelection.addRange(range);
      savedRange.current = range.cloneRange();
    }
    return currentSelection;
  };

  const commit = () => {
    if (!editor.current) return;
    const next = serializeEditor(editor.current);
    lastAppliedValue.current = next;
    onChange(next);
    rememberSelection();
  };

  const runCommand = (command: string, argument?: string) => {
    restoreSelection();
    document.execCommand(command, false, argument);
    commit();
  };

  const addLink = () => {
    const selection = restoreSelection();
    const href = window.prompt('Paste the link URL');
    if (!href?.trim()) return;
    const safeHref = safeUrl(href.trim());
    if (!safeHref) {
      window.alert('Use a valid http, https, or site-relative URL.');
      return;
    }
    if (selection?.toString()) {
      document.execCommand('createLink', false, safeHref);
    } else {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(safeHref)}">Link text</a>`);
    }
    commit();
  };

  const addImage = async (file?: File) => {
    if (!file || !editor.current) return;
    const imageUrl = await onUploadImage(file);
    if (!imageUrl) return;
    const selection = restoreSelection();
    if (!selection) return;
    const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
    if (!selection.rangeCount) {
      range.selectNodeContents(editor.current);
      range.collapse(false);
    }
    range.deleteContents();
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt =
      file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[\[\]]/g, '')
        .trim() || 'Article image';
    range.insertNode(image);
    range.setStartAfter(image);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange.current = range.cloneRange();
    setSelectedImage(image);
    setImageAlt(image.alt);
    commit();
  };

  const toolbarButton = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    disabled = false,
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        rememberSelection();
      }}
      onClick={action}
      className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
    </button>
  );

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border bg-background">
      <div
        role="toolbar"
        aria-label="Article formatting"
        className="flex flex-wrap items-center gap-1 border-b bg-surface/80 px-3 py-2"
      >
        {toolbarButton('Bold', <Bold className="size-4" />, () => runCommand('bold'))}
        {toolbarButton('Italic', <Italic className="size-4" />, () => runCommand('italic'))}
        {toolbarButton('Underline', <Underline className="size-4" />, () =>
          runCommand('underline'),
        )}
        <span className="mx-1 h-6 border-l" aria-hidden="true" />
        {toolbarButton('Heading 2', <Heading2 className="size-4" />, () =>
          runCommand('formatBlock', '<h2>'),
        )}
        {toolbarButton('Heading 3', <Heading3 className="size-4" />, () =>
          runCommand('formatBlock', '<h3>'),
        )}
        {toolbarButton('Paragraph', <Pilcrow className="size-4" />, () =>
          runCommand('formatBlock', '<p>'),
        )}
        <span className="mx-1 h-6 border-l" aria-hidden="true" />
        {toolbarButton('Bulleted list', <List className="size-4" />, () =>
          runCommand('insertUnorderedList'),
        )}
        {toolbarButton('Numbered list', <ListOrdered className="size-4" />, () =>
          runCommand('insertOrderedList'),
        )}
        {toolbarButton('Quote', <Quote className="size-4" />, () =>
          runCommand('formatBlock', '<blockquote>'),
        )}
        {toolbarButton('Subscript', <Subscript className="size-4" />, () =>
          runCommand('subscript'),
        )}
        {toolbarButton('Superscript', <Superscript className="size-4" />, () =>
          runCommand('superscript'),
        )}
        {toolbarButton('Insert table', <Table2 className="size-4" />, () => {
          restoreSelection();
          document.execCommand(
            'insertHTML',
            false,
            '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>',
          );
          commit();
        })}
        {toolbarButton('Insert symbol', <span className="text-sm font-semibold">Ω</span>, () => {
          restoreSelection();
          document.execCommand('insertText', false, 'Ω');
          commit();
        })}
        {toolbarButton(
          'Insert formula symbol',
          <span className="text-sm font-semibold">Σ</span>,
          () => {
            restoreSelection();
            document.execCommand('insertText', false, '∑');
            commit();
          },
        )}
        <span className="mx-1 h-6 border-l" aria-hidden="true" />
        {toolbarButton('Add link', <Link2 className="size-4" />, addLink)}
        {toolbarButton(
          uploading ? 'Uploading image' : 'Insert image',
          <ImagePlus className="size-4" />,
          () => imageInput.current?.click(),
          uploading,
        )}
        {toolbarButton('Undo', <Undo2 className="size-4" />, () => runCommand('undo'))}
        {toolbarButton('Redo', <Redo2 className="size-4" />, () => runCommand('redo'))}
        <input
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            void addImage(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <span className="ml-auto hidden pr-2 text-xs text-muted-foreground md:inline">
          {uploading ? 'Uploading image…' : 'Your article is saved as formatted content'}
        </span>
      </div>
      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Article body"
        aria-multiline="true"
        data-placeholder="Start writing your article…"
        onInput={commit}
        onPaste={(event) => {
          event.preventDefault();
          restoreSelection();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
          commit();
        }}
        onDrop={(event) => event.preventDefault()}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onFocus={rememberSelection}
        onClick={(event) => {
          const target = event.target;
          if (target instanceof HTMLImageElement) {
            setSelectedImage(target);
            setImageAlt(target.alt);
          } else if (selectedImage) {
            setSelectedImage(null);
            setImageAlt('');
          }
        }}
        className="min-h-[28rem] px-5 py-5 text-[15px] leading-8 outline-none empty:before:pointer-events-none empty:before:text-muted-foreground/70 empty:before:content-[attr(data-placeholder)] [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand/40 [&_blockquote]:bg-brand/5 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_h2]:my-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-4 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-4 [&_img]:block [&_img]:max-h-[440px] [&_img]:max-w-full [&_img]:rounded-xl [&_li]:ml-6 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:bg-surface [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5"
      />
      {selectedImage ? (
        <div className="flex flex-wrap items-center gap-3 border-t bg-surface/70 px-4 py-3">
          <label
            htmlFor="article-image-alt"
            className="text-xs font-semibold text-muted-foreground"
          >
            Image description
          </label>
          <input
            id="article-image-alt"
            value={imageAlt}
            onChange={(event) => {
              const nextAlt = event.target.value;
              setImageAlt(nextAlt);
              selectedImage.alt = nextAlt;
              commit();
            }}
            placeholder="Describe the image for accessibility"
            className="h-9 min-w-[180px] flex-1 rounded-lg border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              selectedImage.remove();
              setSelectedImage(null);
              setImageAlt('');
              commit();
            }}
            className="text-destructive hover:bg-destructive/10 rounded-lg px-3 py-2 text-xs font-semibold"
          >
            Remove image
          </button>
        </div>
      ) : null}
    </section>
  );
}
