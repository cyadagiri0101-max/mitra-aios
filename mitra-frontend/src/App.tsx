import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { DesignPage } from './pages/DesignPage';
import { PlanningPage } from './pages/PlanningPage';
import { ManufacturingPage } from './pages/ManufacturingPage';
import { QualityPage } from './pages/QualityPage';
import { TrialsPage } from './pages/TrialsPage';
import { CapaPage } from './pages/CapaPage';
import { DispatchPage } from './pages/DispatchPage';
import { ServicePage } from './pages/ServicePage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ProductsPage } from './pages/ProductsPage';
import { ToolMasterPage } from './pages/ToolMasterPage';
import { ToolMasterDetailsPage } from './pages/ToolMasterDetailsPage';
import { EngineeringFileIndexerPage } from './pages/EngineeringFileIndexerPage';
import { EcrEcoPage } from './pages/EcrEcoPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { BomAnalysisPage } from './pages/BomAnalysisPage';
import { DrawingAnalysisPage } from './pages/DrawingAnalysisPage';
import { EngineeringLibraryPage } from './pages/EngineeringLibraryPage';
import { ProtectedRoute } from './components/ProtectedRoute';



function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
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
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/ecr-eco" element={<EcrEcoPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
