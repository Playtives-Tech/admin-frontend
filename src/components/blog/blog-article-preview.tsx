'use client';
/* eslint-disable @next/next/no-img-element -- Preview uses the same external image URLs as published articles. */

import styles from './blog-article-preview.module.css';

type PreviewPost = Readonly<{
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName?: string;
  publishedAt?: string | null;
}>;

type RelatedPost = Readonly<{
  _id: string;
  title: string;
  category: string;
  content: string;
}>;

function articleDate(value?: string | null): string {
  if (!value) return 'Recently published';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently published'
    : new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
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

function getHeadings(markdown: string): { id: string; title: string; level: number }[] {
  return markdown.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^(##|###)\s+(.+)$/);
    if (!match) return [];
    const title = match[2].replace(/[*_`]/g, '').trim();
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return [{ id, title, level: match[1].length }];
  });
}

function inline(markdown: string): React.ReactNode[] {
  const token =
    /(<u>[^<]*<\/u>|<sub>[^<]*<\/sub>|<sup>[^<]*<\/sup>|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  return markdown
    .split(token)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${index}-${part.slice(0, 14)}`;
      const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) {
        const src = safeUrl(image[2]);
        return src ? (
          <img className={styles.inlineImage} key={key} src={src} alt={image[1]} />
        ) : null;
      }
      const markup = part.match(/^<(u|sub|sup)>(.*?)<\/\1>$/);
      if (markup) {
        if (markup[1] === 'u') return <u key={key}>{markup[2]}</u>;
        if (markup[1] === 'sub') return <sub key={key}>{markup[2]}</sub>;
        return <sup key={key}>{markup[2]}</sup>;
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = safeUrl(link[2]);
        return href ? (
          <a
            key={key}
            href={href}
            target={href.startsWith('/') ? undefined : '_blank'}
            rel={href.startsWith('/') ? undefined : 'noopener noreferrer'}
          >
            {link[1]}
          </a>
        ) : (
          <span key={key}>{link[1]}</span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={key}>{part.slice(1, -1)}</code>;
      return <span key={key}>{part}</span>;
    });
}

function ArticleBody({ markdown }: { markdown: string }): React.JSX.Element {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
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
      blocks.push(
        <div className={styles.tableWrap} key={`table-${index}`}>
          <table>
            <thead>
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th key={cellIndex}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex}>{inline(row[cellIndex] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const title = heading[2].replace(/[*_`]/g, '').trim();
      const headingId = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      blocks.push(
        heading[1].length === 3 ? (
          <h3 id={headingId} key={index}>
            {inline(heading[2])}
          </h3>
        ) : (
          <h2 id={headingId} key={index}>
            {inline(heading[2])}
          </h2>
        ),
      );
      index += 1;
      continue;
    }

    const standaloneImage = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (standaloneImage) {
      const src = safeUrl(standaloneImage[2]);
      if (src) {
        blocks.push(
          <figure className={styles.figure} key={index}>
            <img src={src} alt={standaloneImage[1]} />
            {standaloneImage[1] ? <figcaption>{standaloneImage[1]}</figcaption> : null}
          </figure>,
        );
      }
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index++].trim().replace(/^>\s?/, ''));
      }
      blocks.push(
        <blockquote key={`quote-${index}`}>
          {quote.map((item, quoteIndex) => (
            <p key={quoteIndex}>{inline(item)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index++].trim().replace(/^[-*]\s+/, ''));
      }
      blocks.push(
        <ul key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index++].trim().replace(/^\d+[.)]\s+/, ''));
      }
      blocks.push(
        <ol key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ol>,
      );
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
    blocks.push(<p key={`paragraph-${index}`}>{inline(paragraph.join(' '))}</p>);
  }

  return <div className={styles.articleBody}>{blocks}</div>;
}

export function BlogArticlePreview({
  post,
  relatedPosts,
}: {
  post: PreviewPost;
  relatedPosts: RelatedPost[];
}): React.JSX.Element {
  const readMinutes = Math.max(
    1,
    Math.ceil(post.content.trim().split(/\s+/).filter(Boolean).length / 200),
  );
  const headings = getHeadings(post.content);

  return (
    <article className={styles.preview}>
      <div className={styles.browserBar}>
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>playtives.com / blog / article-preview</span>
        <span aria-hidden="true">↗</span>
      </div>
      <div className={styles.page}>
        <a className={styles.backLink} href="#preview">
          ← Back to the learning library
        </a>
        <header className={styles.articleHero}>
          <span className={styles.category}>{post.category || 'Wealth learning'}</span>
          <h1>{post.title || 'Your article title'}</h1>
          <p className={styles.excerpt}>
            {post.excerpt || 'Your article introduction will appear here.'}
          </p>
          <div className={styles.byline}>
            <span>{'Playtives'}</span>
            <span aria-hidden="true">·</span>
            <span>{articleDate(post.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{readMinutes} min read</span>
          </div>
          {post.coverImageUrl ? (
            <div className={styles.cover}>
              <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} />
            </div>
          ) : null}
        </header>
        <div
          className={`${styles.readerLayout} ${headings.length ? '' : styles.readerLayoutNoContents}`}
        >
          {headings.length > 0 ? (
            <aside className={styles.contents}>
              <p>In this guide</p>
              <nav aria-label="Article contents">
                {headings.map((heading) => (
                  <a
                    className={heading.level === 3 ? styles.subheadingLink : ''}
                    href={`#${heading.id}`}
                    key={heading.id}
                  >
                    {heading.title}
                  </a>
                ))}
              </nav>
            </aside>
          ) : null}
          <ArticleBody markdown={post.content} />
        </div>
        {/* <aside className={styles.learningNote}>
          <span aria-hidden="true">✳</span>
          <div>
            <strong>Keep learning with Playtives</strong>
            <p>
              Understanding the model, the terms and the risks is part of building wealth with
              intention.
            </p>
          </div>
          <span className={styles.learningLink}>Explore more guides →</span>
        </aside> */}
        {relatedPosts.length > 0 ? (
          <section className={styles.related}>
            <div className={styles.relatedHeading}>
              <div>
                <p className={styles.relatedEyebrow}>Continue learning</p>
                <h2>Related guides</h2>
              </div>
              <span>All guides →</span>
            </div>
            <div className={styles.relatedGrid}>
              {relatedPosts.map((item) => (
                <div key={item._id}>
                  <span>
                    {item.category || 'Wealth learning'} ·{' '}
                    {Math.max(
                      1,
                      Math.ceil(item.content.trim().split(/\s+/).filter(Boolean).length / 200),
                    )}{' '}
                    min read
                  </span>
                  <strong>{item.title}</strong>
                  <span className={styles.relatedArrow}>Read guide →</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
