import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
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
import { useAppStore } from './state/store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const isAuthenticated = useAppStore((s) => s.isAuthenticated);
	return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
	return (
		<AppLayout>
			<Routes>
				<Route path="/" element={<FolderUploadPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/validate" element={<ValidateDomainPage />} />
				<Route path="/scan" element={<FreeScanResultsPage />} />
				<Route path="/checkout" element={<CheckoutPage />} />
				<Route path="/upload" element={<FolderUploadPage />} />
				<Route path="/landing" element={<LandingPage />} />
				<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
				<Route path="/reports" element={<ProtectedRoute><ReportViewerPage /></ProtectedRoute>} />
				<Route path="/admin" element={<ProtectedRoute><AdminConsolePage /></ProtectedRoute>} />
				<Route path="/reseller" element={<ProtectedRoute><ResellerBrandingPage /></ProtectedRoute>} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AppLayout>
	);
}

export default App;


