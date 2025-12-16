// ========== PURCHASE ORDER - ALL FEATURES COMBINED ==========
// This file combines all feature files into one
// Load this file in hooks.py: "Purchase Order" : "buying_addon/doctype/purchase_order/purchase_order_all_features.js"

// ========== FEATURE 1: SUPPLIER PROTECTION LOGIC ==========
frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
		// Make supplier field editable if document is in draft status
		if (frm.doc.docstatus === 0 && frm.fields_dict.supplier) {
			frm.set_df_property("supplier", "read_only", 0);
		}
		
		// Store supplier to prevent reset from production plan
		if (frm.doc.docstatus === 0 && frm.doc.supplier) {
			if (!frm._user_supplier) {
				frm._user_supplier = frm.doc.supplier;
			}
		}
		
		// Clear existing supplier watcher
		if (frm._supplier_watcher) {
			clearInterval(frm._supplier_watcher);
			frm._supplier_watcher = null;
		}
		
		// Start continuous watcher to prevent supplier reset
		if (frm.doc.docstatus === 0 && frm.doc.supplier && frm.fields_dict.supplier) {
			// Initialize _user_supplier if not set
			if (!frm._user_supplier) {
				frm._user_supplier = frm.doc.supplier;
			}
			
			// Clear existing watcher first
			if (frm._supplier_watcher) {
				clearInterval(frm._supplier_watcher);
			}
			
			// Prevent infinite loop - track last restored supplier
			if (!frm._last_restored_supplier) {
				frm._last_restored_supplier = null;
			}
			
			frm._supplier_watcher = setInterval(() => {
				// Only restore if supplier changed AND it's different from what we just restored
				if (frm.doc.supplier !== frm._user_supplier && 
					frm._user_supplier && 
					frm.doc.docstatus === 0 &&
					frm.doc.supplier !== frm._last_restored_supplier) {
					
					console.log(`[PO DEBUG] ⚠️ Watcher: Supplier reset detected!`);
					console.log(`[PO DEBUG] Current: ${frm.doc.supplier}, Expected: ${frm._user_supplier}`);
					console.log(`[PO DEBUG] Restoring supplier to: ${frm._user_supplier}`);
					
					// Mark that we're restoring
					frm._last_restored_supplier = frm._user_supplier;
					frm._restoring_supplier = true;
					
					// Direct assignment + refresh to prevent loop
					frm.doc.supplier = frm._user_supplier;
					frm.refresh_field('supplier');
					
					// Also use set_value for proper form update
					frm.set_value('supplier', frm._user_supplier).then(() => {
						// Update stored value
						frm._user_supplier = frm._user_supplier;
						// Clear restoring flag after a delay
						setTimeout(() => {
							frm._restoring_supplier = false;
							// Reset last restored after a delay to allow new changes
							setTimeout(() => {
								if (frm.doc.supplier === frm._user_supplier) {
									frm._last_restored_supplier = null;
								}
							}, 500);
						}, 200);
						
						if (frm.fields_dict.supplier) {
							frm.set_df_property("supplier", "read_only", 0);
						}
					});
				}
			}, 300); // Check every 300ms
		}
		
		// ========== FEATURE 2: DASHBOARD BUTTON ==========
		// Add dashboard button
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button(__('Order Dashboard'), function() {
				show_purchase_order_dashboard(frm);
			}, __('View'));
		}
		
		// ========== FEATURE 7: CONSOLIDATION BUTTON ==========
		// Add consolidation button
		if (frm.doc.items && frm.doc.items.length > 0) {
			frm.add_custom_button(__('Consolidate Items'), function() {
				consolidate_items(frm);
			}, __('Actions'));
		}
		
		// ========== FEATURE 8: CHANGE SUPPLIER BUTTON ==========
		// Add Change Supplier button (only for draft documents)
		if (frm.doc.docstatus === 0) {
			frm.add_custom_button(__('Change Supplier'), function() {
				change_supplier(frm);
			}, __('Actions'));
		}
		
		// ========== FEATURE 2: LOAD ORDER STATUS DASHBOARD ==========
		// Load dashboard data for custom_order_status field
		if (frm.doc.name && !frm.doc.__islocal) {
			frm.trigger("load_order_status_dashboard");
		}
	},
	
	// ========== FEATURE 1: SUPPLIER HANDLER ==========
	supplier: function(frm) {
		if (frm.doc.docstatus === 0 && frm.doc.supplier && frm.fields_dict.supplier) {
			// Don't update if we're currently restoring supplier (prevent loop)
			if (frm._restoring_supplier) {
				console.log(`[PO DEBUG] Supplier handler: Skipping - currently restoring`);
				return;
			}
			
			// Store user's supplier choice - this is the authoritative value
			console.log(`[PO DEBUG] Supplier handler: User changed supplier to: ${frm.doc.supplier}`);
			frm._user_supplier = frm.doc.supplier;
			frm._last_restored_supplier = null; // Reset to allow new changes
			
			// Ensure supplier field remains editable
			frm.set_df_property("supplier", "read_only", 0);
		}
	},
	
	// ========== FEATURE 1: ITEMS HANDLER ==========
	items: function(frm) {
		if (frm.doc.docstatus === 0 && frm.doc.supplier && frm.fields_dict.supplier) {
			// Store the supplier that user wants to keep (use stored value if available)
			const current_supplier = frm._user_supplier || frm.doc.supplier;
			frm._user_supplier = current_supplier;
			console.log(`[PO DEBUG] Items handler: Preserved supplier: ${current_supplier}`);
			
			// Mark that we're monitoring supplier changes
			if (!frm._monitoring_supplier) {
				frm._monitoring_supplier = true;
				
				// Watch for supplier changes multiple times with increasing delays
				[50, 100, 200, 500, 1000, 2000].forEach(delay => {
					setTimeout(() => {
						if (frm.doc.supplier !== current_supplier && 
							current_supplier && 
							frm.doc.docstatus === 0 &&
							!frm._restoring_supplier) {
							console.log(`[PO DEBUG] ⚠️ Items handler: Supplier reset detected after ${delay}ms!`);
							console.log(`[PO DEBUG] Current: ${frm.doc.supplier}, Expected: ${current_supplier}`);
							console.log(`[PO DEBUG] Restoring supplier to: ${current_supplier}`);
							
							// Mark that we're restoring
							frm._restoring_supplier = true;
							frm._last_restored_supplier = current_supplier;
							
							// Supplier was reset - restore it
							frm.doc.supplier = current_supplier;
							frm.refresh_field('supplier');
							frm.set_value('supplier', current_supplier).then(() => {
								// Update stored value
								frm._user_supplier = current_supplier;
								setTimeout(() => {
									frm._restoring_supplier = false;
								}, 200);
							});
						}
						// Always ensure field is editable
						if (frm.fields_dict.supplier) {
							frm.set_df_property("supplier", "read_only", 0);
						}
					}, delay);
				});
				
				// Clear monitoring flag after 3 seconds
				setTimeout(() => {
					frm._monitoring_supplier = false;
				}, 3000);
			}
		}
	},
	
	// ========== FEATURE 2: LOAD ORDER STATUS DASHBOARD ==========
	load_order_status_dashboard: function(frm) {
		frm.call({
			method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_purchase_order_status_dashboard',
			args: { purchase_order_name: frm.doc.name },
			callback: function(r) {
				if (r.message) {
					frm.events.render_order_status_dashboard(frm, r.message);
				} else {
					// Show error message if no data
					if (frm.fields_dict.custom_order_status) {
						const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
						$(wrapper).empty();
						$(wrapper).append('<div style="padding: 20px; text-align: center; color: #666;">No dashboard data available</div>');
					}
				}
			},
			error: function(r) {
				console.error('Error loading dashboard data:', r);
			}
		});
	},
	
	// ========== FEATURE 2: RENDER ORDER STATUS DASHBOARD ==========
	render_order_status_dashboard: function(frm, data) {
		if (frm.fields_dict.custom_order_status) {
			const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
			const dashboard_html = create_order_status_dashboard_html(data);
			$(wrapper).empty();
			$(dashboard_html).appendTo(wrapper);
		}
	},
	
	// ========== FEATURE 5: BEFORE SUBMIT VALIDATION ==========
	before_submit: function(frm) {
		if (frm.doc.total <= 0) {
			frappe.throw(
				msg = "Purchase Order Document can not be submit without Rate"
			);
			frappe.validated = false;
		}
		frm.set_value('custom_po_total', frm.doc.total);
	},
});

