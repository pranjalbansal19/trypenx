import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminPortalLayout } from './components/layout/AdminPortalLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
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
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { useAdminAuthStore } from './state/adminAuthStore';

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, loading, challenge, token, initialized } = useAdminAuthStore((s) => ({
		user: s.user,
		loading: s.loading,
		challenge: s.challenge,
		token: s.token,
		initialized: s.initialized,
	}));
	const location = useLocation();

	if (loading || !initialized || (token && !user)) {
		return (
			<div className="min-h-screen flex items-center justify-center text-slate-600">
				Loading secure session...
			</div>
		);
	}

	return user && !challenge ? (
		<>{children}</>
	) : (
		<Navigate
			to={`/admin/portal/login?redirect=${encodeURIComponent(
				`${location.pathname}${location.search}`
			)}`}
			replace
		/>
	);
}

function App() {
	const initializeAdminAuth = useAdminAuthStore((s) => s.initialize);

	useEffect(() => {
		initializeAdminAuth();
	}, [initializeAdminAuth]);

	return (
		<Routes>
			<Route path="/admin/portal/login" element={<AdminLoginPage />} />
			<Route element={<AdminProtectedRoute><Outlet /></AdminProtectedRoute>}>
				{/* Main App Routes */}
				<Route path="/" element={<AppLayout><FolderUploadPage /></AppLayout>} />
				<Route path="/login" element={<AppLayout><LoginPage /></AppLayout>} />
				<Route path="/validate" element={<AppLayout><ValidateDomainPage /></AppLayout>} />
				<Route path="/scan" element={<AppLayout><FreeScanResultsPage /></AppLayout>} />
				<Route path="/checkout" element={<AppLayout><CheckoutPage /></AppLayout>} />
				<Route path="/upload" element={<AppLayout><FolderUploadPage /></AppLayout>} />
				<Route path="/landing" element={<AppLayout><LandingPage /></AppLayout>} />
				<Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
				<Route path="/reports" element={<AppLayout><ReportViewerPage /></AppLayout>} />
				<Route path="/admin" element={<AppLayout><AdminConsolePage /></AppLayout>} />
				<Route path="/reseller" element={<AppLayout><ResellerBrandingPage /></AppLayout>} />

				{/* Admin Portal Routes */}
				<Route path="/admin/portal" element={<Navigate to="/admin/portal/customers" replace />} />
				<Route
					path="/admin/portal/customers"
					element={<AdminPortalLayout><CustomersListPage /></AdminPortalLayout>}
				/>
				<Route
					path="/admin/portal/customers/:id"
					element={<AdminPortalLayout><CustomerDetailPage /></AdminPortalLayout>}
				/>
				<Route
					path="/admin/portal/reports"
					element={<AdminPortalLayout><ReportsInboxPage /></AdminPortalLayout>}
				/>
				<Route
					path="/admin/portal/users"
					element={<AdminPortalLayout><AdminUsersPage /></AdminPortalLayout>}
				/>

				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
}

export default App;
