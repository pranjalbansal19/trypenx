import { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ToastContainer } from '../ToastContainer';
import cybersentryLogo from '../../assets/cybersentry.png';
import '@fontsource/urbanist/400.css';
import '@fontsource/urbanist/600.css';
import '@fontsource/urbanist/700.css';

export function AdminPortalLayout({ children }: PropsWithChildren) {
	const location = useLocation();
	
	const isActive = (path: string) => {
		return location.pathname.startsWith(path);
	};

	return (
		<div className="min-h-screen bg-[#f4f6fb] text-slate-900 font-['Urbanist']">
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
								<span className="font-semibold text-slate-800">Secure Ops</span> • Live customer management
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
