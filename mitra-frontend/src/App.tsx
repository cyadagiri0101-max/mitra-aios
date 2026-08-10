import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const EnquiriesPage = lazy(() => import('./pages/EnquiriesPage').then((m) => ({ default: m.EnquiriesPage })));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })));
const DesignPage = lazy(() => import('./pages/DesignPage').then((m) => ({ default: m.DesignPage })));
const PlanningPage = lazy(() => import('./pages/PlanningPage').then((m) => ({ default: m.PlanningPage })));
const ManufacturingPage = lazy(() => import('./pages/ManufacturingPage').then((m) => ({ default: m.ManufacturingPage })));
const QualityPage = lazy(() => import('./pages/QualityPage').then((m) => ({ default: m.QualityPage })));
const TrialsPage = lazy(() => import('./pages/TrialsPage').then((m) => ({ default: m.TrialsPage })));
const CapaPage = lazy(() => import('./pages/CapaPage').then((m) => ({ default: m.CapaPage })));
const DispatchPage = lazy(() => import('./pages/DispatchPage').then((m) => ({ default: m.DispatchPage })));
const ServicePage = lazy(() => import('./pages/ServicePage').then((m) => ({ default: m.ServicePage })));
const AiAssistantPage = lazy(() => import('./pages/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const RfqsPage = lazy(() => import('./pages/RfqsPage').then((m) => ({ default: m.RfqsPage })));
const RfqDetailPage = lazy(() => import('./pages/RfqDetailPage').then((m) => ({ default: m.RfqDetailPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const ToolMasterPage = lazy(() => import('./pages/ToolMasterPage').then((m) => ({ default: m.ToolMasterPage })));
const ToolMasterDetailsPage = lazy(() => import('./pages/ToolMasterDetailsPage').then((m) => ({ default: m.ToolMasterDetailsPage })));
const EngineeringFileIndexerPage = lazy(() => import('./pages/EngineeringFileIndexerPage').then((m) => ({ default: m.EngineeringFileIndexerPage })));
const EcrEcoPage = lazy(() => import('./pages/EcrEcoPage').then((m) => ({ default: m.EcrEcoPage })));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage').then((m) => ({ default: m.WorkflowPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const BomAnalysisPage = lazy(() => import('./pages/BomAnalysisPage').then((m) => ({ default: m.BomAnalysisPage })));
const DrawingAnalysisPage = lazy(() => import('./pages/DrawingAnalysisPage').then((m) => ({ default: m.DrawingAnalysisPage })));
const EngineeringLibraryPage = lazy(() => import('./pages/EngineeringLibraryPage').then((m) => ({ default: m.EngineeringLibraryPage })));
const EngineeringPage = lazy(() => import('./pages/EngineeringPage').then((m) => ({ default: m.EngineeringPage })));
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage').then((m) => ({ default: m.ProjectDetailsPage })));
const ProjectMilestonesPage = lazy(() => import('./pages/ProjectMilestonesPage').then((m) => ({ default: m.ProjectMilestonesPage })));
const ProjectTasksPage = lazy(() => import('./pages/ProjectTasksPage').then((m) => ({ default: m.ProjectTasksPage })));
const ProjectKanbanPage = lazy(() => import('./pages/ProjectKanbanPage').then((m) => ({ default: m.ProjectKanbanPage })));
const ProjectTimelinePage = lazy(() => import('./pages/ProjectTimelinePage').then((m) => ({ default: m.ProjectTimelinePage })));
const ProjectTeamsPage = lazy(() => import('./pages/ProjectTeamsPage').then((m) => ({ default: m.ProjectTeamsPage })));
const ProjectRisksPage = lazy(() => import('./pages/ProjectRisksPage').then((m) => ({ default: m.ProjectRisksPage })));
const ProjectDocumentsPage = lazy(() => import('./pages/ProjectDocumentsPage').then((m) => ({ default: m.ProjectDocumentsPage })));

function PageFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: 'var(--muted-foreground, #888)', fontSize: '0.9rem',
    }}>
      Loading…
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailsPage />} />
              <Route path="/projects/:id/milestones" element={<ProjectMilestonesPage />} />
              <Route path="/projects/:id/tasks" element={<ProjectTasksPage />} />
              <Route path="/projects/:id/kanban" element={<ProjectKanbanPage />} />
              <Route path="/projects/:id/timeline" element={<ProjectTimelinePage />} />
              <Route path="/projects/:id/teams" element={<ProjectTeamsPage />} />
              <Route path="/projects/:id/risks" element={<ProjectRisksPage />} />
              <Route path="/projects/:id/documents" element={<ProjectDocumentsPage />} />
              <Route path="/enquiries" element={<EnquiriesPage />} />
              <Route path="/quotations" element={<QuotationsPage />} />
              <Route path="/design" element={<DesignPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/manufacturing" element={<ManufacturingPage />} />
              <Route path="/quality" element={<QualityPage />} />
              <Route path="/trials" element={<TrialsPage />} />
              <Route path="/capa" element={<CapaPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/tool-master" element={<ToolMasterPage />} />
              <Route path="/tool-master/:id" element={<ToolMasterDetailsPage />} />
              <Route path="/engineering-file-indexer" element={<EngineeringFileIndexerPage />} />
              <Route path="/dispatch" element={<DispatchPage />} />
              <Route path="/service" element={<ServicePage />} />
              <Route path="/bom-analysis" element={<BomAnalysisPage />} />
              <Route path="/drawing-analysis" element={<DrawingAnalysisPage />} />
              <Route path="/ai-assistant" element={<AiAssistantPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/engineering-library" element={<EngineeringLibraryPage />} />
              <Route path="/engineering" element={<EngineeringPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/rfqs" element={<RfqsPage />} />
              <Route path="/rfqs/:id" element={<RfqDetailPage />} />
              <Route path="/ecr-eco" element={<EcrEcoPage />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
