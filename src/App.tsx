import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminPortalLayout } from './components/layout/AdminPortalLayout';
import { PasswordProtection } from './components/PasswordProtection';
import { LandingPage } from './pages/LandingPage';
import { ValidateDomainPage } from './pages/ValidateDomainPage';
import { FreeScanResultsPage } from './pages/FreeScanResultsPage';
import { LoginPage } from './pages/LoginPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportViewerPage } from './pages/ReportViewerPage';
import { AdminConsolePage } from './pages/AdminConsolePage';
import { ResellerBrandingPage } from './pages/ResellerBrandingPage';
import { FolderUploadPage } from './pages/FolderUploadPage';
import { CustomersListPage } from './pages/admin/CustomersListPage';
import { CustomerDetailPage } from './pages/admin/CustomerDetailPage';
import { ReportsInboxPage } from './pages/admin/ReportsInboxPage';
import { useAppStore } from './state/store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const isAuthenticated = useAppStore((s) => s.isAuthenticated);
	return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
	return (
		<PasswordProtection>
			<Routes>
				{/* Main App Routes */}
				<Route path="/" element={<AppLayout><FolderUploadPage /></AppLayout>} />
				<Route path="/login" element={<AppLayout><LoginPage /></AppLayout>} />
				<Route path="/validate" element={<AppLayout><ValidateDomainPage /></AppLayout>} />
				<Route path="/scan" element={<AppLayout><FreeScanResultsPage /></AppLayout>} />
				<Route path="/checkout" element={<AppLayout><CheckoutPage /></AppLayout>} />
				<Route path="/upload" element={<AppLayout><FolderUploadPage /></AppLayout>} />
				<Route path="/landing" element={<AppLayout><LandingPage /></AppLayout>} />
				<Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
				<Route path="/reports" element={<ProtectedRoute><AppLayout><ReportViewerPage /></AppLayout></ProtectedRoute>} />
				<Route path="/admin" element={<ProtectedRoute><AppLayout><AdminConsolePage /></AppLayout></ProtectedRoute>} />
				<Route path="/reseller" element={<ProtectedRoute><AppLayout><ResellerBrandingPage /></AppLayout></ProtectedRoute>} />
				
				{/* Admin Portal Routes - Separate Layout (Protected by password only) */}
				<Route path="/admin/portal" element={<Navigate to="/admin/portal/customers" replace />} />
				<Route path="/admin/portal/customers" element={<AdminPortalLayout><CustomersListPage /></AdminPortalLayout>} />
				<Route path="/admin/portal/customers/:id" element={<AdminPortalLayout><CustomerDetailPage /></AdminPortalLayout>} />
				<Route path="/admin/portal/reports" element={<AdminPortalLayout><ReportsInboxPage /></AdminPortalLayout>} />
				
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</PasswordProtection>
	);
}

export default App;


