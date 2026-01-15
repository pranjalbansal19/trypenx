import { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function AdminPortalLayout({ children }: PropsWithChildren) {
	const location = useLocation();
	
	const isActive = (path: string) => {
		return location.pathname.startsWith(path);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white border-b border-gray-200">
				<div className="px-8 py-4">
					<div className="flex justify-between items-center">
						<h1 className="text-xl font-bold text-gray-900">Pen Test Admin Portal</h1>
						<div className="text-sm text-gray-600">
							Internal Ops Tool
						</div>
					</div>
				</div>
			</header>

			{/* Navigation */}
			<nav className="bg-white border-b border-gray-200">
				<div className="px-8">
					<div className="flex gap-6">
						<Link
							to="/admin/portal/customers"
							className={`px-4 py-3 border-b-2 transition-colors ${
								isActive('/admin/portal/customers')
									? 'border-blue-600 text-blue-600 font-medium'
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}`}
						>
							Customers
						</Link>
						<Link
							to="/admin/portal/reports"
							className={`px-4 py-3 border-b-2 transition-colors ${
								isActive('/admin/portal/reports')
									? 'border-blue-600 text-blue-600 font-medium'
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}`}
						>
							Reports Inbox
						</Link>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<main className="bg-white min-h-[calc(100vh-120px)]">
				{children}
			</main>
		</div>
	);
}