// ========== FEATURE 3: LAST PURCHASE RATES ==========
frappe.ui.form.on("Purchase Order Item", {
	custom_last_purchase_rates: function(frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		frm.call({
			method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_last_purchase_details_custom',
			freeze: true,
			freeze_message: __('Getting Data'),
			args: { item_code: row.item_code },
			callback: function(r) {
				if (r && r.message) {
					var d = new frappe.ui.Dialog({
						title: __('Last Purchase Rates'),
						fields: [
							{
								"fieldname": "lp_rates",
								"fieldtype": "HTML",
							}
						],
					});
					d.fields_dict.lp_rates.$wrapper.html(r.message);
					d.show();
				} else {
					frappe.msgprint("No data found.");
				}
			}
		});
	},
	
	// ========== FEATURE 4: PO RATE SETTING ==========
	rate: function(frm, cdt, cdn) {
		set_po_rate(frm, cdt, cdn);
	},
	qty: function(frm, cdt, cdn) {
		set_po_rate(frm, cdt, cdn);
	},
	
	// ========== FEATURE 6: CUSTOM QTY HANDLERS ==========
	custom_qty_: function(frm, cdt, cdn) {
		increase_qty(frm, cdt, cdn);
	},
});

// ========== FEATURE 6: CUSTOM QTY HANDLERS (Additional handler) ==========
frappe.ui.form.on('Purchase Order Item', {
	qty: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		if (d.custom_temp_qty == 0) {
			d.custom_temp_qty = d.qty;
		}
		var new_qty = ((d.custom_temp_qty - d.qty) * 100) / d.custom_temp_qty;
		console.log(new_qty);
		d.custom_qty_ = new_qty;
		d.custom_real_qty = d.custom_temp_qty;
		// NOTE: refresh_field commented out to prevent supplier reset
		// cur_frm.refresh_field('items');
	}
});

