import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Tag,
  Filter,
  AlertTriangle,
  FolderKanban,
  Factory,
  ShieldCheck,
  Compass,
  X,
  Clock,
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'PET cooling',
  'flash',
  'T0 trial',
  'EDOC',
  'H13 EDM',
  'mold commissioning',
];

const DOMAIN_OPTIONS = [
  { id: 'ALL', label: 'All Domains', icon: Compass },
  { id: 'ENGINEERING', label: 'Engineering', icon: Layers },
  { id: 'MANUFACTURING', label: 'Manufacturing', icon: Factory },
  { id: 'QUALITY', label: 'Quality & QA', icon: ShieldCheck },
  { id: 'COMMERCIAL', label: 'Commercial', icon: FolderKanban },
];

const TYPE_OPTIONS = [
  { id: 'ALL', label: 'All Types' },
  { id: 'BEST_PRACTICE', label: 'Best Practice' },
  { id: 'PROCEDURE', label: 'Procedure / SOP' },
  { id: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { id: 'SPECIFICATION', label: 'Specification' },
  { id: 'STANDARD', label: 'Standard' },
];

export function EngineeringLibraryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [selectedProcess, setSelectedProcess] = useState<string>('ALL');
  const [activeArticle, setActiveArticle] = useState<any | null>(null);

  // Unified Knowledge Search query
  const { data: searchResponse, isLoading, error } = useQuery({
    queryKey: ['knowledge-search', debouncedQuery, selectedDomain, selectedType, selectedMaterial, selectedProcess],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: 1,
        limit: 20,
      };
      if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
      if (selectedDomain !== 'ALL') params.domain = selectedDomain;
      if (selectedType !== 'ALL') params.articleType = selectedType;
      if (selectedMaterial !== 'ALL') params.material = selectedMaterial;
      if (selectedProcess !== 'ALL') params.process = selectedProcess;

      const res = await api.get('/knowledge/search', { params });
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedQuery(searchQuery);
  };

  const handleChipClick = (query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
  };

  const results = searchResponse?.data || [];
  const total = searchResponse?.total ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                Engineering Knowledge Intelligence
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  v4.2 Digital Thread
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Semantic & deterministic intelligence across SOPs, technical specs, troubleshooting, and project digital threads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-gray-400 block">Indexed Repository</span>
            <span className="text-sm font-semibold text-teal-400">Enterprise Digital Thread Active</span>
          </div>
        </div>
      </div>

      {/* Main Search Box */}
      <div className="rounded-xl border p-5 bg-gray-900/60 backdrop-blur-md shadow-lg" style={{ borderColor: 'var(--color-border)' }}>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search engineering procedures, cooling channel guidelines, flash troubleshooting, EDOC specs..."
            className="w-full pl-12 pr-28 py-3.5 bg-gray-950/80 border border-gray-700/80 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold text-sm transition-all shadow"
          >
            Search
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-800/80">
          <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Quick Searches:
          </span>
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleChipClick(q)}
              className="text-xs px-2.5 py-1 rounded-md bg-gray-800/90 hover:bg-teal-500/20 hover:text-teal-300 text-gray-300 border border-gray-700 transition"
            >
              {q}
            </button>
          ))}
          {debouncedQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDebouncedQuery('');
              }}
              className="text-xs px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 flex items-center gap-1 ml-auto"
            >
              <X className="w-3 h-3" /> Clear Query
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-gray-900/40" style={{ borderColor: 'var(--color-border)' }}>
        {/* Domain Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Domain:
          </span>
          {DOMAIN_OPTIONS.map((domain) => {
            const Icon = domain.icon;
            const active = selectedDomain === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain.id)}
                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
                  active
                    ? 'bg-teal-500 text-gray-950 shadow-sm'
                    : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80 border border-gray-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {domain.label}
              </button>
            );
          })}
        </div>

        {/* Type Filter & Material/Process Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Type:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs bg-gray-950 border border-gray-700 rounded-md px-2.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Material:</label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="text-xs bg-gray-950 border border-gray-700 rounded-md px-2.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Materials</option>
              <option value="PET">PET (Polyethylene)</option>
              <option value="H13">H13 Tool Steel</option>
              <option value="P20">P20 Mold Steel</option>
              <option value="Aluminium">Aluminium 7075</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Process:</label>
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="text-xs bg-gray-950 border border-gray-700 rounded-md px-2.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Processes</option>
              <option value="Blow Molding">Blow Molding</option>
              <option value="EDM">EDM Machining</option>
              <option value="CNC Milling">CNC Milling</option>
              <option value="Trial Execution">Trial Execution</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-gray-400 flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-2 text-teal-400">
              <Clock className="w-4 h-4 animate-spin" /> Searching institutional knowledge base...
            </span>
          ) : (
            <span>
              Found <strong className="text-gray-200 font-semibold">{total}</strong> knowledge & engineering document records
              {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Results Grid */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 text-sm">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-1">
            <AlertTriangle className="w-5 h-5" /> Knowledge Search Error
          </div>
          Failed to fetch results from the MITRA Knowledge API. Please check your network connection and session.
        </div>
      )}

      {!isLoading && !error && results.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-300">No knowledge records match your query</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            Try adjusting your search terms, removing active filters, or clicking one of the suggested quick searches above.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {results.map((item: any) => {
          const isDoc = item.entityType === 'ENGINEERING_DOCUMENT';
          const isArticle = item.entityType === 'KNOWLEDGE_ARTICLE';

          return (
            <div
              key={item.id}
              className="rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900/80 hover:border-gray-700 p-5 transition shadow-sm space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        isArticle
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : isDoc
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {item.articleType || item.docType || item.entityType}
                    </span>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        item.status === 'PUBLISHED' || item.status === 'RELEASED'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                      }`}
                    >
                      {item.status}
                    </span>

                    {item.similarity > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono">
                        Relevance: {Math.round(item.similarity * 100)}%
                      </span>
                    )}

                    {item.documentNumber && (
                      <span className="text-xs font-mono text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                        Doc: {item.documentNumber}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-gray-100 hover:text-teal-400 transition cursor-pointer" onClick={() => setActiveArticle(item)}>
                    {item.title}
                  </h2>

                  <p className="text-sm text-gray-300 leading-relaxed">
                    {item.summary || item.contentSnippet || 'No summary available.'}
                  </p>
                </div>

                <div className="flex md:flex-col items-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveArticle(item)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Read Knowledge
                  </button>
                </div>
              </div>

              {/* Tags & Metadata */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-800/60">
                <Tag className="w-3.5 h-3.5 text-gray-500 mr-1" />
                {(item.tags || []).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Digital Thread Traceability Bar */}
              {item.sourceLinks && (
                <div className="p-2.5 rounded-lg bg-gray-950/70 border border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-gray-400">
                    <span className="font-semibold text-teal-400 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" /> Digital Thread:
                    </span>
                    {item.sourceLinks.projectNumber && (
                      <button
                        onClick={() => navigate('/projects')}
                        className="hover:text-teal-300 underline underline-offset-2 flex items-center gap-1"
                      >
                        Project: {item.sourceLinks.projectNumber}
                      </button>
                    )}
                    {item.sourceLinks.drawingNumber && (
                      <button
                        onClick={() => navigate('/engineering')}
                        className="hover:text-teal-300 underline underline-offset-2"
                      >
                        Drawing: {item.sourceLinks.drawingNumber}
                      </button>
                    )}
                    {item.sourceLinks.bomNumber && (
                      <button
                        onClick={() => navigate('/engineering')}
                        className="hover:text-teal-300 underline underline-offset-2"
                      >
                        BOM: {item.sourceLinks.bomNumber}
                      </button>
                    )}
                    {item.sourceLinks.routingNumber && (
                      <button
                        onClick={() => navigate('/engineering')}
                        className="hover:text-teal-300 underline underline-offset-2"
                      >
                        Routing: {item.sourceLinks.routingNumber}
                      </button>
                    )}
                    {item.sourceLinks.workOrderNumber && (
                      <button
                        onClick={() => navigate('/manufacturing')}
                        className="hover:text-teal-300 underline underline-offset-2"
                      >
                        WO: {item.sourceLinks.workOrderNumber}
                      </button>
                    )}
                    {item.sourceLinks.inspectionPlanNumber && (
                      <button
                        onClick={() => navigate('/quality')}
                        className="hover:text-teal-300 underline underline-offset-2"
                      >
                        Inspection: {item.sourceLinks.inspectionPlanNumber}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Article Detail Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex items-start justify-between gap-4 bg-gray-950/60">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    {activeArticle.articleType || activeArticle.docType || 'KNOWLEDGE'}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {activeArticle.status}
                  </span>
                  {activeArticle.documentNumber && (
                    <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                      {activeArticle.documentNumber}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-100">{activeArticle.title}</h2>
              </div>
              <button
                onClick={() => setActiveArticle(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-gray-200 leading-relaxed text-sm">
              {activeArticle.summary && (
                <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-200 font-medium">
                  <strong>Executive Summary:</strong> {activeArticle.summary}
                </div>
              )}

              {activeArticle.contentSnippet && (
                <div className="space-y-4 whitespace-pre-line font-sans bg-gray-950/40 p-5 rounded-xl border border-gray-800">
                  {activeArticle.contentSnippet}
                </div>
              )}

              {/* Digital Thread Context in Modal */}
              {activeArticle.sourceLinks && (
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-teal-400" /> Digital Thread Lineage
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {activeArticle.sourceLinks.projectNumber && (
                      <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                        <span className="text-gray-500 block">Project Reference</span>
                        <span className="font-semibold text-gray-200">{activeArticle.sourceLinks.projectNumber}</span>
                        {activeArticle.sourceLinks.projectName && (
                          <span className="text-[11px] text-gray-400 block truncate">{activeArticle.sourceLinks.projectName}</span>
                        )}
                      </div>
                    )}
                    {activeArticle.sourceLinks.drawingNumber && (
                      <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                        <span className="text-gray-500 block">Drawing Reference</span>
                        <span className="font-semibold text-gray-200">{activeArticle.sourceLinks.drawingNumber}</span>
                      </div>
                    )}
                    {activeArticle.sourceLinks.bomNumber && (
                      <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                        <span className="text-gray-500 block">BOM Reference</span>
                        <span className="font-semibold text-gray-200">{activeArticle.sourceLinks.bomNumber}</span>
                      </div>
                    )}
                    {activeArticle.sourceLinks.routingNumber && (
                      <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                        <span className="text-gray-500 block">Routing Process</span>
                        <span className="font-semibold text-gray-200">{activeArticle.sourceLinks.routingNumber}</span>
                      </div>
                    )}
                    {activeArticle.sourceLinks.workOrderNumber && (
                      <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                        <span className="text-gray-500 block">Manufacturing Order</span>
                        <span className="font-semibold text-gray-200">{activeArticle.sourceLinks.workOrderNumber}</span>
                      </div>
                    )}
                    {activeArticle.sourceLinks.inspectionPlanNumber && (
                      <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                        <span className="text-gray-500 block">Quality Inspection Plan</span>
                        <span className="font-semibold text-gray-200">{activeArticle.sourceLinks.inspectionPlanNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-800">
                <span className="text-xs text-gray-400">Classified Tags:</span>
                {(activeArticle.tags || []).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-950 flex items-center justify-between">
              <span className="text-xs text-gray-500">MITRA Engineering Knowledge Repository</span>
              <button
                onClick={() => setActiveArticle(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
