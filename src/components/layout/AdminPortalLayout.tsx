import { PropsWithChildren } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from '../ToastContainer';
import cybersentryLogo from '../../assets/cybersentry.png';
import { useAdminAuthStore } from '../../state/adminAuthStore';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

export function AdminPortalLayout({ children }: PropsWithChildren) {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, logout } = useAdminAuthStore((s) => ({
		user: s.user,
		logout: s.logout,
	}));
	
	const isActive = (path: string) => {
		return location.pathname.startsWith(path);
	};

	return (
		<div className="min-h-screen bg-[#f4f6fb] text-slate-900 font-sans" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
			<ToastContainer />
			<div className="relative overflow-hidden">
				<div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.35),rgba(59,130,246,0)_65%)] blur-2xl" />
				<div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.3),rgba(236,72,153,0)_70%)] blur-2xl" />
				{/* Header */}
				<header className="border-b border-white/70 bg-white/70 backdrop-blur">
					<div className="px-8 py-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div className="flex flex-col items-start gap-1.5">
								<img
									src={cybersentryLogo}
									alt="Cybersentry"
									className="h-[50px] w-auto max-w-[200px] object-contain"
								/>
								<h1 className="text-2xl font-semibold text-slate-900">Admin Control Center</h1>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
								<div className="flex flex-wrap items-center gap-3">
									<span className="font-semibold text-slate-800">Secure Ops</span>
									<span className="text-slate-400">•</span>
									<span>Live customer management</span>
									{user && (
										<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
											{user.role}
										</span>
									)}
									{user?.role === 'SuperAdmin' && (
										<button
											onClick={() => navigate('/admin/portal/users')}
											className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
										>
											Users
										</button>
									)}
									{user && (
										<button
											onClick={async () => {
												await logout();
												navigate('/admin/portal/login', { replace: true });
											}}
											className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
										>
											Sign out
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</header>

				{/* Navigation */}
				<nav className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
					<div className="px-8">
						<div className="flex flex-wrap gap-3 py-3">
							<Link
								to="/admin/portal/customers"
								className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
									isActive('/admin/portal/customers')
										? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow-md shadow-slate-900/20'
										: 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
								}`}
							>
								Customers
							</Link>
							<Link
								to="/admin/portal/reports"
								className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
									isActive('/admin/portal/reports')
										? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow-md shadow-slate-900/20'
										: 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
								}`}
							>
								Reports Inbox
							</Link>
							{user?.role === 'SuperAdmin' && (
								<Link
									to="/admin/portal/users"
									className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
										isActive('/admin/portal/users')
											? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow-md shadow-slate-900/20'
											: 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
									}`}
								>
									Admin Users
								</Link>
							)}
						</div>
					</div>
				</nav>
			</div>

			{/* Main Content */}
			<main className="min-h-[calc(100vh-160px)]">
				{children}
			</main>
		</div>
	);
}
