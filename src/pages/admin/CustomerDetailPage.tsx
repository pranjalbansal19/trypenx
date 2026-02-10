import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../state/adminStore';
import type {
	Scope,
	TestConfiguration,
	ScopeType,
	TestType,
	Frequency,
	CustomerConsent,
	CustomerNote,
} from '../../types/admin';
import * as adminApi from '../../services/adminApi';

type Tab = 'overview' | 'scope' | 'config' | 'consent' | 'reports';

export function CustomerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<Tab>('overview');
	
	const {
		customers,
		scopes,
		testConfigs,
		testRuns,
		reports,
		consents,
		notes,
		loadCustomer,
		addNote,
		deleteNote,
		createScope,
		updateScope,
		deleteScope,
		saveTestConfig,
		uploadConsent,
		deleteConsent,
		loading,
	} = useAdminStore();

	const customer = customers.find((c) => c.id === id);
	const customerScopes = id ? scopes[id] || [] : [];
	const testConfig = id ? testConfigs[id] || null : null;
	const customerRuns = id ? testRuns[id] || [] : [];
	const customerReports = id ? reports[id] || [] : [];
	const customerConsents = id ? consents[id] || [] : [];
	const customerNotes = id ? notes[id] || [] : [];

	useEffect(() => {
		if (id) {
			loadCustomer(id);
		}
	}, [id, loadCustomer]);

	const [runInfo, setRunInfo] = useState<{
		lastRun: any;
		nextScheduledRun: any;
	} | null>(null);

	useEffect(() => {
		if (id) {
			adminApi.getCustomerRunInfo(id).then(setRunInfo);
		}
	}, [id, customerRuns]);

	if (loading && !customer) {
		return <div className="p-8 text-gray-900">Loading...</div>;
	}

	if (!customer) {
		return <div className="p-8 text-gray-900">Customer not found</div>;
	}

	return (
		<div className="p-8">
			<div className="mb-6">
				<button
					onClick={() => navigate('/admin/portal/customers')}
					className="text-blue-600 hover:underline mb-4"
				>
					← Back to Customers
				</button>
				<h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
				<p className="text-gray-700 mt-1">
					{customer.contractType} • {customer.status}
				</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-300 mb-6">
				<div className="flex gap-4">
					<button
						onClick={() => setActiveTab('overview')}
						className={`px-4 py-2 border-b-2 font-medium transition-colors ${
							activeTab === 'overview'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-700 hover:text-gray-900'
						}`}
					>
						Overview
					</button>
					<button
						onClick={() => setActiveTab('scope')}
						className={`px-4 py-2 border-b-2 font-medium transition-colors ${
							activeTab === 'scope'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-700 hover:text-gray-900'
						}`}
					>
						Scope
					</button>
					<button
						onClick={() => setActiveTab('config')}
						className={`px-4 py-2 border-b-2 font-medium transition-colors ${
							activeTab === 'config'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-700 hover:text-gray-900'
						}`}
					>
						Test Configuration
					</button>
					<button
						onClick={() => setActiveTab('consent')}
						className={`px-4 py-2 border-b-2 font-medium transition-colors ${
							activeTab === 'consent'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-700 hover:text-gray-900'
						}`}
					>
						Consent / VAA
					</button>
					<button
						onClick={() => setActiveTab('reports')}
						className={`px-4 py-2 border-b-2 font-medium transition-colors ${
							activeTab === 'reports'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-700 hover:text-gray-900'
						}`}
					>
						Reports
					</button>
				</div>
			</div>

			{/* Tab Content */}
			{activeTab === 'overview' && (
				<OverviewTab
					customer={customer}
					lastRun={runInfo?.lastRun}
					nextRun={runInfo?.nextScheduledRun}
					notes={customerNotes}
					onAddNote={addNote}
					onDeleteNote={deleteNote}
				/>
			)}
			{activeTab === 'scope' && (
				<ScopeTab
					customerId={id!}
					scopes={customerScopes}
					createScope={createScope}
					updateScope={updateScope}
					deleteScope={deleteScope}
					onRefresh={() => id && loadCustomer(id)}
				/>
			)}
			{activeTab === 'config' && (
				<ConfigTab
					customerId={id!}
					config={testConfig}
					saveTestConfig={saveTestConfig}
					onRefresh={() => id && loadCustomer(id)}
				/>
			)}
			{activeTab === 'consent' && (
				<ConsentTab
					customerId={id!}
					consents={customerConsents}
					onUpload={uploadConsent}
					onDelete={deleteConsent}
					onRefresh={() => id && loadCustomer(id)}
				/>
			)}
			{activeTab === 'reports' && (
				<ReportsTab customerId={id!} reports={customerReports} />
			)}
		</div>
	);
}

