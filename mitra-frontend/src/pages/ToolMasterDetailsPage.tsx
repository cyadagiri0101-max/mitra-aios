import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { ArrowLeft, Folder, FileText, Image, ClipboardList, Clock3 } from 'lucide-react';

type ToolMasterRecord = {
  id: string;
  toolNo: string;
  toolType: 'BM' | 'IM';
  projectName?: string | null;
  customerName?: string | null;
  productName?: string | null;
  machine?: string | null;
  cavity?: string | null;
  status?: string | null;
  revision?: string | null;
  description?: string | null;
};

type EngineeringItem = {
  itemType: 'folder' | 'file';
  fileName?: string | null;
  relativePath?: string | null;
  folderName?: string | null;
  extension?: string | null;
};

type EngineeringContextResponse = {
  tool: ToolMasterRecord;
  engineeringItems: EngineeringItem[];
  partLists: any[];
  drawings: EngineeringItem[];
  documents: EngineeringItem[];
  folders: EngineeringItem[];
  files: EngineeringItem[];
  timeline: any[];
  totals: {
    all: number;
    partLists: number;
    drawings: number;
    documents: number;
    folders: number;
    files: number;
  };
};

type TabKey = 'engineering' | 'part-lists' | 'drawings' | 'documents' | 'timeline';

export function ToolMasterDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState<EngineeringContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('engineering');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.get(`/tool-master/${id}/engineering-context`).then((response) => {
      if (!cancelled) setContext(response.data);
    }).catch(() => {
      if (!cancelled) setContext(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const tabs = useMemo(() => [
    { key: 'engineering' as const, label: 'Engineering Files', count: context?.totals.all ?? 0 },
    { key: 'part-lists' as const, label: 'Part Lists', count: context?.totals.partLists ?? 0 },
    { key: 'drawings' as const, label: 'Drawings', count: context?.totals.drawings ?? 0 },
    { key: 'documents' as const, label: 'Documents', count: context?.totals.documents ?? 0 },
    { key: 'timeline' as const, label: 'Timeline', count: context?.timeline.length ?? 0 },
  ], [context]);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (!context?.tool) return <div className="text-sm text-red-600">Tool record not found.</div>;

  const record = context.tool;

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate('/tool-master')} className="inline-flex items-center gap-2 text-sm text-sky-600">
        <ArrowLeft className="w-4 h-4" /> Back to Tool Master
      </button>
      <Card>
        <CardHeader>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{record.toolNo}</h1>
            <p className="text-sm text-gray-500">{record.toolType} • {record.status ?? '—'}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><p className="text-xs uppercase text-gray-500">Project</p><p className="mt-1">{record.projectName ?? '—'}</p></div>
            <div><p className="text-xs uppercase text-gray-500">Customer</p><p className="mt-1">{record.customerName ?? '—'}</p></div>
            <div><p className="text-xs uppercase text-gray-500">Product</p><p className="mt-1">{record.productName ?? '—'}</p></div>
            <div><p className="text-xs uppercase text-gray-500">Machine</p><p className="mt-1">{record.machine ?? '—'}</p></div>
            <div><p className="text-xs uppercase text-gray-500">Cavity</p><p className="mt-1">{record.cavity ?? '—'}</p></div>
            <div><p className="text-xs uppercase text-gray-500">Revision</p><p className="mt-1">{record.revision ?? '—'}</p></div>
            <div className="md:col-span-2"><p className="text-xs uppercase text-gray-500">Description</p><p className="mt-1">{record.description ?? '—'}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Engineering Workspace</h2>
            <p className="text-sm text-gray-500">Indexed metadata and imported part-list history for the current tool number.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Folder className="w-4 h-4 text-sky-600" /> Folders</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{context.totals.folders}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><ClipboardList className="w-4 h-4 text-emerald-600" /> Part Lists</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{context.totals.partLists}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Image className="w-4 h-4 text-violet-600" /> Drawings</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{context.totals.drawings}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><FileText className="w-4 h-4 text-amber-600" /> Documents</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{context.totals.documents}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Clock3 className="w-4 h-4 text-rose-600" /> Timeline</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{context.timeline.length}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeTab === tab.key ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'engineering' && <FolderTree items={context.engineeringItems} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders} />}
            {activeTab === 'part-lists' && <PartListSection items={context.partLists} />}
            {activeTab === 'drawings' && <Section title="Drawings" items={context.drawings} />}
            {activeTab === 'documents' && <Section title="Documents" items={context.documents} />}
            {activeTab === 'timeline' && <TimelineSection items={context.timeline} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, items }: { title: string; items: EngineeringItem[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No items available.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={`${item.relativePath ?? item.fileName ?? title}-${index}`} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium text-gray-900">{item.fileName || item.folderName || item.relativePath || 'Unnamed item'}</div>
              <div className="text-xs text-gray-500">{item.relativePath || '—'}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PartListSection({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-gray-500">No imported part lists available.</p>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.revision ?? 'revision'}-${index}`} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-gray-900">Revision {item.revision || '—'}</div>
              <div className="text-sm text-gray-500">{item.filePath || 'Imported part list'}</div>
            </div>
            <div className="text-sm font-semibold text-gray-700">{item.totalCost != null ? `₹${item.totalCost}` : 'Cost summary pending'}</div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 md:grid-cols-4">
            <div>Inserts: {item.insertsCost ?? '—'}</div>
            <div>Mask parts: {item.maskPartsCost ?? '—'}</div>
            <div>Mold base: {item.moldBaseCost ?? '—'}</div>
            <div>Standard parts: {item.standardPartsCost ?? '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineSection({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-gray-500">No timeline entries available.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.title ?? 'timeline'}-${index}`} className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
          <div className="font-medium text-gray-900">{item.title}</div>
          <div className="mt-1 text-gray-600">{item.summary}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{item.meta}</div>
        </div>
      ))}
    </div>
  );
}

