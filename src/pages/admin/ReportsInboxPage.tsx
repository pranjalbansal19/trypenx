import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../state/adminStore';
import type { Report, ReportStatus } from '../../types/admin';
import { FileText, Download, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function ReportsInboxPage() {
	const navigate = useNavigate();
	const { allReports, customers, loadAllReports, loadCustomers, updateReport, loading } = useAdminStore();

	useEffect(() => {
		loadAllReports();
		// Also load customers to display customer names
		if (customers.length === 0) {
			loadCustomers();
		}
	}, [loadAllReports, loadCustomers, customers.length]);

	const getCustomerName = (customerId: string) => {
		const customer = customers.find((c) => c.id === customerId);
		return customer?.companyName || customerId;
	};

	const handleStatusChange = async (reportId: string, newStatus: ReportStatus) => {
		try {
			await updateReport(reportId, { status: newStatus });
			loadAllReports();
		} catch (error) {
			console.error('Failed to update report status:', error);
		}
	};

	const handleSendToCustomer = async (reportId: string) => {
		try {
			await updateReport(reportId, { sentToCustomer: true, status: 'Sent' });
			loadAllReports();
		} catch (error) {
			console.error('Failed to send report:', error);
		}
	};

	// Calculate statistics
	const stats = useMemo(() => {
		const total = allReports.length;
		const newCount = allReports.filter((r) => r.status === 'New').length;
		const reviewedCount = allReports.filter((r) => r.status === 'Reviewed').length;
		const sentCount = allReports.filter((r) => r.status === 'Sent').length;
		const criticalCount = allReports.reduce((sum, r) => sum + r.severitySummary.critical, 0);
		
		return { total, newCount, reviewedCount, sentCount, criticalCount };
	}, [allReports]);

	if (loading && allReports.length === 0) {
		return (
			<div className="p-8 flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500">Loading reports...</div>
			</div>
		);
	}

	return (
		<div className="p-8 max-w-7xl mx-auto">
			{/* Header Section */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-2">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Reports Inbox</h1>
						<p className="text-gray-600 mt-2">Review and manage all penetration test reports</p>
					</div>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600 mb-1">Total Reports</p>
							<p className="text-2xl font-bold text-gray-900">{stats.total}</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-lg">
							<FileText className="w-5 h-5 text-blue-600" />
						</div>
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600 mb-1">New</p>
							<p className="text-2xl font-bold text-blue-600">{stats.newCount}</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-lg">
							<Clock className="w-5 h-5 text-blue-600" />
						</div>
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600 mb-1">Reviewed</p>
							<p className="text-2xl font-bold text-green-600">{stats.reviewedCount}</p>
						</div>
						<div className="p-3 bg-green-100 rounded-lg">
							<CheckCircle className="w-5 h-5 text-green-600" />
						</div>
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600 mb-1">Critical Issues</p>
							<p className="text-2xl font-bold text-red-600">{stats.criticalCount}</p>
						</div>
						<div className="p-3 bg-red-100 rounded-lg">
							<AlertCircle className="w-5 h-5 text-red-600" />
						</div>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="mb-6 flex items-center gap-3">
				<select
					className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
					defaultValue="all"
					onChange={(e) => {
						// Filter logic can be added here
						console.log('Filter by status:', e.target.value);
					}}
				>
					<option value="all">All Status</option>
					<option value="New">New</option>
					<option value="Reviewed">Reviewed</option>
					<option value="Sent">Sent</option>
				</select>
				<span className="text-sm text-gray-500">Showing {allReports.length} report{allReports.length !== 1 ? 's' : ''}</span>
			</div>

			{/* Reports Table */}
			<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
				{allReports.length === 0 ? (
					<div className="p-16 text-center">
						<div className="flex justify-center mb-4">
							<div className="p-4 bg-gray-100 rounded-full">
								<FileText className="w-12 h-12 text-gray-400" />
							</div>
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">No reports yet</h3>
						<p className="text-gray-500 max-w-md mx-auto">
							Reports will appear here once test runs complete. Check back later or configure test schedules for your customers.
						</p>
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Test Type</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Run Date</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Severity Summary</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{allReports.map((report) => (
								<tr
									key={report.id}
									className="hover:bg-gray-50 transition-colors"
								>
									<td className="px-6 py-4 whitespace-nowrap">
										<button
											onClick={() => navigate(`/admin/portal/customers/${report.customerId}`)}
											className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
										>
											{getCustomerName(report.customerId)}
										</button>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className="text-gray-700">Scan</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-gray-700">
											{new Date(report.generatedTimestamp).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											})}
										</div>
										<div className="text-xs text-gray-500">
											{new Date(report.generatedTimestamp).toLocaleTimeString('en-US', {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="flex flex-wrap gap-1.5">
											{report.severitySummary.critical > 0 && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
													Critical: {report.severitySummary.critical}
												</span>
											)}
											{report.severitySummary.high > 0 && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
													High: {report.severitySummary.high}
												</span>
											)}
											{report.severitySummary.medium > 0 && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
													Medium: {report.severitySummary.medium}
												</span>
											)}
											{report.severitySummary.low > 0 && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
													Low: {report.severitySummary.low}
												</span>
											)}
											{Object.values(report.severitySummary).every((v) => v === 0) && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
													No findings
												</span>
											)}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<select
											value={report.status}
											onChange={(e) =>
												handleStatusChange(report.id, e.target.value as ReportStatus)
											}
											className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
												report.status === 'New'
													? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500'
													: report.status === 'Reviewed'
													? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500'
													: 'bg-gray-50 text-gray-700 border-gray-200 focus:ring-gray-500'
											}`}
										>
											<option value="New">New</option>
											<option value="Reviewed">Reviewed</option>
											<option value="Sent">Sent</option>
										</select>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center gap-2">
											<button
												onClick={() => {
													console.log('Download PDF:', report.reportFile);
													window.open(report.reportFile, '_blank');
												}}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
												title="Download PDF"
											>
												<Download className="w-3.5 h-3.5" />
												Download
											</button>
											{report.status === 'Reviewed' && !report.sentToCustomer && (
												<button
													onClick={() => handleSendToCustomer(report.id)}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
													title="Send to Customer"
												>
													<Send className="w-3.5 h-3.5" />
													Send
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

