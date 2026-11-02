'use client';
/* eslint-disable @next/next/no-img-element -- External admin-upload preview URLs are intentionally rendered without Next image optimization. */

import { ArrowLeft, ImagePlus, PanelRight, Save, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/shell';
import { useAuth } from '@/components/providers/auth-provider';
import { blogAdminService, type BlogPayload, type BlogPost } from '@/lib/services/blog-service';
import { BlogArticlePreview } from './blog-article-preview';
import { RichMarkdownEditor } from './rich-markdown-editor';

const empty: BlogPayload = {
  title: '',
  excerpt: '',
  content: '',
  category: 'General',
  tags: [],
  coverImageUrl: null,
  coverImageAlt: null,
  seoTitle: null,
  seoDescription: null,
  status: 'DRAFT',
};

type LocalDraft = { post: BlogPayload; tags: string; savedAt: number };

function draftKey(userId: string, id?: string): string {
  return `playtives:blog-editor:${userId}:${id ?? 'new'}`;
}

function readDraft(key: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocalDraft;
    return draft?.post && typeof draft.tags === 'string' && typeof draft.savedAt === 'number'
      ? draft
      : null;
  } catch {
    return null;
  }
}

export function BlogEditor({ id }: Readonly<{ id?: string }>): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPayload>(empty);
  const [authorName, setAuthorName] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadedScope, setLoadedScope] = useState('');
  const [dirty, setDirty] = useState(false);
  const [recovery, setRecovery] = useState<LocalDraft | null>(null);
  const editRevision = useRef(0);
  const latest = useRef({ post, tags });
  latest.current = { post, tags };
  useEffect(() => {
    if (!user?.sub) return;
    const scope = `${user.sub}:${id ?? 'new'}`;
    let active = true;
    setReady(false);
    setLoadedScope('');
    setDirty(false);
    setRecovery(null);
    void blogAdminService
      .list(50)
      .then((data) => {
        if (active) setPublishedPosts(data.items.filter((item) => item.status === 'PUBLISHED'));
      })
      .catch(() => {
        if (active) setPublishedPosts([]);
      });
    if (id) {
      void blogAdminService
        .get(id)
        .then((value) => {
          if (!active) return;
          setPost({
            title: value.title,
            excerpt: value.excerpt,
            content: value.content,
            category: value.category,
            tags: value.tags,
            coverImageUrl: value.coverImageUrl,
            coverImageAlt: value.coverImageAlt,
            seoTitle: value.seoTitle,
            seoDescription: value.seoDescription,
            status: value.status,
          });
          setTags(value.tags.join(', '));
          setAuthorName(value.authorName ?? '');
          setPublishedAt(value.publishedAt);
          setRecovery(readDraft(draftKey(user.sub, id)));
          setLoadedScope(scope);
          setReady(true);
        })
        .catch(() => toast.error('Could not load article'));
    } else {
      setPost(empty);
      setTags('');
      setRecovery(readDraft(draftKey(user.sub)));
      setLoadedScope(scope);
      setReady(true);
    }
    return () => {
      active = false;
    };
  }, [id, user?.sub]);
  useEffect(() => {
    if (!ready || !dirty || !user?.sub || loadedScope !== `${user.sub}:${id ?? 'new'}`) return;
    const key = draftKey(user.sub, id);
    const persist = () => {
      try {
        localStorage.setItem(key, JSON.stringify({ ...latest.current, savedAt: Date.now() }));
      } catch {
        toast.error('Browser storage is unavailable; save this draft to the server.');
      }
    };
    const timer = window.setTimeout(persist, 400);
    window.addEventListener('pagehide', persist);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', persist);
    };
  }, [id, post, tags, ready, dirty, user?.sub, loadedScope]);
  const update = <K extends keyof BlogPayload>(key: K, value: BlogPayload[K]) => {
    editRevision.current += 1;
    setDirty(true);
    setPost((current) => ({ ...current, [key]: value }));
  };
  const updateTags = (value: string) => {
    editRevision.current += 1;
    setDirty(true);
    setTags(value);
  };
  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const image = await blogAdminService.uploadImage(file);
      toast.success('Image uploaded');
      return image.imageUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };
  const uploadCover = async (file?: File) => {
    if (!file) return;
    const imageUrl = await uploadImage(file);
    if (imageUrl) update('coverImageUrl', imageUrl);
  };
  const save = async (status: 'DRAFT' | 'PUBLISHED') => {
    setSaving(true);
    const submittedRevision = editRevision.current;
    const payload = {
      ...post,
      status,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    try {
      const saved = id
        ? await blogAdminService.update(id, payload)
        : await blogAdminService.create(payload);
      toast.success(status === 'PUBLISHED' ? 'Article published' : 'Draft saved');
      setAuthorName(saved.authorName ?? '');
      setPublishedAt(saved.publishedAt);
      if (submittedRevision === editRevision.current) {
        setDirty(false);
        setRecovery(null);
        if (user?.sub) {
          try {
            localStorage.removeItem(draftKey(user.sub, id));
          } catch {
            toast.warning('Saved online, but could not clear the browser copy.');
          }
        }
      }
      if (!id) router.replace(`/blog/${saved._id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save article');
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardShell
      title={id ? 'Edit article' : 'New article'}
      description="Create a polished member-facing article"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to articles
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setPreview((value) => !value)}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              <PanelRight className="mr-2 inline size-4" />
              {preview ? 'Hide preview' : 'Show preview'}
            </button>
            <button
              disabled={saving}
              onClick={() => void save('DRAFT')}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              <Save className="mr-2 inline size-4" />
              Save draft
            </button>
            <button
              disabled={saving}
              onClick={() => void save('PUBLISHED')}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
            >
              <Send className="mr-2 inline size-4" />
              Publish
            </button>
          </div>
        </div>
        {recovery ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <span>
              Unsaved browser draft found from {new Date(recovery.savedAt).toLocaleString()}.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-brand px-3 py-2 font-semibold text-brand-foreground"
                onClick={() => {
                  setPost(recovery.post);
                  setTags(recovery.tags);
                  editRevision.current += 1;
                  setDirty(true);
                  setRecovery(null);
                }}
              >
                Restore draft
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-400 px-3 py-2 font-semibold"
                onClick={() => {
                  if (user?.sub) localStorage.removeItem(draftKey(user.sub, id));
                  setRecovery(null);
                }}
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}
        {dirty ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Changes are saved in this browser until you save the article.
          </p>
        ) : null}
        <div
          className={`grid items-start gap-6 ${preview ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]' : ''}`}
        >
          <section
            className={`app-surface min-w-0 rounded-2xl border p-5 sm:p-6 ${preview ? 'xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto' : ''}`}
          >
            <input
              value={post.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Article title"
              aria-label="Article title"
              className="w-full border-b bg-transparent pb-3 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/70 sm:text-[28px]"
            />
            <textarea
              value={post.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              placeholder="Short summary for article cards and search"
              className="mt-4 h-20 w-full resize-none rounded-xl border p-3 text-sm"
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                Category
                <input
                  value={post.category}
                  onChange={(e) => update('category', e.target.value)}
                  placeholder="e.g. Investing basics"
                  className="h-11 rounded-xl border px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Tags{' '}
                <span className="font-normal text-muted-foreground">(separate with commas)</span>
                <input
                  value={tags}
                  onChange={(e) => updateTags(e.target.value)}
                  placeholder="wallet, investing, guide"
                  className="h-11 rounded-xl border px-3 font-normal"
                />
              </label>
            </div>
            <section className="mt-5 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Featured image</h2>
                  <p className="text-xs text-muted-foreground">
                    Shown on article cards and at the top of the post.
                  </p>
                </div>
                <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold">
                  <ImagePlus className="mr-1 inline size-4" />
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(e) => {
                      void uploadCover(e.target.files?.[0]);
                      e.currentTarget.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              {post.coverImageUrl ? (
                <>
                  <img
                    src={post.coverImageUrl}
                    alt="Featured preview"
                    className="mt-4 aspect-video w-full rounded-lg object-cover"
                  />
                  <input
                    value={post.coverImageAlt ?? ''}
                    onChange={(e) => update('coverImageAlt', e.target.value || null)}
                    placeholder="Describe the featured image for accessibility"
                    className="mt-3 h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </>
              ) : null}
            </section>
            <RichMarkdownEditor
              value={post.content}
              onChange={(value) => update('content', value)}
              onUploadImage={uploadImage}
              uploading={uploading}
            />
            <details className="mt-5 rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">SEO metadata</summary>
              <div className="mt-4 grid gap-3">
                <input
                  value={post.seoTitle ?? ''}
                  onChange={(e) => update('seoTitle', e.target.value || null)}
                  placeholder="SEO title (up to 60 characters)"
                  maxLength={60}
                  className="h-11 rounded-xl border px-3 text-sm"
                />
                <textarea
                  value={post.seoDescription ?? ''}
                  onChange={(e) => update('seoDescription', e.target.value || null)}
                  placeholder="SEO description (up to 160 characters)"
                  maxLength={160}
                  className="h-20 rounded-xl border p-3 text-sm"
                />
              </div>
            </details>
          </section>
          {preview ? (
            <div className="min-w-0 xl:sticky xl:top-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="text-sm font-semibold">Public website preview</p>
                <span className="text-xs text-muted-foreground">Live · matches article layout</span>
              </div>
              <BlogArticlePreview
                post={{ ...post, authorName, publishedAt }}
                relatedPosts={publishedPosts
                  .filter(
                    (item) =>
                      item._id !== id &&
                      (item.category === post.category ||
                        item.tags.some((tag) => post.tags.includes(tag))),
                  )
                  .slice(0, 3)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