function OverviewTab({
	customer,
	lastRun,
	nextRun,
	notes,
	onAddNote,
	onDeleteNote,
}: {
	customer: any;
	lastRun: any;
	nextRun: any;
	notes: CustomerNote[];
	onAddNote: (customerId: string, content: string) => Promise<CustomerNote>;
	onDeleteNote: (id: string, customerId: string) => Promise<void>;
}) {
	const [newNote, setNewNote] = useState('');
	const [adding, setAdding] = useState(false);

	const handleAddNote = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newNote.trim();
		if (!trimmed) return;
		setAdding(true);
		try {
			await onAddNote(customer.id, trimmed);
			setNewNote('');
		} catch (e) {
			console.error('Failed to add note:', e);
		} finally {
			setAdding(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-6">
				<div className="border border-gray-300 rounded p-4 bg-white">
					<h3 className="font-semibold mb-2 text-gray-900">Contract Information</h3>
					<div className="space-y-2 text-sm">
						<div>
							<span className="text-gray-600">Type:</span>{' '}
							<span className="text-gray-900 font-medium">{customer.contractType}</span>
						</div>
						<div>
							<span className="text-gray-600">Start Date:</span>{' '}
							<span className="text-gray-900 font-medium">
								{new Date(customer.contractStartDate).toLocaleDateString()}
							</span>
						</div>
						<div>
							<span className="text-gray-600">Length:</span>{' '}
							<span className="text-gray-900 font-medium">{customer.contractLengthMonths} months</span>
						</div>
						<div>
							<span className="text-gray-600">Status:</span>{' '}
							<span
								className={`px-2 py-1 rounded text-xs ${
									customer.status === 'Active'
										? 'bg-green-100 text-green-800'
										: customer.status === 'Paused'
										? 'bg-yellow-100 text-yellow-800'
										: 'bg-red-100 text-red-800'
								}`}
							>
								{customer.status}
							</span>
						</div>
					</div>
				</div>
				<div className="border border-gray-300 rounded p-4 bg-white">
					<h3 className="font-semibold mb-2 text-gray-900">Test Run Status</h3>
					<div className="space-y-2 text-sm">
						<div>
							<span className="text-gray-600">Last Run:</span>{' '}
							<span className="text-gray-900 font-medium">
								{lastRun
									? new Date(lastRun.endTime || lastRun.createdAt).toLocaleString()
									: 'Never'}
							</span>
						</div>
						<div>
							<span className="text-gray-600">Next Scheduled:</span>{' '}
							<span className="text-gray-900 font-medium">
								{nextRun ? new Date(nextRun.scheduledTime).toLocaleString() : 'None'}
							</span>
						</div>
						<div>
							<span className="text-gray-600">Last Status:</span>{' '}
							{lastRun ? (
								<span
									className={`px-2 py-1 rounded text-xs ${
										lastRun.status === 'Completed'
											? 'bg-green-100 text-green-800'
											: lastRun.status === 'Failed'
											? 'bg-red-100 text-red-800'
											: 'bg-gray-100 text-gray-800'
									}`}
								>
									{lastRun.status}
								</span>
							) : (
								<span className="text-gray-900 font-medium">-</span>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="border border-gray-300 rounded p-4 bg-white">
				<h3 className="font-semibold mb-2 text-gray-900">Notes</h3>
				<form onSubmit={handleAddNote} className="mb-4">
					<div className="flex gap-2">
						<input
							type="text"
							value={newNote}
							onChange={(e) => setNewNote(e.target.value)}
							placeholder="Add a note…"
							className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<button
							type="submit"
							disabled={adding || !newNote.trim()}
							className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{adding ? 'Adding…' : 'Add note'}
						</button>
					</div>
				</form>
				{notes.length === 0 ? (
					<p className="text-gray-500 text-sm">No notes yet. Add one above.</p>
				) : (
					<ul className="space-y-2">
						{notes.map((note) => (
							<li
								key={note.id}
								className="flex items-start justify-between gap-2 py-2 px-3 rounded bg-gray-50 border border-gray-200"
							>
								<div className="min-w-0 flex-1">
									<p className="text-gray-900 text-sm">{note.content}</p>
									<p className="text-gray-500 text-xs mt-1">
										{new Date(note.createdAt).toLocaleString()}
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										if (confirm('Delete this note?')) {
											onDeleteNote(note.id, customer.id);
										}
									}}
									className="text-red-600 hover:underline text-xs shrink-0"
									aria-label="Delete note"
								>
									Remove
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

function ConsentTab({
	customerId,
	consents,
	onUpload,
	onDelete,
	onRefresh,
}: {
	customerId: string;
	consents: CustomerConsent[];
	onUpload: (customerId: string, file: File, agreedAt?: string) => Promise<CustomerConsent>;
	onDelete: (id: string, customerId: string) => Promise<void>;
	onRefresh: () => void;
}) {
	const [dragActive, setDragActive] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [agreeDate, setAgreeDate] = useState(new Date().toISOString().split('T')[0]);

	const handleFiles = async (files: FileList | null) => {
		if (!files?.length) return;
		setUploading(true);
		try {
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				if (!file) continue;
				if (!file.type.startsWith('application/pdf') && !file.name.match(/\.(pdf|doc|docx)$/i)) {
					alert(`${file.name} is not a PDF or document. Please upload a signed consent form (e.g. PDF).`);
					continue;
				}
				await onUpload(customerId, file, agreeDate);
			}
			onRefresh();
		} catch (e) {
			console.error('Upload failed:', e);
		} finally {
			setUploading(false);
		}
	};

	const onDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(e.type === 'dragenter' || e.type === 'dragover');
	};
	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
		handleFiles(e.dataTransfer.files);
	};

	const downloadConsent = (c: CustomerConsent) => {
		const a = document.createElement('a');
		a.href = c.downloadUrl;
		a.download = c.fileName;
		a.click();
	};

	return (
		<div className="space-y-6">
			<p className="text-gray-700 text-sm">
				Store signed consent forms (e.g. VAA) here so you can confirm this customer has agreed before running a pen test.
			</p>
			<div className="border border-gray-300 rounded p-4 bg-white">
				<label className="block text-sm font-medium mb-2 text-gray-700">Signed / agreed date (for new uploads)</label>
				<input
					type="date"
					value={agreeDate}
					onChange={(e) => setAgreeDate(e.target.value)}
					className="mb-4 px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white"
				/>
				<div
					onDragEnter={onDrag}
					onDragLeave={onDrag}
					onDragOver={onDrag}
					onDrop={onDrop}
					className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
						dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
					}`}
				>
					<input
						type="file"
						accept=".pdf,.doc,.docx,application/pdf"
						multiple
						className="hidden"
						id="consent-file-input"
						onChange={(e) => {
							handleFiles(e.target.files);
							e.target.value = '';
						}}
					/>
					<label htmlFor="consent-file-input" className="cursor-pointer block">
						<span className="text-gray-600">
							{uploading ? 'Uploading…' : 'Drag and drop a signed consent form here, or click to choose'}
						</span>
					</label>
				</div>
			</div>
			<div className="border border-gray-300 rounded overflow-hidden bg-white">
				<h3 className="font-semibold px-4 py-2 bg-gray-100 text-gray-900 border-b border-gray-300">
					Uploaded consent documents
				</h3>
				{consents.length === 0 ? (
					<p className="p-4 text-gray-600 text-sm">No consent documents yet. Upload a signed VAA or consent form above.</p>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Document</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Agreed / signed at</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Uploaded at</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{consents.map((c) => (
								<tr key={c.id} className="border-t border-gray-200 hover:bg-gray-50">
									<td className="px-4 py-2 text-gray-900 font-medium">{c.fileName}</td>
									<td className="px-4 py-2 text-gray-700">
										{new Date(c.agreedAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-2 text-gray-700">
										{new Date(c.uploadedAt).toLocaleString()}
									</td>
									<td className="px-4 py-2">
										<div className="flex gap-2">
											<button
												onClick={() => downloadConsent(c)}
												className="text-blue-600 hover:underline"
											>
												Download
											</button>
											<button
												onClick={async () => {
													if (confirm('Remove this consent document?')) {
														await onDelete(c.id, customerId);
														onRefresh();
													}
												}}
												className="text-red-600 hover:underline"
											>
												Remove
											</button>
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

function ScopeTab({
	customerId,
	scopes,
	createScope,
	updateScope,
	deleteScope,
	onRefresh,
}: {
	customerId: string;
	scopes: Scope[];
	createScope: (data: Omit<Scope, 'id' | 'createdAt'>) => Promise<void>;
	updateScope: (id: string, customerId: string, data: Partial<Scope>) => Promise<void>;
	deleteScope: (id: string, customerId: string) => Promise<void>;
	onRefresh: () => void;
}) {
	const [showAddModal, setShowAddModal] = useState(false);
	const [formData, setFormData] = useState({
		type: 'ip_range' as ScopeType,
		value: '',
		notes: '',
		active: true,
	});

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await createScope({
				customerId,
				...formData,
			});
			setShowAddModal(false);
			setFormData({ type: 'ip_range', value: '', notes: '', active: true });
			onRefresh();
		} catch (error) {
			console.error('Failed to create scope:', error);
		}
	};

	const handleToggleActive = async (scope: Scope) => {
		try {
			await updateScope(scope.id, customerId, { active: !scope.active });
			onRefresh();
		} catch (error) {
			console.error('Failed to update scope:', error);
		}
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold text-gray-900">Scope Items</h2>
				<button
					onClick={() => setShowAddModal(true)}
					className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					Add Scope
				</button>
			</div>

			{scopes.length === 0 ? (
				<p className="text-gray-700">No scope items. Add one to get started.</p>
			) : (
				<div className="border border-gray-300 rounded overflow-hidden bg-white">
					<table className="w-full text-sm">
						<thead className="bg-gray-100">
							<tr>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Type</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Value</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Notes</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Status</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{scopes.map((scope) => (
								<tr key={scope.id} className="border-t border-gray-200 hover:bg-gray-50">
									<td className="px-4 py-2 text-gray-900">{scope.type.replace('_', ' ')}</td>
									<td className="px-4 py-2 font-mono text-gray-900">{scope.value}</td>
									<td className="px-4 py-2 text-gray-700">{scope.notes || '-'}</td>
									<td className="px-4 py-2">
										<button
											onClick={() => handleToggleActive(scope)}
											className={`px-2 py-1 rounded text-xs ${
												scope.active
													? 'bg-green-100 text-green-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{scope.active ? 'Active' : 'Inactive'}
										</button>
									</td>
									<td className="px-4 py-2">
										<button
											onClick={async () => {
												if (confirm('Delete this scope item?')) {
													try {
														await deleteScope(scope.id, customerId);
														onRefresh();
													} catch (error) {
														console.error('Failed to delete:', error);
													}
												}
											}}
											className="text-red-600 hover:underline"
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{showAddModal && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={(e) => {
					if (e.target === e.currentTarget) {
						setShowAddModal(false);
					}
				}}>
					<div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<h2 className="text-xl font-bold mb-4 text-gray-900">Add Scope Item</h2>
						<form onSubmit={handleAdd} className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Type</label>
								<select
									value={formData.type}
									onChange={(e) => setFormData({ ...formData, type: e.target.value as ScopeType })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="ip_range">IP Range (CIDR)</option>
									<option value="domain">Domain</option>
									<option value="subdomain">Subdomain</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Value</label>
								<input
									type="text"
									required
									value={formData.value}
									onChange={(e) => setFormData({ ...formData, value: e.target.value })}
									placeholder="192.168.0.0/24 or app.customer.com"
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Notes (optional)</label>
								<textarea
									value={formData.notes}
									onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									rows={3}
								/>
							</div>
							<div className="flex gap-2 justify-end pt-4">
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
									className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
								>
									Cancel
								</button>
								<button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
									Add
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

function ConfigTab({
	customerId,
	config,
	saveTestConfig,
	onRefresh,
}: {
	customerId: string;
	config: TestConfiguration | null;
	saveTestConfig: (data: Omit<TestConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
	onRefresh: () => void;
}) {
	const [formData, setFormData] = useState({
		testType: 'soft_scan' as TestType,
		frequency: 'weekly' as Frequency,
		cronExpression: '',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		startTime: '00:00',
		endTime: '23:59',
		enabled: true,
	});

	useEffect(() => {
		if (config) {
			setFormData({
				testType: config.testType,
				frequency: config.frequency,
				cronExpression: config.cronExpression || '',
				timezone: config.preferredRunWindow.timezone,
				startTime: config.preferredRunWindow.startTime,
				endTime: config.preferredRunWindow.endTime,
				enabled: config.enabled,
			});
		}
	}, [config]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await saveTestConfig({
				customerId,
				testType: formData.testType,
				frequency: formData.frequency,
				cronExpression: formData.frequency === 'custom' ? formData.cronExpression : undefined,
				preferredRunWindow: {
					timezone: formData.timezone,
					startTime: formData.startTime,
					endTime: formData.endTime,
				},
				enabled: formData.enabled,
			});
			onRefresh();
			alert('Configuration saved');
		} catch (error) {
			console.error('Failed to save config:', error);
		}
	};

	return (
		<div>
			<h2 className="text-lg font-semibold mb-4 text-gray-900">Test Configuration</h2>
			<form onSubmit={handleSave} className="space-y-4 max-w-2xl">
				<div>
					<label className="block text-sm font-medium mb-1 text-gray-700">Test Type</label>
					<select
						value={formData.testType}
						onChange={(e) => setFormData({ ...formData, testType: e.target.value as TestType })}
						className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="soft_scan">Soft Scan (Vulnerability)</option>
						<option value="full_pen_test">Full Pen Test</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1 text-gray-700">Frequency</label>
					<select
						value={formData.frequency}
						onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Frequency })}
						className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly</option>
						<option value="monthly">Monthly</option>
						<option value="custom">Custom Cron</option>
					</select>
				</div>
				{formData.frequency === 'custom' && (
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">Cron Expression</label>
						<input
							type="text"
							required
							value={formData.cronExpression}
							onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
							placeholder="0 0 * * *"
							className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				)}
				<div>
					<label className="block text-sm font-medium mb-1 text-gray-700">Preferred Run Window</label>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-xs text-gray-700 mb-1 font-medium">Timezone</label>
							<input
								type="text"
								value={formData.timezone}
								onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
						<div>
							<label className="block text-xs text-gray-700 mb-1 font-medium">Start Time</label>
							<input
								type="time"
								value={formData.startTime}
								onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
						<div>
							<label className="block text-xs text-gray-700 mb-1 font-medium">End Time</label>
							<input
								type="time"
								value={formData.endTime}
								onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
				</div>
				<div>
					<label className="flex items-center gap-2 text-gray-700">
						<input
							type="checkbox"
							checked={formData.enabled}
							onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
							className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						/>
						<span className="text-sm font-medium">Enabled</span>
					</label>
				</div>
				<button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
					Save Configuration
				</button>
			</form>
		</div>
	);
}

function ReportsTab({ customerId, reports }: { customerId: string; reports: any[] }) {
	return (
		<div>
			<h2 className="text-lg font-semibold mb-4 text-gray-900">Reports</h2>
			{reports.length === 0 ? (
				<p className="text-gray-700">No reports yet.</p>
			) : (
				<div className="border border-gray-300 rounded overflow-hidden bg-white">
					<table className="w-full text-sm">
						<thead className="bg-gray-100">
							<tr>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Generated</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Severity Summary</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Status</th>
								<th className="px-4 py-2 text-left text-gray-700 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{reports.map((report) => (
								<tr key={report.id} className="border-t border-gray-200 hover:bg-gray-50">
									<td className="px-4 py-2 text-gray-900">
										{new Date(report.generatedTimestamp).toLocaleString()}
									</td>
									<td className="px-4 py-2">
										<div className="flex gap-2 text-xs">
											<span className="text-red-600">C: {report.severitySummary.critical}</span>
											<span className="text-orange-600">H: {report.severitySummary.high}</span>
											<span className="text-yellow-600">M: {report.severitySummary.medium}</span>
											<span className="text-gray-600">L: {report.severitySummary.low}</span>
										</div>
									</td>
									<td className="px-4 py-2">
										<span
											className={`px-2 py-1 rounded text-xs ${
												report.status === 'New'
													? 'bg-blue-100 text-blue-800'
													: report.status === 'Reviewed'
													? 'bg-green-100 text-green-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{report.status}
										</span>
									</td>
									<td className="px-4 py-2">
										<div className="flex gap-2">
											<button
												onClick={() => {
													// In real app, download the PDF
													console.log('Download PDF:', report.reportFile);
												}}
												className="text-blue-600 hover:underline"
											>
												Download PDF
											</button>
											<button
												onClick={() => {
													// In real app, view/download raw JSON
													console.log('View raw:', report.rawDataFile);
												}}
												className="text-gray-600 hover:underline"
											>
												Raw Output
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
