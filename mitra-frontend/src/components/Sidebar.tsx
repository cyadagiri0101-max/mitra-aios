import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FolderKanban, Mail, FileText, PenTool, Calendar,
  Factory, ShieldCheck, FlaskConical, AlertTriangle, Truck, Wrench, Bot,
  BarChart3, FileStack, Users, GitPullRequest, Workflow, Search, Settings,
  ChevronLeft, ChevronRight, Boxes, Layers, Ruler, Target, ClipboardList, Cog,
  GitCommit, History, Cpu,
} from 'lucide-react';

type NavItem = { path: string; label: string; icon: React.ElementType; roles: string[]; badge?: string };

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, roles: ['all'] },
  { path: '/projects',      label: 'Projects',      icon: FolderKanban,    roles: ['all'] },
  { path: '/enquiries',     label: 'Enquiries',     icon: Mail,            roles: ['SALES','ADMIN','MANAGEMENT'] },
  { path: '/leads',         label: 'Leads',         icon: Target,          roles: ['SALES','ADMIN','MANAGEMENT'], badge: 'New' },
  { path: '/rfqs',          label: 'RFQs',          icon: ClipboardList,   roles: ['SALES','ADMIN','MANAGEMENT'], badge: 'New' },
  { path: '/quotations',    label: 'Quotations',    icon: FileText,        roles: ['SALES','ADMIN','MANAGEMENT'] },
  { path: '/design',        label: 'Design',        icon: PenTool,         roles: ['DESIGN','ADMIN','MANAGEMENT'] },
  { path: '/planning',      label: 'Planning',      icon: Calendar,        roles: ['PLANNING','ADMIN','MANAGEMENT'] },
  { path: '/planning/baselines', label: 'Baselines', icon: History,        roles: ['PLANNING','DESIGN','ADMIN','MANAGEMENT'], badge: 'M2' },
  { path: '/planning/capacity',  label: 'Capacity',  icon: Cpu,            roles: ['PLANNING','DESIGN','ADMIN','MANAGEMENT'], badge: 'M2' },
  { path: '/employees',     label: 'People & Skills', icon: Users,         roles: ['all'], badge: 'M1' },
  { path: '/engineering-decisions', label: 'Decision Log', icon: GitCommit, roles: ['all'], badge: 'M1' },
  { path: '/design-loads',  label: 'Design Loads',  icon: Layers,          roles: ['DESIGN','PLANNING','ADMIN','MANAGEMENT'], badge: 'M2' },
  { path: '/manufacturing', label: 'Manufacturing', icon: Factory,         roles: ['PRODUCTION','ADMIN','MANAGEMENT'] },
  { path: '/quality',       label: 'Quality',       icon: ShieldCheck,     roles: ['QUALITY','ADMIN','MANAGEMENT'] },
  { path: '/trials',        label: 'Trials',        icon: FlaskConical,    roles: ['QUALITY','PRODUCTION','ADMIN','MANAGEMENT'] },
  { path: '/capa',          label: 'CAPA',          icon: AlertTriangle,   roles: ['QUALITY','ADMIN','MANAGEMENT'] },
  { path: '/dispatch',      label: 'Dispatch',      icon: Truck,           roles: ['ADMIN','MANAGEMENT'] },
  { path: '/service',       label: 'Service',       icon: Wrench,          roles: ['ADMIN','MANAGEMENT','SALES'] },
  { path: '/bom-analysis',  label: 'BOM Analysis',  icon: Layers,          roles: ['all'], badge: 'New' },
  { path: '/drawing-analysis', label: 'Drawing Analysis', icon: Ruler,    roles: ['DESIGN','ADMIN','MANAGEMENT'], badge: 'New' },
  { path: '/ai-assistant',  label: 'AI Copilot',    icon: Bot,             roles: ['all'] },
  { path: '/analytics',     label: 'Analytics',     icon: BarChart3,       roles: ['ADMIN','MANAGEMENT'] },
  { path: '/documents',     label: 'Documents',     icon: FileStack,       roles: ['all'] },
  { path: '/engineering-library', label: 'Engineering Library', icon: Layers, roles: ['all'], badge: 'EKL' },
  { path: '/engineering', label: 'Engineering', icon: Cog, roles: ['DESIGN','PLANNING','QUALITY','PRODUCTION','ADMIN','MANAGEMENT'], badge: '2.3.1' },
  { path: '/suppliers',     label: 'Suppliers',     icon: Truck,           roles: ['ADMIN','MANAGEMENT','SALES','DESIGN','PLANNING','PRODUCTION','QUALITY'] },
  { path: '/products',      label: 'Products',      icon: Boxes,           roles: ['ADMIN','MANAGEMENT','SALES','DESIGN','PLANNING','PRODUCTION','QUALITY'] },
  { path: '/tool-master',   label: 'Tool Master',   icon: Layers,          roles: ['ADMIN','MANAGEMENT','SALES','DESIGN','PLANNING','PRODUCTION','QUALITY'] },
  { path: '/engineering-file-indexer', label: 'Engineering Files', icon: FileStack, roles: ['ADMIN','MANAGEMENT','DESIGN','PLANNING','PRODUCTION','QUALITY'] },
  { path: '/customers',     label: 'Customers',     icon: Users,           roles: ['SALES','ADMIN','MANAGEMENT'] },
  { path: '/ecr-eco',       label: 'ECR / ECO',     icon: GitPullRequest,  roles: ['DESIGN','ADMIN','MANAGEMENT'] },
  { path: '/workflow',      label: 'Workflow',      icon: Workflow,        roles: ['ADMIN','MANAGEMENT'] },
  { path: '/search',        label: 'Global Search', icon: Search,          roles: ['all'] },
  { path: '/settings',      label: 'Settings',      icon: Settings,        roles: ['ADMIN'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasRole } = useAuth();
  const location = useLocation();

  const visible = NAV_ITEMS.filter(
    item => item.roles.includes('all') || hasRole(item.roles),
  );

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} flex flex-col transition-all duration-300 flex-shrink-0 z-40`}
      style={{ backgroundColor: 'var(--color-bg-deep)', borderRight: '1px solid var(--color-border)' }}
      aria-label="Main navigation"
    >
      <div className="h-16 flex items-center justify-between px-3 border-b border-theme"
        style={{ borderColor: 'var(--color-border)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Boxes className="w-7 h-7 text-accent flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span className="font-bold truncate" style={{ color: 'var(--color-text)' }}>MITRA</span>
            <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 border"
              style={{ backgroundColor: 'rgba(100, 255, 218, 0.1)', color: 'var(--color-accent)', borderColor: 'rgba(100, 255, 218, 0.3)' }}>v3.2</span>
          </div>
        )}
        {collapsed && <Boxes className="w-7 h-7 mx-auto" style={{ color: 'var(--color-accent)' }} />}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1 rounded flex-shrink-0 ml-1 transition-colors hover:bg-white/10"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" role="navigation">
        {visible.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'sidebar-link-active'
                  : 'sidebar-link-inactive'
              }`}
              style={isActive ? {
                backgroundColor: 'rgba(100, 255, 218, 0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(100, 255, 218, 0.2)',
              } : {
                color: 'var(--color-text-secondary)',
              }}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" style={isActive ? { color: 'var(--color-accent)' } : undefined} />
              {!collapsed && (
                <>
                  <span className="ml-3 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded border flex-shrink-0"
                      style={{ backgroundColor: 'rgba(100, 255, 218, 0.1)', color: 'var(--color-accent)', borderColor: 'rgba(100, 255, 218, 0.3)' }}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-accent)' }} />
                  )}
                </>
              )}
              <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                isActive ? '' : ''
              }`}
                style={isActive ? { backgroundColor: 'rgba(100, 255, 218, 0.05)' } : { backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
              />
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-theme" style={{ borderColor: 'var(--color-border)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-lg border"
            style={{ backgroundColor: 'rgba(100, 255, 218, 0.05)', borderColor: 'rgba(100, 255, 218, 0.15)' }}>
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(100, 255, 218, 0.1)' }}>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>MITRA AI</p>
              <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                Engine Active
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
          </div>
        )}
        {!collapsed && (
          <div className="mt-3 text-center">
            <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>MITRA v3.2.0</p>
            <p className="text-[10px]" style={{ color: 'var(--color-border)' }}>Production Intelligence</p>
          </div>
        )}
      </div>
    </aside>
  );
}
