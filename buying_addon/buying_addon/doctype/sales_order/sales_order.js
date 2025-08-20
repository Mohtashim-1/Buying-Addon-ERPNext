frappe.ui.form.on('Sales Order', {
	refresh(frm) {
		console.log('🔍 DEBUG: Sales Order refresh called');
		console.log('🔍 DEBUG: frm.doc.docstatus =', frm.doc.docstatus);
		console.log('🔍 DEBUG: frm.doc.name =', frm.doc.name);
		console.log('🔍 DEBUG: frm.doc.__islocal =', frm.doc.__islocal);
		
		// Add dashboard button
		if (frm.doc.docstatus === 1) {
			console.log('🔍 DEBUG: Adding Order Dashboard button');
			frm.add_custom_button(__('Order Dashboard'), function() {
				show_sales_order_dashboard(frm);
			}, __('View'));
		}
		
		// Load dashboard data for custom_order_status field
		if (frm.doc.name && !frm.doc.__islocal) {
			console.log('🔍 DEBUG: Triggering load_order_status_dashboard');
			frm.trigger("load_order_status_dashboard");
		} else {
			console.log('🔍 DEBUG: Skipping dashboard load - conditions not met');
		}
	},
	
	onload(frm) {
		console.log('🔍 DEBUG: Sales Order onload called');
		console.log('🔍 DEBUG: frm.doc.name =', frm.doc.name);
		console.log('🔍 DEBUG: frm.doc.__islocal =', frm.doc.__islocal);
		
		// Load dashboard data when form loads
		if (frm.doc.name && !frm.doc.__islocal) {
			console.log('🔍 DEBUG: Triggering load_order_status_dashboard from onload');
			frm.trigger("load_order_status_dashboard");
		} else {
			console.log('🔍 DEBUG: Skipping dashboard load from onload - conditions not met');
		}
	},
	
	load_order_status_dashboard: function(frm) {
		console.log('🔍 DEBUG: load_order_status_dashboard called');
		console.log('🔍 DEBUG: frm.doc.name =', frm.doc.name);
		console.log('🔍 DEBUG: frm.fields_dict.custom_order_status =', frm.fields_dict.custom_order_status);
		
		if (!frm.fields_dict.custom_order_status) {
			console.error('❌ ERROR: custom_order_status field not found!');
			console.log('🔍 DEBUG: Available fields:', Object.keys(frm.fields_dict));
			return;
		}
		
		console.log('🔍 DEBUG: Making API call to get dashboard data...');
		frm.call({
			method: 'buying_addon.buying_addon.doctype.sales_order.sales_order.get_sales_order_status_dashboard',
			args: { sales_order_name: frm.doc.name },
			callback: function(r) {
				console.log('🔍 DEBUG: API response received:', r);
				if (r.message) {
					console.log('🔍 DEBUG: Rendering dashboard with data:', r.message);
					frm.events.render_order_status_dashboard(frm, r.message);
				} else {
					console.warn('⚠️ WARNING: No dashboard data received');
					// Show error message if no data
					if (frm.fields_dict.custom_order_status) {
						const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
						$(wrapper).empty();
						$(wrapper).append('<div style="padding: 20px; text-align: center; color: #666;">No dashboard data available</div>');
					}
				}
			},
			error: function(r) {
				console.error('❌ ERROR loading dashboard data:', r);
			}
		});
	},
	
	render_order_status_dashboard: function(frm, data) {
		console.log('🔍 DEBUG: render_order_status_dashboard called with data:', data);
		console.log('🔍 DEBUG: frm.fields_dict.custom_order_status =', frm.fields_dict.custom_order_status);
		
		if (frm.fields_dict.custom_order_status) {
			console.log('🔍 DEBUG: Found custom_order_status field, rendering dashboard...');
			const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
			console.log('🔍 DEBUG: Wrapper element:', wrapper);
			
			if (wrapper.length === 0) {
				console.error('❌ ERROR: Wrapper element not found!');
				return;
			}
			
			const dashboard_html = create_order_status_dashboard_html(data);
			console.log('🔍 DEBUG: Generated HTML length:', dashboard_html.length);
			
			$(wrapper).empty();
			$(dashboard_html).appendTo(wrapper);
			console.log('✅ SUCCESS: Dashboard rendered successfully!');
		} else {
			console.error('❌ ERROR: custom_order_status field not found in render function!');
		}
	},
	
	// Reload dashboard when items are updated
	items: function(frm) {
		if (frm.doc.name && !frm.doc.__islocal) {
			setTimeout(() => {
				frm.trigger("load_order_status_dashboard");
			}, 1000);
		}
	}
})