function FolderTree({ items, expandedFolders, setExpandedFolders }: { items: EngineeringItem[]; expandedFolders: Record<string, boolean>; setExpandedFolders: Dispatch<SetStateAction<Record<string, boolean>>> }) {
  const folders = items.filter((item) => item.itemType === 'folder');
  const files = items.filter((item) => item.itemType === 'file');
  return (
    <div className="space-y-2">
      {folders.map((folder, index) => {
        const key = `${folder.relativePath ?? folder.folderName ?? 'folder'}-${index}`;
        const expanded = expandedFolders[key] ?? true;
        return (
          <div key={key} className="rounded-lg border border-gray-200">
            <button type="button" onClick={() => setExpandedFolders((prev) => ({ ...prev, [key]: !expanded }))} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700">
              <span>{folder.folderName || folder.relativePath || 'Folder'}</span>
              <span className="text-xs text-gray-500">{expanded ? '▾' : '▸'}</span>
            </button>
            {expanded && (
              <div className="border-t border-gray-100 px-3 py-2">
                {files.filter((file) => (file.relativePath ?? '').includes(folder.relativePath ?? '')).length === 0 ? (
                  <p className="text-sm text-gray-500">No files in this folder.</p>
                ) : (
                  <ul className="space-y-2">
                    {files.filter((file) => (file.relativePath ?? '').includes(folder.relativePath ?? '')).map((file, fileIndex) => (
                      <li key={`${file.relativePath ?? file.fileName ?? 'file'}-${fileIndex}`} className="rounded border border-gray-100 px-2 py-2 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{file.fileName || file.relativePath || 'File'}</div>
                        <div className="text-xs text-gray-500">{file.relativePath || '—'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
      {files.filter((file) => !file.relativePath || !folders.some((folder) => (file.relativePath ?? '').includes(folder.relativePath ?? ''))).length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-sm font-medium text-gray-700">Root files</div>
          <ul className="mt-2 space-y-2">
            {files.filter((file) => !file.relativePath || !folders.some((folder) => (file.relativePath ?? '').includes(folder.relativePath ?? ''))).map((file, index) => (
              <li key={`${file.relativePath ?? file.fileName ?? 'root'}-${index}`} className="rounded border border-gray-100 px-2 py-2 text-sm text-gray-700">
                <div className="font-medium text-gray-900">{file.fileName || file.relativePath || 'File'}</div>
                <div className="text-xs text-gray-500">{file.relativePath || '—'}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
