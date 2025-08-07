frappe.ui.form.on('Material Request', {
	refresh(frm) {
		// Removed custom button for Request Dashboard
		// Dashboard will load automatically below
		if (frm.doc.name && !frm.doc.__islocal) {
			frm.trigger("load_mr_status_dashboard");
		}
	},
	
	onload(frm) {
		// Load dashboard data when form loads
		if (frm.doc.name && !frm.doc.__islocal) {
			frm.trigger("load_mr_status_dashboard");
		}
	},
	
	load_mr_status_dashboard: function(frm) {
		// Show loading spinner
		if (frm.fields_dict.custom_report_status) {
			const wrapper = $(frm.fields_dict.custom_report_status.wrapper);
			$(wrapper).empty();
			$(wrapper).append(`
				<div style="padding: 40px; text-align: center; color: #666;">
					<div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #1976d2; border-radius: 50%; animation: spin 1s linear infinite;"></div>
					<div style="margin-top: 15px; font-size: 14px;">Loading dashboard data...</div>
				</div>
				<style>
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				</style>
			`);
		}
		
		frm.call({
			method: 'buying_addon.buying_addon.doctype.material_request.material_request.get_material_request_status_dashboard',
			args: { material_request_name: frm.doc.name },
			callback: function(r) {
				if (r.message) {
					frm.events.render_mr_status_dashboard(frm, r.message);
				} else {
					// Show error message if no data
					if (frm.fields_dict.custom_report_status) {
						const wrapper = $(frm.fields_dict.custom_report_status.wrapper);
						$(wrapper).empty();
						$(wrapper).append('<div style="padding: 20px; text-align: center; color: #666;">No dashboard data available</div>');
					}
				}
			},
			error: function(r) {
				console.error('Error loading dashboard data:', r);
				// Show error message in the field if available
				if (frm.fields_dict.custom_report_status) {
					const wrapper = $(frm.fields_dict.custom_report_status.wrapper);
					$(wrapper).empty();
					$(wrapper).append('<div style="padding: 20px; text-align: center; color: #d32f2f;">Error loading dashboard data</div>');
				}
			}
		});
	},
	
	render_mr_status_dashboard: function(frm, data) {
		// Check if the custom field exists
		if (frm.fields_dict.custom_report_status) {
			const wrapper = $(frm.fields_dict.custom_report_status.wrapper);
			const dashboard_html = create_mr_status_dashboard_html(data);
			$(wrapper).empty();
			$(dashboard_html).appendTo(wrapper);
		} else {
			console.warn('custom_report_status field not found. Please ensure the custom field is properly configured.');
		}
	},
	
	// Reload dashboard when items are updated
	items: function(frm) {
		if (frm.doc.name && !frm.doc.__islocal) {
			setTimeout(() => {
				frm.trigger("load_mr_status_dashboard");
			}, 1000);
		}
	}
});


