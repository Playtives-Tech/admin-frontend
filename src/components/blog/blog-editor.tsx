'use client';
/* eslint-disable @next/next/no-img-element -- External admin-upload preview URLs are intentionally rendered without Next image optimization. */

import { ArrowLeft, ImagePlus, PanelRight, Save, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/shell';
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

export function BlogEditor({ id }: Readonly<{ id?: string }>): React.JSX.Element {
  const router = useRouter();
  const [post, setPost] = useState<BlogPayload>(empty);
  const [authorName, setAuthorName] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    void blogAdminService
      .list(50)
      .then((data) => setPublishedPosts(data.items.filter((item) => item.status === 'PUBLISHED')))
      .catch(() => setPublishedPosts([]));
    if (id)
      void blogAdminService.get(id).then((value) => {
        setPost(value);
        setTags(value.tags.join(', '));
        setAuthorName(value.authorName ?? '');
        setPublishedAt(value.publishedAt);
      });
  }, [id]);
  const update = <K extends keyof BlogPayload>(key: K, value: BlogPayload[K]) =>
    setPost((current) => ({ ...current, [key]: value }));
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
        <div
          className={`grid items-start gap-6 ${preview ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]' : ''}`}
        >
          <section className="app-surface min-w-0 rounded-2xl border p-5 sm:p-6">
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
                  onChange={(e) => setTags(e.target.value)}
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
            <div className="min-w-0">
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
