import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../state/adminStore';
import type { Customer, ContractType, CustomerStatus, CustomerType, CustomerAddOn } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import { contractTypeLabels, formatContractType } from '../../utils/contractType';
import { addOnCatalog, addOnCategoryLabels, normalizeAddOns } from '../../utils/addOns';
import {
	Search,
	Plus,
	ChevronRight,
	PauseCircle,
	PlayCircle,
	Trash2,
	PencilLine,
} from 'lucide-react';

export function CustomersListPage() {
	const navigate = useNavigate();
	const { customers, loadCustomers, createCustomer, updateCustomer, deleteCustomer, loading } = useAdminStore();
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');
	const [contractFilter, setContractFilter] = useState<'all' | ContractType>('all');
	const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | CustomerType>('all');
	
	const [formData, setFormData] = useState({
		companyName: '',
		customerType: 'Direct' as CustomerType,
		contractType: 'Basic' as ContractType,
		contractStartDate: new Date().toISOString().split('T')[0],
		contractLengthMonths: 12,
		status: 'Active' as CustomerStatus,
		addOns: [] as CustomerAddOn[],
	});

	useEffect(() => {
		loadCustomers();
	}, [loadCustomers]);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (!formData.contractStartDate) {
				throw new Error('Contract start date is required');
			}
			await createCustomer({
				...formData,
				contractStartDate: formData.contractStartDate,
			});
			setShowAddModal(false);
			setFormData({
				companyName: '',
				customerType: 'Direct',
				contractType: 'Basic',
				contractStartDate: new Date().toISOString().split('T')[0],
				contractLengthMonths: 12,
				status: 'Active',
				addOns: [],
			});
			loadCustomers();
		} catch (error) {
			console.error('Failed to create customer:', error);
		}
	};

	const handleEdit = (customer: Customer) => {
		setEditingCustomer(customer);
		setFormData({
			companyName: customer.companyName,
			customerType: customer.customerType ?? 'Direct',
			contractType: customer.contractType,
			contractStartDate: customer.contractStartDate.split('T')[0],
			contractLengthMonths: customer.contractLengthMonths,
			status: customer.status,
			addOns: normalizeAddOns(customer.addOns),
		});
		setShowAddModal(true);
	};

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingCustomer) return;
		try {
			await updateCustomer(editingCustomer.id, formData);
			setShowAddModal(false);
			setEditingCustomer(null);
			loadCustomers();
		} catch (error) {
			console.error('Failed to update customer:', error);
		}
	};

	const handleStatusChange = async (customerId: string, newStatus: CustomerStatus) => {
		try {
			await updateCustomer(customerId, { status: newStatus });
			loadCustomers();
		} catch (error) {
			console.error('Failed to update status:', error);
		}
	};

	const handleDelete = async (customerId: string, companyName: string) => {
		if (!confirm(`Delete ${companyName}? This cannot be undone.`)) return;
		try {
			await deleteCustomer(customerId);
			loadCustomers();
		} catch (error) {
			console.error('Failed to delete customer:', error);
		}
	};

	const [runInfoCache, setRunInfoCache] = useState<Record<string, { lastRun: string | null; nextRun: string | null }>>({});

	useEffect(() => {
		// Load run info for all customers
		customers.forEach(async (customer) => {
			try {
				const info = await adminApi.getCustomerRunInfo(customer.id);
				setRunInfoCache((prev) => ({
					...prev,
					[customer.id]: {
						lastRun: info.lastRun
							? new Date(info.lastRun.endTime || info.lastRun.createdAt).toLocaleDateString()
							: null,
						nextRun: info.nextScheduledRun
							? new Date(info.nextScheduledRun.scheduledTime).toLocaleDateString()
							: null,
					},
				}));
			} catch (error) {
				console.error('Failed to load run info:', error);
			}
		});
	}, [customers]);

	const stats = useMemo(() => {
		const total = customers.length;
		const active = customers.filter((c) => c.status === 'Active').length;
		const paused = customers.filter((c) => c.status === 'Paused').length;
		const cancelled = customers.filter((c) => c.status === 'Cancelled').length;
		return { total, active, paused, cancelled };
	}, [customers]);

	const filteredCustomers = useMemo(() => {
		return customers.filter((customer) => {
			const searchValue = searchTerm.toLowerCase().trim();
			const matchesSearch =
				searchValue.length === 0 ||
				customer.companyName.toLowerCase().includes(searchValue) ||
				formatContractType(customer.contractType).toLowerCase().includes(searchValue) ||
				customer.status.toLowerCase().includes(searchValue) ||
				(customer.customerType ?? 'Direct').toLowerCase().includes(searchValue) ||
				customer.id.toLowerCase().includes(searchValue);
			const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
			const matchesContract = contractFilter === 'all' || customer.contractType === contractFilter;
			const matchesCustomerType = customerTypeFilter === 'all' || (customer.customerType ?? 'Direct') === customerTypeFilter;
			return matchesSearch && matchesStatus && matchesContract && matchesCustomerType;
		});
	}, [customers, searchTerm, statusFilter, contractFilter, customerTypeFilter]);

	if (loading && customers.length === 0) {
		return (
			<div className="px-8 py-16">
				<div className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-slate-600 shadow-sm">
					Loading customer intelligence...
				</div>
			</div>
		);
	}

	return (
		<div className="relative px-8 py-10 page-fade">
			<div className="pointer-events-none absolute -right-24 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.35),rgba(56,189,248,0)_70%)] blur-3xl" />
			<div className="pointer-events-none absolute bottom-6 left-4 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.25),rgba(244,114,182,0)_70%)] blur-3xl" />

			<div className="relative mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-500">Customer vault</div>
					<h1 className="mt-3 text-3xl font-semibold text-slate-900">Customer Intelligence</h1>
					<p className="mt-2 text-base text-slate-600">
						Manage contracts, schedules, and consent evidence with a real-time operational view.
					</p>
				</div>
				<button
					onClick={() => {
						setEditingCustomer(null);
						setFormData({
							companyName: '',
							customerType: 'Direct',
							contractType: 'Basic',
							contractStartDate: new Date().toISOString().split('T')[0],
							contractLengthMonths: 12,
							status: 'Active',
							addOns: [],
						});
						setShowAddModal(true);
					}}
					className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:shadow-slate-900/40"
				>
					<Plus className="h-4 w-4" />
					New Customer
				</button>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: 'Total customers', value: stats.total, accent: 'from-slate-900 via-slate-700 to-slate-500' },
					{ label: 'Active contracts', value: stats.active, accent: 'from-emerald-500 via-teal-400 to-cyan-300' },
					{ label: 'Paused engagements', value: stats.paused, accent: 'from-amber-400 via-orange-400 to-rose-300' },
					{ label: 'Cancelled', value: stats.cancelled, accent: 'from-fuchsia-500 via-rose-500 to-orange-400' },
				].map((stat, index) => (
					<div
						key={stat.label}
						className="card-rise rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)]"
						style={{ animationDelay: `${0.08 * index}s` }}
					>
						<div className="text-sm text-slate-500">{stat.label}</div>
						<div className="mt-4 flex items-end justify-between">
							<div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
							<div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${stat.accent} shadow-inner`} />
						</div>
					</div>
				))}
			</div>

			<div className="mt-8 rounded-3xl border border-white/80 bg-white/95 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.5)]">
				<div className="flex flex-col gap-4 border-b border-slate-200/70 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
						<Search className="h-4 w-4 text-slate-500" />
						<input
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search customers, contract tiers, or status"
							className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
						/>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value as 'all' | CustomerStatus)}
							className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
						>
							<option value="all">All statuses</option>
							<option value="Active">Active</option>
							<option value="Paused">Paused</option>
							<option value="Cancelled">Cancelled</option>
						</select>
						<select
							value={contractFilter}
							onChange={(e) => setContractFilter(e.target.value as 'all' | ContractType)}
							className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
						>
							<option value="all">All contracts</option>
							{Object.entries(contractTypeLabels).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
						<select
							value={customerTypeFilter}
							onChange={(e) => setCustomerTypeFilter(e.target.value as 'all' | CustomerType)}
							className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
						>
							<option value="all">All types</option>
							<option value="Direct">Direct</option>
							<option value="ITMS">ITMS</option>
						</select>
						<div className="rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
							{filteredCustomers.length} results
						</div>
					</div>
				</div>

				<div className="px-6 py-4">
					<div className="hidden grid-cols-[2.2fr_1fr_1fr_1fr_1fr_1.2fr] gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 lg:grid">
						<div>Company</div>
						<div>Contract</div>
						<div>Status</div>
						<div>Last Run</div>
						<div>Next Run</div>
						<div>Actions</div>
					</div>
				</div>
				<div className="divide-y divide-slate-200/70">
					{filteredCustomers.length === 0 ? (
						<div className="px-6 py-16 text-center">
							<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
								<Search className="h-6 w-6" />
							</div>
							<h3 className="mt-4 text-lg font-semibold text-slate-900">No customers match this view</h3>
							<p className="mt-2 text-sm text-slate-500">
								Try adjusting filters or create a new customer profile.
							</p>
						</div>
					) : (
						filteredCustomers.map((customer) => (
							<div
								key={customer.id}
								className="grid gap-4 px-6 py-5 transition hover:bg-slate-50/70 lg:grid-cols-[2.2fr_1fr_1fr_1fr_1fr_1.2fr]"
							>
								<div className="flex items-center gap-4">
									<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-sm font-semibold text-white shadow-sm">
										{customer.companyName.slice(0, 2).toUpperCase()}
									</div>
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-base font-semibold text-slate-900">{customer.companyName}</span>
											<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${(customer.customerType ?? 'Direct') === 'ITMS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
												{(customer.customerType ?? 'Direct') === 'ITMS' ? 'ITMS' : 'Direct'}
											</span>
										</div>
										<div className="text-xs text-slate-500">ID · {customer.id}</div>
									</div>
								</div>
								<div className="text-sm font-semibold text-slate-700">
									{formatContractType(customer.contractType)}
									<div className="text-xs font-normal text-slate-500">{customer.contractLengthMonths} mo</div>
								</div>
								<div>
									<span
										className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
											customer.status === 'Active'
												? 'bg-emerald-100 text-emerald-700'
												: customer.status === 'Paused'
												? 'bg-amber-100 text-amber-700'
												: 'bg-rose-100 text-rose-700'
										}`}
									>
										{customer.status}
									</span>
								</div>
								<div className="text-sm text-slate-600">
									{runInfoCache[customer.id]?.lastRun || 'Never'}
								</div>
								<div className="text-sm text-slate-600">
									{runInfoCache[customer.id]?.nextRun || 'None'}
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<button
										onClick={() => navigate(`/admin/portal/customers/${customer.id}`)}
										className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
									>
										View
										<ChevronRight className="h-3.5 w-3.5" />
									</button>
									<button
										onClick={() => handleEdit(customer)}
										className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
									>
										<PencilLine className="h-3.5 w-3.5" />
										Edit
									</button>
									{customer.status === 'Active' ? (
										<button
											onClick={() => handleStatusChange(customer.id, 'Paused')}
											className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
										>
											<PauseCircle className="h-3.5 w-3.5" />
											Pause
										</button>
									) : customer.status === 'Paused' ? (
										<button
											onClick={() => handleStatusChange(customer.id, 'Active')}
											className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
										>
											<PlayCircle className="h-3.5 w-3.5" />
											Resume
										</button>
									) : null}
									<button
										onClick={() => handleDelete(customer.id, customer.companyName)}
										className="inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/80 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
									>
										<Trash2 className="h-3.5 w-3.5" />
										Delete
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Add/Edit Modal */}
			{showAddModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setShowAddModal(false);
							setEditingCustomer(null);
						}
					}}
				>
					<div className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.6)]" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-xs uppercase tracking-[0.3em] text-slate-400">
									{editingCustomer ? 'Edit profile' : 'New profile'}
								</div>
								<h2 className="mt-2 text-2xl font-semibold text-slate-900">
									{editingCustomer ? 'Edit Customer' : 'Add Customer'}
								</h2>
							</div>
							<div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
						</div>
						<form onSubmit={editingCustomer ? handleUpdate : handleAdd} className="mt-6 space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1 text-slate-700">Company Name</label>
								<input
									type="text"
									required
									value={formData.companyName}
									onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-slate-700">Customer Type</label>
								<select
									value={formData.customerType}
									onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								>
									<option value="Direct">Onecom Direct</option>
									<option value="ITMS">Onecom ITMS (IT Managed Services)</option>
								</select>
								<p className="mt-1 text-xs text-slate-500">ITMS: reports can be tailored to avoid exposing Onecom-side vulnerabilities.</p>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-slate-700">Contract Type</label>
								<select
									value={formData.contractType}
									onChange={(e) => setFormData({ ...formData, contractType: e.target.value as ContractType })}
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								>
									{Object.entries(contractTypeLabels).map(([value, label]) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-slate-700">Contract Start Date</label>
								<input
									type="date"
									required
									value={formData.contractStartDate}
									onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-slate-700">Contract Length (months)</label>
								<input
									type="number"
									required
									min="1"
									value={formData.contractLengthMonths}
									onChange={(e) => {
										const next = Number(e.target.value);
										setFormData({
											...formData,
											contractLengthMonths: Number.isNaN(next) ? 1 : next,
										});
									}}
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								/>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
								<div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Add-ons</div>
								<div className="mt-4 grid gap-4 sm:grid-cols-2">
									{(['recurring', 'one_off'] as const).map((category) => {
										const addOnsByCategory = addOnCatalog.filter((addOn) => addOn.category === category);
										return (
											<div key={category} className="space-y-2">
												<div className="text-sm font-semibold text-slate-700">
													{addOnCategoryLabels[category]}
												</div>
												<div className="flex flex-wrap gap-2">
													{addOnsByCategory.map((addOn) => {
														const selected = formData.addOns.some((item) => item.code === addOn.code);
														return (
															<button
																type="button"
																key={addOn.code}
																onClick={() => {
																	setFormData((prev) => {
																		const exists = prev.addOns.some((item) => item.code === addOn.code);
																		return {
																			...prev,
																			addOns: exists
																				? prev.addOns.filter((item) => item.code !== addOn.code)
																				: [...prev.addOns, addOn],
																		};
																	});
																}}
																className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
																	selected
																		? 'border-slate-900 bg-slate-900 text-white shadow-sm'
																		: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
																}`}
															>
																{addOn.label}
															</button>
														);
													})}
												</div>
											</div>
										);
									})}
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-slate-700">Status</label>
								<select
									value={formData.status}
									onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								>
									<option value="Active">Active</option>
									<option value="Paused">Paused</option>
									<option value="Cancelled">Cancelled</option>
								</select>
							</div>
							<div className="flex flex-wrap gap-2 justify-end pt-4">
								<button
									type="button"
									onClick={() => {
										setShowAddModal(false);
										setEditingCustomer(null);
									}}
									className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:shadow-slate-900/40 focus:outline-none focus:ring-2 focus:ring-slate-300"
								>
									{editingCustomer ? 'Update' : 'Create'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