function create_mr_status_dashboard_html(data) {
	let html = `
		<div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
			<!-- Header Section -->
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
				<div>
					<h3 style="margin: 0; color: #333; font-size: 18px;">MR: ${data.mr_name}</h3>
					
					<p style="margin: 5px 0; color: #666; font-size: 12px;">Date: ${data.transaction_date}</p>
				</div>
				<div style="text-align: right;">
					<div style="font-size: 20px; font-weight: bold; color: ${data.status_info.status_color};">${data.status_info.status}</div>
					<div style="color: #666; font-size: 12px;">${data.status_info.message}</div>
				</div>
			</div>

			<!-- KPI Cards -->
			<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #1976d2;">${data.total_requested}</div>
					<div style="color: #666; font-size: 12px;">Total Requested</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${data.total_ordered}</div>
					<div style="color: #666; font-size: 12px;">Total Ordered</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #f57c00;">${data.total_received}</div>
					<div style="color: #666; font-size: 12px;">Total Received</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #d32f2f;">${data.total_billed}</div>
					<div style="color: #666; font-size: 12px;">Total Billed</div>
				</div>
			</div>

			<!-- PO Status Card -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Purchase Order Status</h4>
				<div style="display: flex; justify-content: space-between; align-items: center;">
					<div>
						<div style="font-size: 18px; font-weight: bold; color: ${data.po_status.status_color};">${data.po_status.status}</div>
						<div style="color: #666; font-size: 12px;">${data.po_status.message}</div>
					</div>
					<div style="text-align: right;">
						<div style="font-size: 16px; font-weight: bold; color: #333;">${data.po_status.po_count}</div>
						<div style="color: #666; font-size: 12px;">PO(s) Created</div>
						<div style="font-size: 14px; color: #2e7d32; margin-top: 5px;">${data.po_status.total_amount}</div>
					</div>
				</div>
			</div>

			<!-- Progress Bars -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Progress Overview</h4>
				
				<!-- Ordered Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">Ordered Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #2e7d32;">${data.overall_ordered_percentage}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #2e7d32; height: 100%; width: ${data.overall_ordered_percentage}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Ordered: ${data.total_ordered}</span>
						<span>Pending: ${data.total_pending}</span>
					</div>
				</div>
				
				<!-- Received Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">Received Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #f57c00;">${data.overall_received_percentage}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #f57c00; height: 100%; width: ${data.overall_received_percentage}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Received: ${data.total_received}</span>
						<span>Pending: ${data.total_ordered - data.total_received}</span>
					</div>
				</div>
				
				<!-- Billed Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">Billed Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #d32f2f;">${data.overall_billed_percentage}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #d32f2f; height: 100%; width: ${data.overall_billed_percentage}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Billed: ${data.total_billed}</span>
						<span>Pending: ${data.total_ordered - data.total_billed}</span>
					</div>
				</div>
			</div>

			<!-- Items Breakdown Table -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Items Breakdown</h4>
				<div style="overflow-x: auto;">
					<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
						<thead>
							<tr style="background: #f5f5f5;">
								<th style="padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0;">Item</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Requested</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Ordered</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Received</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Billed</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Ordered %</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Received %</th>
								<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Billed %</th>
							</tr>
						</thead>
						<tbody>
	`;
	
	data.items_data.forEach(item => {
		let ordered_color = item.ordered_percentage >= 100 ? '#2e7d32' : item.ordered_percentage > 0 ? '#f57c00' : '#d32f2f';
		let received_color = item.received_percentage >= 100 ? '#2e7d32' : item.received_percentage > 0 ? '#f57c00' : '#d32f2f';
		let billed_color = item.billed_percentage >= 100 ? '#2e7d32' : item.billed_percentage > 0 ? '#f57c00' : '#d32f2f';
		
		html += `
			<tr>
				<td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
					<div style="font-weight: bold; font-size: 11px;">${item.item_code}</div>
					<div style="font-size: 10px; color: #666;">${item.item_name}</div>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.requested_qty}</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #2e7d32; font-weight: bold;">${item.ordered_qty}</span>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #f57c00; font-weight: bold;">${item.received_qty}</span>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #d32f2f; font-weight: bold;">${item.billed_qty}</span>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="display: flex; align-items: center; justify-content: center;">
						<div style="width: 40px; background: #e0e0e0; height: 6px; border-radius: 3px; margin-right: 5px;">
							<div style="background: ${ordered_color}; height: 100%; width: ${item.ordered_percentage}%; border-radius: 3px;"></div>
						</div>
						<span style="font-size: 10px; color: ${ordered_color}; font-weight: bold;">${item.ordered_percentage}%</span>
					</div>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="display: flex; align-items: center; justify-content: center;">
						<div style="width: 40px; background: #e0e0e0; height: 6px; border-radius: 3px; margin-right: 5px;">
							<div style="background: ${received_color}; height: 100%; width: ${item.received_percentage}%; border-radius: 3px;"></div>
						</div>
						<span style="font-size: 10px; color: ${received_color}; font-weight: bold;">${item.received_percentage}%</span>
					</div>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<div style="display: flex; align-items: center; justify-content: center;">
						<div style="width: 40px; background: #e0e0e0; height: 6px; border-radius: 3px; margin-right: 5px;">
							<div style="background: ${billed_color}; height: 100%; width: ${item.billed_percentage}%; border-radius: 3px;"></div>
						</div>
						<span style="font-size: 10px; color: ${billed_color}; font-weight: bold;">${item.billed_percentage}%</span>
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


function show_material_request_dashboard(frm) {
	// Show dashboard in a dialog
	frm.call({
		method: 'buying_addon.buying_addon.doctype.material_request.material_request.get_material_request_status_dashboard',
		args: { material_request_name: frm.doc.name },
		callback: function(r) {
			if (r.message) {
				const dashboard_html = create_mr_status_dashboard_html(r.message);
				const d = new frappe.ui.Dialog({
					title: 'Material Request Dashboard',
					width: 1000,
					fields: [{
						fieldtype: 'HTML',
						fieldname: 'dashboard',
						options: dashboard_html
					}]
				});
				d.show();
			}
		}
	});
} 