function show_sales_order_dashboard(frm) {
	frm.call({
		method: 'buying_addon.buying_addon.doctype.sales_order.sales_order.get_sales_order_dashboard_data',
		args: { sales_order_name: frm.doc.name },
		callback: function(r) {
			if (r.message) {
				show_dashboard_dialog(r.message, frm);
			}
		}
	});
}

function show_dashboard_dialog(data, frm) {
	let dialog = new frappe.ui.Dialog({
		title: __('Sales Order Dashboard'),
		size: 'large',
		fields: [
			{
				fieldname: 'dashboard_content',
				fieldtype: 'HTML',
				options: create_dashboard_html(data)
			}
		]
	});
	
	dialog.show();
}

function create_dashboard_html(data) {
	let html = `
		<div style="padding: 20px;">
			<!-- Header Section -->
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
				<div>
					<h3 style="margin: 0; color: #333;">${data.customer_name || data.customer}</h3>
					<p style="margin: 5px 0; color: #666;">Order Date: ${data.transaction_date}</p>
					<p style="margin: 5px 0; color: #666;">Delivery Date: ${data.delivery_date}</p>
				</div>
				<div style="text-align: right;">
					<div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${data.order_status}</div>
					<div style="color: #666;">Order Status</div>
				</div>
			</div>

			<!-- Overall Progress Section -->
			<div style="margin-bottom: 30px; padding: 20px; background: white; border: 1px solid #e0e0e0; border-radius: 8px;">
				<h4 style="margin: 0 0 15px 0; color: #333;">Overall Progress</h4>
				<div style="display: flex; align-items: center; margin-bottom: 15px;">
					<div style="flex: 1;">
						<div style="font-size: 36px; font-weight: bold; color: #1976d2;">${data.overall_percentage}%</div>
						<div style="color: #666;">Delivered</div>
					</div>
					<div style="flex: 2; margin-left: 20px;">
						<div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
							<div style="background: #1976d2; height: 100%; width: ${data.overall_percentage}%; transition: width 0.3s;"></div>
						</div>
						<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px; color: #666;">
							<span>0%</span>
							<span>100%</span>
						</div>
					</div>
				</div>
				<div style="display: flex; justify-content: space-around; text-align: center;">
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #333;">${data.total_ordered}</div>
						<div style="color: #666;">Total Ordered</div>
					</div>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #2e7d32;">${data.total_delivered}</div>
						<div style="color: #666;">Total Delivered</div>
					</div>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #d32f2f;">${data.total_pending}</div>
						<div style="color: #666;">Total Pending</div>
					</div>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #1976d2;">${data.total_amount}</div>
						<div style="color: #666;">Total Amount</div>
					</div>
				</div>
			</div>

			<!-- Items Table -->
			<div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
				<h4 style="margin: 0; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">Items Breakdown</h4>
				<div style="overflow-x: auto;">
					<table style="width: 100%; border-collapse: collapse;">
						<thead>
							<tr style="background: #f8f9fa;">
								<th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">Item</th>
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Ordered</th>
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Delivered</th>
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Pending</th>
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Progress</th>
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Rate</th>
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Amount</th>
							</tr>
						</thead>
						<tbody>
	`;
	
	data.items_data.forEach(item => {
		let progress_color = item.percentage >= 100 ? '#2e7d32' : item.percentage > 0 ? '#f57c00' : '#d32f2f';
		html += `
			<tr>
				<td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
					<div style="font-weight: bold;">${item.item_code}</div>
					<div style="font-size: 12px; color: #666;">${item.item_name}</div>
				</td>
				<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.ordered_qty}</td>
				<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #2e7d32; font-weight: bold;">${item.delivered_qty}</span>
				</td>
				<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #d32f2f; font-weight: bold;">${item.pending_qty}</span>
				</td>
				<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="display: flex; align-items: center; justify-content: center;">
						<div style="width: 60px; background: #e0e0e0; height: 8px; border-radius: 4px; margin-right: 8px;">
							<div style="background: ${progress_color}; height: 100%; width: ${item.percentage}%; border-radius: 4px;"></div>
						</div>
						<span style="font-size: 12px; color: ${progress_color}; font-weight: bold;">${item.percentage}%</span>
					</div>
				</td>
				<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.rate}</td>
				<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.amount}</td>
			</tr>
		`;
	});
	
	html += `
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
	
	return html;
}

function create_order_status_dashboard_html(data) {
	let html = `
		<div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
			<!-- Header Section -->
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
				<div>
					<h3 style="margin: 0; color: #333; font-size: 18px;">${data.customer_name || data.customer}</h3>
					<p style="margin: 5px 0; color: #666; font-size: 12px;">SO: ${data.so_name}</p>
					<p style="margin: 5px 0; color: #666; font-size: 12px;">Date: ${data.transaction_date}</p>
				</div>
				<div style="text-align: right;">
					<div style="font-size: 20px; font-weight: bold; color: ${data.status_info.status_color};">${data.status_info.status}</div>
					<div style="color: #666; font-size: 12px;">${data.status_info.message}</div>
				</div>
			</div>

			<!-- Main KPI Cards -->
			<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 22px; font-weight: bold; color: #1976d2;">${data.total_ordered}</div>
					<div style="color: #666; font-size: 11px;">Total Ordered</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 22px; font-weight: bold; color: #2e7d32;">${data.total_delivered}</div>
					<div style="color: #666; font-size: 11px;">Total Delivered</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 22px; font-weight: bold; color: #f57c00;">${data.total_billed}</div>
					<div style="color: #666; font-size: 11px;">Total Billed</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 22px; font-weight: bold; color: #1976d2;">${data.total_amount}</div>
					<div style="color: #666; font-size: 11px;">Total Amount</div>
				</div>
			</div>

			<!-- Production Planning KPIs -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">🏭 Production Planning</h4>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #1976d2;">${data.production_kpis.total_plans || 0}</div>
						<div style="color: #666; font-size: 11px;">Total Plans</div>
					</div>
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #2e7d32;">${data.production_kpis.completed_plans || 0}</div>
						<div style="color: #666; font-size: 11px;">Completed</div>
					</div>
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #f57c00;">${data.production_kpis.in_progress_plans || 0}</div>
						<div style="color: #666; font-size: 11px;">In Progress</div>
					</div>
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #1976d2;">${data.production_kpis.overall_percentage || 0}%</div>
						<div style="color: #666; font-size: 11px;">Progress</div>
					</div>
				</div>
				<div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
					<div style="background: #1976d2; height: 100%; width: ${data.production_kpis.overall_percentage || 0}%; transition: width 0.3s;"></div>
				</div>
			</div>

			<!-- Procurement KPIs -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">📦 Procurement Status</h4>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #1976d2;">${data.procurement_kpis.total_material_requests || 0}</div>
						<div style="color: #666; font-size: 11px;">Material Requests</div>
					</div>
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #f57c00;">${data.procurement_kpis.total_purchase_orders || 0}</div>
						<div style="color: #666; font-size: 11px;">Purchase Orders</div>
					</div>
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #2e7d32;">${data.procurement_kpis.total_purchase_receipts || 0}</div>
						<div style="color: #666; font-size: 11px;">Receipts</div>
					</div>
					<div style="text-align: center;">
						<div style="font-size: 20px; font-weight: bold; color: #1976d2;">${data.procurement_kpis.overall_percentage || 0}%</div>
						<div style="color: #666; font-size: 11px;">Progress</div>
					</div>
				</div>
				<div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
					<div style="background: #f57c00; height: 100%; width: ${data.procurement_kpis.overall_percentage || 0}%; transition: width 0.3s;"></div>
				</div>
			</div>

			<!-- Progress Bars -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">📊 Overall Progress</h4>
				
				<!-- Delivered Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">🚚 Delivery Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #2e7d32;">${data.overall_delivered_percentage}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #2e7d32; height: 100%; width: ${data.overall_delivered_percentage}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Delivered: ${data.total_delivered}</span>
						<span>Pending: ${data.total_pending_delivery}</span>
					</div>
				</div>
				
				<!-- Billed Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">💰 Billing Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #f57c00;">${data.overall_billed_percentage}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #f57c00; height: 100%; width: ${data.overall_billed_percentage}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Billed: ${data.total_billed}</span>
						<span>Pending: ${data.total_pending_billing}</span>
					</div>
				</div>
			</div>

			<!-- Comprehensive Items Table -->
			<div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
				<h4 style="margin: 0; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-size: 16px;">📋 Items Breakdown</h4>
				<div style="overflow-x: auto;">
					<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
						<thead>
							<tr style="background: #f8f9fa;">
								<th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Item</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Ordered</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Delivered</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Billed</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Production</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Procurement</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Delivery %</th>
								<th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Billing %</th>
							</tr>
						</thead>
						<tbody>
	`;
	
	data.items_data.forEach(item => {
		let delivered_color = item.delivered_percentage >= 100 ? '#2e7d32' : item.delivered_percentage > 0 ? '#f57c00' : '#d32f2f';
		let billed_color = item.billed_percentage >= 100 ? '#2e7d32' : item.billed_percentage > 0 ? '#f57c00' : '#d32f2f';
		let production_color = item.production_percentage >= 100 ? '#2e7d32' : item.production_percentage > 0 ? '#1976d2' : '#d32f2f';
		let procurement_color = item.procurement_percentage >= 100 ? '#2e7d32' : item.procurement_percentage > 0 ? '#f57c00' : '#d32f2f';
		
		html += `
			<tr>
				<td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
					<div style="font-weight: bold; font-size: 10px;">${item.item_code}</div>
					<div style="font-size: 9px; color: #666;">${item.item_name}</div>
				</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.ordered_qty}</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #2e7d32; font-weight: bold;">${item.delivered_qty}</span>
				</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #f57c00; font-weight: bold;">${item.billed_qty}</span>
				</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="font-size: 9px;">
						<div>Planned: ${item.production_planned_qty || 0}</div>
						<div>Completed: ${item.production_completed_qty || 0}</div>
					</div>
				</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="font-size: 9px;">
						<div>MR: ${item.material_requested_qty || 0}</div>
						<div>PO: ${item.po_ordered_qty || 0}</div>
					</div>
				</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="display: flex; align-items: center; justify-content: center;">
						<div style="width: 35px; background: #e0e0e0; height: 5px; border-radius: 3px; margin-right: 4px;">
							<div style="background: ${delivered_color}; height: 100%; width: ${item.delivered_percentage}%; border-radius: 3px;"></div>
						</div>
						<span style="font-size: 9px; color: ${delivered_color}; font-weight: bold;">${item.delivered_percentage}%</span>
					</div>
				</td>
				<td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="display: flex; align-items: center; justify-content: center;">
						<div style="width: 35px; background: #e0e0e0; height: 5px; border-radius: 3px; margin-right: 4px;">
							<div style="background: ${billed_color}; height: 100%; width: ${item.billed_percentage}%; border-radius: 3px;"></div>
						</div>
						<span style="font-size: 9px; color: ${billed_color}; font-weight: bold;">${item.billed_percentage}%</span>
					</div>
				</td>
			</tr>
		`;
	});
	
	html += `
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
	
	return html;
}

// run through client script 
frappe.ui.form.on("Sales Order Item", {
	custom_last_sales_rates: function(frm, cdt, cdn) {
		var row = locals[cdt][cdn]
		frm.call({
			method: 'buying_addon.buying_addon.doctype.sales_order.sales_order.get_last_sales_details_custom',
			freeze: true,
			freeze_message: __('Getting Data'),
			args: { item_code: row.item_code },
			callback: function(r) {
				if (r && r.message) {
					var d = new frappe.ui.Dialog({
						title: __('Last Sales Rates'),
						fields: [
							{
								"fieldname": "ls_rates",
								"fieldtype": "HTML",
							}
						],
					})
					d.fields_dict.ls_rates.$wrapper.html(r.message)
					d.show()
				}
				else {
					frappe.msgprint("No data found.")
				}
			}
		});
	}
})