// ========== HELPER FUNCTIONS ==========

// Feature 2: Dashboard Functions
function show_purchase_order_dashboard(frm) {
	frm.call({
		method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_purchase_order_dashboard_data',
		args: { purchase_order_name: frm.doc.name },
		callback: function(r) {
			if (r.message) {
				show_dashboard_dialog(r.message, frm);
			}
		}
	});
}

function show_dashboard_dialog(data, frm) {
	let dialog = new frappe.ui.Dialog({
		title: __('Purchase Order Dashboard'),
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
					<h3 style="margin: 0; color: #333;">${data.supplier}</h3>
					<p style="margin: 5px 0; color: #666;">Order Date: ${data.transaction_date}</p>
					<p style="margin: 5px 0; color: #666;">Schedule Date: ${data.schedule_date}</p>
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
						<div style="color: #666;">Received</div>
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
						<div style="font-size: 18px; font-weight: bold; color: #2e7d32;">${data.total_received}</div>
						<div style="color: #666;">Total Received</div>
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
								<th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Received</th>
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
					<span style="color: #2e7d32; font-weight: bold;">${item.received_qty}</span>
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
					<h3 style="margin: 0; color: #333; font-size: 18px;">${data.supplier_name || data.supplier}</h3>
					<p style="margin: 5px 0; color: #666; font-size: 12px;">PO: ${data.po_name}</p>
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
					<div style="font-size: 24px; font-weight: bold; color: #1976d2;">${data.total_ordered}</div>
					<div style="color: #666; font-size: 12px;">Total Ordered</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${data.total_received}</div>
					<div style="color: #666; font-size: 12px;">Total Received</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #f57c00;">${data.total_billed}</div>
					<div style="color: #666; font-size: 12px;">Total Billed</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #1976d2;">${data.total_amount}</div>
					<div style="color: #666; font-size: 12px;">Total Amount</div>
				</div>
			</div>

			<!-- Progress Bars -->
			<div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Progress Overview</h4>
				
				<!-- Received Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">Received Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #2e7d32;">${data.overall_received_percentage}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #2e7d32; height: 100%; width: ${data.overall_received_percentage}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Received: ${data.total_received}</span>
						<span>Pending: ${data.total_pending_receipt}</span>
					</div>
				</div>
				
				<!-- Billed Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">Billing Progress</span>
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

			<!-- Items Table -->
			<div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
				<h4 style="margin: 0; padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-size: 16px;">Items Breakdown</h4>
				<div style="overflow-x: auto;">
					<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
						<thead>
							<tr style="background: #f8f9fa;">
								<th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">Item</th>
								<th style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">Ordered</th>
								<th style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">Received</th>
								<th style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">Billed</th>
								<th style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">Received %</th>
								<th style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">Billed %</th>
							</tr>
						</thead>
						<tbody>
	`;
	
	data.items_data.forEach(item => {
		let received_color = item.received_percentage >= 100 ? '#2e7d32' : item.received_percentage > 0 ? '#f57c00' : '#d32f2f';
		let billed_color = item.billed_percentage >= 100 ? '#2e7d32' : item.billed_percentage > 0 ? '#f57c00' : '#d32f2f';
		
		html += `
			<tr>
				<td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
					<div style="font-weight: bold; font-size: 11px;">${item.item_code}</div>
					<div style="font-size: 10px; color: #666;">${item.item_name}</div>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.ordered_qty}</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #2e7d32; font-weight: bold;">${item.received_qty}</span>
				</td>
				<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
					<span style="color: #f57c00; font-weight: bold;">${item.billed_qty}</span>
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

// Feature 4: PO Rate Setting
function set_po_rate(frm, cdt, cdn) {
	var d = locals[cdt][cdn];
	frappe.model.set_value(d.doctype, d.name, "custom_po_rate", d.rate);
	frappe.model.set_value(d.doctype, d.name, "custom_po_amount", (d.rate * d.qty));
}

// Feature 6: Custom Qty Handlers
function increase_qty(frm, cdt, cdn) {
	var d = locals[cdt][cdn];
	if (d.custom_temp_qty == 0) {
		d.custom_temp_qty = d.qty;
	}
	var act_qty = d.custom_temp_qty;
	var add_per = (d.custom_qty_ * d.qty) / 100;
	var new_qty = act_qty + add_per;
	d.custom_real_qty = act_qty;
	if (d.uom == "KG" || d.uom == "METER") {
		d.qty = new_qty;
	} else {
		d.qty = Math.round(new_qty);
	}
}

// Feature 7: Consolidation
function consolidate_items(frm) {
	if (!frm.doc.items || frm.doc.items.length === 0) {
		return;
	}
	
	// Call the server-side consolidation function
	frm.call({
		method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_consolidated_items',
		args: { doc: frm.doc },
		callback: function(r) {
			if (r.message) {
				// Update the custom table with consolidated data
				frm.doc.custom_purchase_order_item_ct = r.message;
				frm.refresh_field('custom_purchase_order_item_ct');
				frappe.show_alert({
					message: __('Items consolidated successfully'),
					indicator: 'green'
				});
			}
		},
		error: function(r) {
			frappe.msgprint(__('Error consolidating items: ') + r.message);
		}
	});
}

// Feature 8: Change Supplier
function change_supplier(frm) {
	// Only allow changing supplier for draft documents
	if (frm.doc.docstatus !== 0) {
		frappe.msgprint({
			message: __('Supplier can only be changed for draft Purchase Orders'),
			indicator: 'orange',
			title: __('Cannot Change Supplier')
		});
		return;
	}
	
	// Create dialog for supplier selection
	let dialog = new frappe.ui.Dialog({
		title: __('Change Supplier'),
		fields: [
			{
				fieldname: 'current_supplier',
				fieldtype: 'Data',
				label: __('Current Supplier'),
				default: frm.doc.supplier || '',
				read_only: 1
			},
			{
				fieldname: 'new_supplier',
				fieldtype: 'Link',
				options: 'Supplier',
				label: __('New Supplier'),
				reqd: 1,
				get_query: function() {
					return {
						filters: {
							disabled: 0
						}
					};
				}
			}
		],
		primary_action_label: __('Change Supplier'),
		primary_action: function(values) {
			if (!values.new_supplier) {
				frappe.msgprint({
					message: __('Please select a supplier'),
					indicator: 'orange',
					title: __('Supplier Required')
				});
				return;
			}
			
			// Check if supplier is different from current
			if (values.new_supplier === frm.doc.supplier) {
				frappe.msgprint({
					message: __('Selected supplier is the same as current supplier'),
					indicator: 'orange',
					title: __('No Change')
				});
				dialog.hide();
				return;
			}
			
			// Check if document is saved (has a name)
			if (!frm.doc.name || frm.doc.__islocal) {
				frappe.msgprint({
					message: __('Please save the Purchase Order first before changing supplier'),
					indicator: 'orange',
					title: __('Save Required')
				});
				dialog.hide();
				return;
			}
			
			dialog.hide();
			
			// Call server-side method to update supplier directly in database
			frm.call({
				method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.update_supplier_directly',
				args: {
					purchase_order_name: frm.doc.name,
					new_supplier: values.new_supplier
				},
				freeze: true,
				freeze_message: __('Updating supplier...'),
				callback: function(r) {
					if (r.message && r.message.success) {
						// Update the form with the new supplier
						frm.set_value('supplier', values.new_supplier);
						
						// Update preservation flags
						frm._user_changed_supplier = true;
						frm._preserved_supplier = values.new_supplier;
						
						// Reload the form to get fresh data from database
						frm.reload_doc();
						
						frappe.show_alert({
							message: __('Supplier changed to {0}', [values.new_supplier]),
							indicator: 'green'
						});
					}
				},
				error: function(r) {
					frappe.msgprint({
						message: __('Failed to update supplier: {0}', [r.message || 'Unknown error']),
						indicator: 'red',
						title: __('Error')
					});
				}
			});
		}
	});
	
	dialog.show();
}

