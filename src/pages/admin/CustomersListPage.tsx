import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../state/adminStore';
import type { Customer, ContractType, CustomerStatus } from '../../types/admin';
import * as adminApi from '../../services/adminApi';

export function CustomersListPage() {
	const navigate = useNavigate();
	const { customers, loadCustomers, createCustomer, updateCustomer, deleteCustomer, loading } = useAdminStore();
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
	
	const [formData, setFormData] = useState({
		companyName: '',
		contractType: 'Foundation' as ContractType,
		contractStartDate: new Date().toISOString().split('T')[0],
		contractLengthMonths: 12,
		status: 'Active' as CustomerStatus,
	});

	useEffect(() => {
		loadCustomers();
	}, [loadCustomers]);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await createCustomer(formData);
			setShowAddModal(false);
			setFormData({
				companyName: '',
				contractType: 'Foundation',
				contractStartDate: new Date().toISOString().split('T')[0],
				contractLengthMonths: 12,
				status: 'Active',
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
			contractType: customer.contractType,
			contractStartDate: customer.contractStartDate.split('T')[0],
			contractLengthMonths: customer.contractLengthMonths,
			status: customer.status,
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

	if (loading && customers.length === 0) {
		return <div className="p-8 text-gray-900">Loading customers...</div>;
	}

	return (
		<div className="p-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Customers</h1>
				<button
					onClick={() => {
						setEditingCustomer(null);
						setFormData({
							companyName: '',
							contractType: 'Foundation',
							contractStartDate: new Date().toISOString().split('T')[0],
							contractLengthMonths: 12,
							status: 'Active',
						});
						setShowAddModal(true);
					}}
					className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					Add Customer
				</button>
			</div>

			{/* Customers Table */}
			<div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
				<table className="w-full text-sm">
					<thead className="bg-gray-100">
						<tr>
							<th className="px-4 py-3 text-left font-semibold text-gray-700">Company Name</th>
							<th className="px-4 py-3 text-left font-semibold text-gray-700">Contract</th>
							<th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
							<th className="px-4 py-3 text-left font-semibold text-gray-700">Last Run</th>
							<th className="px-4 py-3 text-left font-semibold text-gray-700">Next Scheduled</th>
							<th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
						</tr>
					</thead>
					<tbody>
						{customers.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
									No customers yet. Add one to get started.
								</td>
							</tr>
						) : (
							customers.map((customer) => (
								<tr key={customer.id} className="border-t border-gray-200 hover:bg-gray-50">
									<td className="px-4 py-3 font-medium text-gray-900">{customer.companyName}</td>
									<td className="px-4 py-3 text-gray-700">{customer.contractType}</td>
									<td className="px-4 py-3">
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
									</td>
									<td className="px-4 py-3 text-gray-600">
										{runInfoCache[customer.id]?.lastRun || 'Never'}
									</td>
									<td className="px-4 py-3 text-gray-600">
										{runInfoCache[customer.id]?.nextRun || 'None'}
									</td>
									<td className="px-4 py-3">
										<div className="flex gap-2">
											<button
												onClick={() => navigate(`/admin/portal/customers/${customer.id}`)}
												className="text-blue-600 hover:underline"
											>
												View
											</button>
											<button
												onClick={() => handleEdit(customer)}
												className="text-gray-600 hover:underline"
											>
												Edit
											</button>
											{customer.status === 'Active' ? (
												<button
													onClick={() => handleStatusChange(customer.id, 'Paused')}
													className="text-yellow-600 hover:underline"
												>
													Pause
												</button>
											) : customer.status === 'Paused' ? (
												<button
													onClick={() => handleStatusChange(customer.id, 'Active')}
													className="text-green-600 hover:underline"
												>
													Resume
												</button>
											) : null}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Add/Edit Modal */}
			{showAddModal && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={(e) => {
					if (e.target === e.currentTarget) {
						setShowAddModal(false);
						setEditingCustomer(null);
					}
				}}>
					<div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<h2 className="text-xl font-bold mb-4 text-gray-900">
							{editingCustomer ? 'Edit Customer' : 'Add Customer'}
						</h2>
						<form onSubmit={editingCustomer ? handleUpdate : handleAdd} className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Company Name</label>
								<input
									type="text"
									required
									value={formData.companyName}
									onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Contract Type</label>
								<select
									value={formData.contractType}
									onChange={(e) => setFormData({ ...formData, contractType: e.target.value as ContractType })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="Foundation">Foundation</option>
									<option value="Pro">Pro</option>
									<option value="Enterprise">Enterprise</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Contract Start Date</label>
								<input
									type="date"
									required
									value={formData.contractStartDate}
									onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Contract Length (months)</label>
								<input
									type="number"
									required
									min="1"
									value={formData.contractLengthMonths}
									onChange={(e) => setFormData({ ...formData, contractLengthMonths: parseInt(e.target.value) })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
								<select
									value={formData.status}
									onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
									className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="Active">Active</option>
									<option value="Paused">Paused</option>
									<option value="Cancelled">Cancelled</option>
								</select>
							</div>
							<div className="flex gap-2 justify-end pt-4">
								<button
									type="button"
									onClick={() => {
										setShowAddModal(false);
										setEditingCustomer(null);
									}}
									className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

