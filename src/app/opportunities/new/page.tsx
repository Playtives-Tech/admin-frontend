'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MdChevronRight, MdAccessTime, MdAdd, MdClose, MdSync, MdFileUpload } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { EditorTabs } from '@/components/opportunities/editor-tabs';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';

export default function NewOpportunityPage(): React.JSX.Element {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Agriculture',
    summary: '',
    about: '',
    pricePerUnit: '',
    minUnits: '',
    unitsAvailable: '',
    positionsTotal: '',
    maxPositionsPerMember: '',
    duration: '',
    projectedMonthlyProfit: '',
    projectedTotalProfit: '',
    distributionFrequency: 'Fixed monthly',
    ownershipModel: 'Co-ownership',
    rollover: false,
    principalReleaseDate: '',
    location: '',
    operator: '',
    status: 'Draft',
    alt: '',
  });

  const [images, setImages] = useState<string[]>(['']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const handleLocalFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newImages = [...images];
      newImages[index] = base64String;
      setImages(newImages);
    };
    reader.readAsDataURL(file);
  };

  const addImageField = () => setImages([...images, '']);
  const removeImageField = (index: number) => setImages(images.filter((_, i) => i !== index));

  const handleSubmit = async (status: 'Draft' | 'Published') => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...formData,
        status,
        pricePerUnit: Number(formData.pricePerUnit),
        minUnits: Number(formData.minUnits),
        unitsAvailable: Number(formData.unitsAvailable),
        positionsTotal: Number(formData.positionsTotal),
        maxPositionsPerMember: Number(formData.maxPositionsPerMember),
        images: images.filter((url) => url.trim() !== ''),
      };

      // Temporary bypass for creating opportunity
      console.log('Mock creating opportunity:', payload);
      await new Promise((resolve) => setTimeout(resolve, 500));

      notify.success('Opportunity created successfully!');
      router.push('/opportunities');
    } catch (err: any) {
      notify.error(err.message || 'Failed to create opportunity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell title="New Opportunity" description="Create a new investment opportunity">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/opportunities" className="hover:text-foreground">Opportunities</Link>
          <MdChevronRight className="size-4" />
          <span className="text-foreground">New Opportunity</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {formData.name || 'Untitled Opportunity'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
               <MdAccessTime className="size-3.5" />
               Draft
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <EditorTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content Layout */}
        <div className="grid items-start gap-8 lg:grid-cols-3">
          
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <div className="app-surface rounded-2xl border p-6 shadow-sm sm:p-8 max-w-4xl">
              <h2 className="mb-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {activeTab === 'overview' ? 'Commercial summary' : activeTab === 'documents' ? 'Media & Documents' : 'Key Facts'}
              </h2>
              
              <div className="grid gap-6">
                
                {activeTab === 'overview' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="name" className="text-sm font-medium">Opportunity name *</label>
                        <input id="name" type="text" value={formData.name} onChange={handleChange} required placeholder="e.g. Palm oil trade cycle 08" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="type" className="text-sm font-medium">Category *</label>
                        <select id="type" value={formData.type} onChange={handleChange} className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand">
                          <option>Agriculture</option>
                          <option>Real estate</option>
                          <option>Infrastructure</option>
                          <option>Manufacturing</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <label htmlFor="summary" className="text-sm font-medium">Member-facing summary *</label>
                      <textarea id="summary" rows={4} value={formData.summary} onChange={handleChange} required placeholder="Describe the opportunity..." className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand resize-y" />
                    </div>

                    <div className="grid gap-1.5 mt-4">
                      <label htmlFor="about" className="text-sm font-medium">Detailed description (About) *</label>
                      <textarea id="about" rows={6} value={formData.about} onChange={handleChange} required placeholder="Detailed information about the opportunity..." className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand resize-y" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <div className="grid gap-1.5">
                        <label htmlFor="unitsAvailable" className="text-sm font-medium">Units available *</label>
                        <input id="unitsAvailable" type="number" value={formData.unitsAvailable} onChange={handleChange} required placeholder="e.g. 500" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="positionsTotal" className="text-sm font-medium">Total positions *</label>
                        <input id="positionsTotal" type="number" value={formData.positionsTotal} onChange={handleChange} required placeholder="e.g. 1000" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <div className="grid gap-1.5">
                        <label htmlFor="maxPositionsPerMember" className="text-sm font-medium">Max positions per member *</label>
                        <input id="maxPositionsPerMember" type="number" value={formData.maxPositionsPerMember} onChange={handleChange} required placeholder="e.g. 10" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="principalReleaseDate" className="text-sm font-medium">Principal release date *</label>
                        <input id="principalReleaseDate" type="date" value={formData.principalReleaseDate} onChange={handleChange} required className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'key-facts' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="pricePerUnit" className="text-sm font-medium">Price per unit (₦) *</label>
                        <input id="pricePerUnit" type="number" value={formData.pricePerUnit} onChange={handleChange} required placeholder="e.g. 100000" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="minUnits" className="text-sm font-medium">Minimum number of units *</label>
                        <input id="minUnits" type="number" value={formData.minUnits} onChange={handleChange} required placeholder="e.g. 5" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="duration" className="text-sm font-medium">Duration *</label>
                        <input id="duration" type="text" value={formData.duration} onChange={handleChange} required placeholder="e.g. 6 Months" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="distributionFrequency" className="text-sm font-medium">Return schedule *</label>
                        <select id="distributionFrequency" value={formData.distributionFrequency} onChange={handleChange} className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand">
                          <option>Fixed monthly</option>
                          <option>At maturity</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="projectedMonthlyProfit" className="text-sm font-medium">Projected monthly profit *</label>
                        <input id="projectedMonthlyProfit" type="text" value={formData.projectedMonthlyProfit} onChange={handleChange} required placeholder="e.g. 2.5%" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="projectedTotalProfit" className="text-sm font-medium">Projected total profit *</label>
                        <input id="projectedTotalProfit" type="text" value={formData.projectedTotalProfit} onChange={handleChange} required placeholder="e.g. 15%" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="operator" className="text-sm font-medium">Operator *</label>
                        <input id="operator" type="text" value={formData.operator} onChange={handleChange} required placeholder="e.g. AgroCorp Ltd" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="location" className="text-sm font-medium">Location *</label>
                        <input id="location" type="text" value={formData.location} onChange={handleChange} required placeholder="e.g. Lagos, Nigeria" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <div className="grid gap-1.5">
                        <label htmlFor="ownershipModel" className="text-sm font-medium">Ownership model *</label>
                        <select id="ownershipModel" value={formData.ownershipModel} onChange={handleChange} className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand">
                          <option>Co-ownership</option>
                          <option>Full ownership</option>
                        </select>
                      </div>
                      <div className="grid gap-1.5 flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <input 
                            id="rollover" 
                            type="checkbox" 
                            checked={formData.rollover as boolean} 
                            onChange={(e) => setFormData(prev => ({ ...prev, rollover: e.target.checked }))} 
                            className="rounded border-gray-300 text-brand focus:ring-brand" 
                          />
                          Allow rollover at maturity
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'documents' && (
                  <div className="grid gap-4">
                    <p className="text-sm text-muted-foreground">Add image URLs or upload local files for this opportunity.</p>
                    {images.map((url, index) => (
                      <div key={index} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <input 
                            type="url" 
                            value={url.startsWith('data:') ? 'Local file uploaded' : url} 
                            onChange={(e) => handleImageChange(index, e.target.value)}
                            disabled={url.startsWith('data:')}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50" 
                          />
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleLocalFileSelect(index, e)}
                              className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                              title="Upload local image"
                            />
                            <button type="button" className="flex items-center justify-center rounded-lg border bg-background p-2.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                              <MdFileUpload className="size-4" />
                            </button>
                          </div>
                          {images.length > 1 && (
                            <button type="button" onClick={() => removeImageField(index)} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                              <MdClose className="size-4" />
                            </button>
                          )}
                        </div>
                        {url && (
                          <div className="relative aspect-video w-64 overflow-hidden rounded-xl border bg-muted shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addImageField} className="mt-2 flex w-max items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                      <MdAdd className="size-4" /> Add another image
                    </button>

                    <div className="grid gap-1.5 mt-6 border-t pt-6">
                      <label htmlFor="alt" className="text-sm font-medium">Image alt text *</label>
                      <input id="alt" type="text" value={formData.alt} onChange={handleChange} required placeholder="Description of the image for accessibility" className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand" />
                    </div>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="mt-4 flex items-center justify-end gap-3 border-t pt-6">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => handleSubmit('Draft')}
                    className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => handleSubmit('Published')}
                    className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmitting ? <MdSync className="size-4 animate-spin" /> : <MdAccessTime className="size-4" />}
                    Publish opportunity
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
