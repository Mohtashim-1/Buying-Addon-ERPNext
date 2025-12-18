// ========== FEATURE 1 + 2 + 7: SUPPLIER PROTECTION + DASHBOARD + CONSOLIDATION ==========
// This file combines supplier protection, dashboard and consolidation features
// To enable: Load this file in hooks.py

console.log('[PO] File loaded: purchase_order_dashboard_consolidation.js (with supplier protection)');

frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
		// ========== FEATURE 1: SUPPLIER PROTECTION ==========
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
		// Add dashboard button (only for submitted documents)
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button(__('Order Dashboard'), function() {
				show_purchase_order_dashboard(frm);
			}, __('View'));
		}
		
		// ========== FEATURE 7: CONSOLIDATION BUTTON ==========
		// Add consolidation button (only if items exist)
		if (frm.doc.items && frm.doc.items.length > 0) {
			frm.add_custom_button(__('Consolidate Items'), function() {
				consolidate_items(frm);
			}, __('Actions'));
		}   
		
		// ========== FEATURE 2: LOAD ORDER STATUS DASHBOARD ==========
		// Load dashboard data for custom_order_status field (ONLY for submitted documents)
		if (frm.doc.docstatus === 1 && frm.doc.name && !frm.doc.__islocal) {
			// Wait for field to be available and visible
			const checkAndLoad = () => {
				if (frm.fields_dict.custom_order_status) {
					const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
					// Check if field is visible (not hidden by depends_on or tab)
					if (wrapper.length > 0 && wrapper.is(':visible')) {
						frm.trigger("load_order_status_dashboard");
					} else {
						// Field exists but not visible yet, retry
						setTimeout(checkAndLoad, 300);
					}
				} else {
					// Field not found yet, retry
					setTimeout(checkAndLoad, 300);
				}
			};
			// Start checking after a short delay to allow form to render
			setTimeout(checkAndLoad, 500);
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
	
	load_order_status_dashboard: function(frm) {
		console.log('[DASHBOARD DEBUG] Loading dashboard for PO:', frm.doc.name);
		console.log('[DASHBOARD DEBUG] custom_order_status field exists:', !!frm.fields_dict.custom_order_status);
		
		frm.call({
			method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_purchase_order_status_dashboard',
			args: { purchase_order_name: frm.doc.name },
			callback: function(r) {
				console.log('[DASHBOARD DEBUG] Server response:', r);
				if (r.message) {
					console.log('[DASHBOARD DEBUG] Rendering dashboard with data:', r.message);
					frm.events.render_order_status_dashboard(frm, r.message);
				} else {
					console.log('[DASHBOARD DEBUG] No data received from server');
					// Show error message if no data
					if (frm.fields_dict.custom_order_status) {
						const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
						$(wrapper).empty();
						$(wrapper).append('<div style="padding: 20px; text-align: center; color: #666;">No dashboard data available</div>');
					} else {
						console.error('[DASHBOARD DEBUG] custom_order_status field not found!');
					}
				}
			},
			error: function(r) {
				console.error('[DASHBOARD DEBUG] Error loading dashboard data:', r);
				if (frm.fields_dict.custom_order_status) {
					const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
					$(wrapper).empty();
					$(wrapper).append('<div style="padding: 20px; text-align: center; color: #d32f2f;">Error loading dashboard: ' + (r.message || 'Unknown error') + '</div>');
				}
			}
		});
	},
	
	render_order_status_dashboard: function(frm, data) {
		console.log('[DASHBOARD DEBUG] render_order_status_dashboard called');
		console.log('[DASHBOARD DEBUG] custom_order_status field exists:', !!frm.fields_dict.custom_order_status);
		
		// Try multiple times if field is not ready
		let attempts = 0;
		const maxAttempts = 10; // Increased attempts
		
		const tryRender = () => {
			attempts++;
			console.log(`[DASHBOARD DEBUG] Attempt ${attempts} to render dashboard`);
			
			if (frm.fields_dict.custom_order_status) {
				const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
				console.log('[DASHBOARD DEBUG] Wrapper found:', wrapper.length > 0);
				console.log('[DASHBOARD DEBUG] Wrapper visible:', wrapper.is(':visible'));
				
				if (wrapper.length > 0) {
					// Check if wrapper is visible (might be in hidden tab)
					if (!wrapper.is(':visible')) {
						console.log('[DASHBOARD DEBUG] Wrapper exists but not visible (might be in inactive tab), retrying...');
						if (attempts < maxAttempts) {
							setTimeout(tryRender, 300);
							return false;
						}
					}
					
					const dashboard_html = create_order_status_dashboard_html(data);
					console.log('[DASHBOARD DEBUG] Dashboard HTML created, length:', dashboard_html.length);
					
					$(wrapper).empty();
					$(dashboard_html).appendTo(wrapper);
					
					console.log('[DASHBOARD DEBUG] Dashboard rendered successfully');
					return true;
				} else {
					console.log('[DASHBOARD DEBUG] Wrapper element not found in DOM, retrying...');
					if (attempts < maxAttempts) {
						setTimeout(tryRender, 300);
					} else {
						console.error('[DASHBOARD DEBUG] Max attempts reached, wrapper still not found!');
						console.error('[DASHBOARD DEBUG] Make sure you are on the "Status" tab to see the dashboard');
					}
					return false;
				}
			} else {
				console.log('[DASHBOARD DEBUG] custom_order_status field not found, retrying...');
				console.log('[DASHBOARD DEBUG] Available fields:', Object.keys(frm.fields_dict));
				if (attempts < maxAttempts) {
					setTimeout(tryRender, 300);
				} else {
					console.error('[DASHBOARD DEBUG] Max attempts reached, field still not found!');
					console.error('[DASHBOARD DEBUG] Field might not be loaded. Check if custom_order_status field exists in Purchase Order doctype.');
				}
				return false;
			}
		};
		
		tryRender();
	},
});

// ========== FEATURE 3: LAST PURCHASE RATES ==========
// Handle button click in child table - attach handlers when grid refreshes
frappe.ui.form.on('Purchase Order', {
	refresh: function(frm) {
		// Attach click handlers to button fields in items grid
		if (frm.fields_dict.items && frm.fields_dict.items.grid) {
			var grid = frm.fields_dict.items.grid;
			
			// Function to attach handlers to all rows
			var attachHandlers = function() {
				grid.grid_rows.forEach(function(grid_row) {
					if (grid_row && grid_row.doc) {
						var cdn = grid_row.doc.name;
						var row = locals[grid_row.doctype][cdn];
						
						// Find button field
						var button_field = grid_row.$wrapper.find('[data-fieldname="custom_last_purchase_rates"]');
						
						if (button_field.length > 0) {
							// Remove existing handlers
							button_field.off('click.custom_last_purchase');
							
							// Attach click handler with namespace
							button_field.on('click.custom_last_purchase', function() {
								console.log('[LAST PURCHASE RATES] Button clicked via grid handler!');
								console.log('[LAST PURCHASE RATES] Item code:', row.item_code);
								
								if (!row || !row.item_code) {
									frappe.msgprint({
										message: __('Please select an item first'),
										indicator: 'orange',
										title: __('Item Required')
									});
									return;
								}
								
								frm.call({
									method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_last_purchase_details_custom',
									freeze: true,
									freeze_message: __('Getting Data'),
									args: { item_code: row.item_code },
									callback: function(r) {
										if (r && r.message) {
											var d = new frappe.ui.Dialog({
												title: __('Last Purchase Rates'),
												size: 'large',
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
											frappe.msgprint({
												message: __('No data found for this item'),
												indicator: 'orange',
												title: __('No Data')
											});
										}
									},
									error: function(r) {
										frappe.msgprint({
											message: __('Error loading last purchase rates: ') + (r.message || 'Unknown error'),
											indicator: 'red',
											title: __('Error')
										});
									}
								});
							});
						}
					}
				});
			};
			
			// Attach handlers initially
			setTimeout(attachHandlers, 500);
			
			// Re-attach when grid refreshes
			grid.grid_pages.on('grid-row-render', attachHandlers);
		}
	}
});

// Also try the standard handler approach
frappe.ui.form.on("Purchase Order Item", {
	form_render: function(frm, cdt, cdn) {
		console.log('[LAST PURCHASE RATES] Form render called for:', cdt, cdn);
		
		// Get the row
		var row = locals[cdt][cdn];
		
		// Find the button field in the grid
		if (frm.fields_dict.items && frm.fields_dict.items.grid) {
			var grid = frm.fields_dict.items.grid;
			var grid_row = grid.get_row(cdn);
			
			if (grid_row) {
				// Wait for field to be rendered
				setTimeout(() => {
					var button_field = grid_row.find('[data-fieldname="custom_last_purchase_rates"]');
					
					if (button_field.length > 0) {
						console.log('[LAST PURCHASE RATES] Button field found in form_render, attaching click handler');
						
						// Remove existing handlers to avoid duplicates
						button_field.off('click.custom_last_purchase');
						
						// Attach click handler
						button_field.on('click.custom_last_purchase', function() {
							console.log('[LAST PURCHASE RATES] Button clicked via form_render!');
							console.log('[LAST PURCHASE RATES] Item code:', row.item_code);
							
							if (!row || !row.item_code) {
								frappe.msgprint({
									message: __('Please select an item first'),
									indicator: 'orange',
									title: __('Item Required')
								});
								return;
							}
							
							frm.call({
								method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_last_purchase_details_custom',
								freeze: true,
								freeze_message: __('Getting Data'),
								args: { item_code: row.item_code },
								callback: function(r) {
									if (r && r.message) {
										var d = new frappe.ui.Dialog({
											title: __('Last Purchase Rates'),
											size: 'large',
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
										frappe.msgprint({
											message: __('No data found for this item'),
											indicator: 'orange',
											title: __('No Data')
										});
									}
								},
								error: function(r) {
									frappe.msgprint({
										message: __('Error loading last purchase rates: ') + (r.message || 'Unknown error'),
										indicator: 'red',
										title: __('Error')
									});
								}
							});
						});
					}
				}, 100);
			}
		}
	},
	
	// Also try the standard handler approach
	custom_last_purchase_rates: function(frm, cdt, cdn) {
		console.log('[LAST PURCHASE RATES] Standard handler triggered');
		console.log('[LAST PURCHASE RATES] cdt:', cdt, 'cdn:', cdn);
		
		var row = locals[cdt][cdn];
		console.log('[LAST PURCHASE RATES] Row data:', row);
		console.log('[LAST PURCHASE RATES] Item code:', row.item_code);
		
		if (!row || !row.item_code) {
			frappe.msgprint({
				message: __('Please select an item first'),
				indicator: 'orange',
				title: __('Item Required')
			});
			return;
		}
		
		console.log('[LAST PURCHASE RATES] Calling server method for item:', row.item_code);
		
		frm.call({
			method: 'buying_addon.buying_addon.doctype.purchase_order.purchase_order.get_last_purchase_details_custom',
			freeze: true,
			freeze_message: __('Getting Data'),
			args: { item_code: row.item_code },
			callback: function(r) {
				console.log('[LAST PURCHASE RATES] Server response:', r);
				if (r && r.message) {
					console.log('[LAST PURCHASE RATES] Showing dialog with data');
					var d = new frappe.ui.Dialog({
						title: __('Last Purchase Rates'),
						size: 'large',
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
					console.log('[LAST PURCHASE RATES] No data received');
					frappe.msgprint({
						message: __('No data found for this item'),
						indicator: 'orange',
						title: __('No Data')
					});
				}
			},
			error: function(r) {
				console.error('[LAST PURCHASE RATES] Error:', r);
				frappe.msgprint({
					message: __('Error loading last purchase rates: ') + (r.message || 'Unknown error'),
					indicator: 'red',
					title: __('Error')
				});
			}
		});
	}
});

// ========== DASHBOARD FUNCTIONS ==========
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
	
	if (data.items_data && data.items_data.length > 0) {
		data.items_data.forEach(item => {
			let progress_color = item.percentage >= 100 ? '#2e7d32' : item.percentage > 0 ? '#f57c00' : '#d32f2f';
			html += `
				<tr>
					<td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
						<div style="font-weight: bold;">${item.item_code || ''}</div>
						<div style="font-size: 12px; color: #666;">${item.item_name || ''}</div>
					</td>
					<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.ordered_qty || 0}</td>
					<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<span style="color: #2e7d32; font-weight: bold;">${item.received_qty || 0}</span>
					</td>
					<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<span style="color: #d32f2f; font-weight: bold;">${item.pending_qty || 0}</span>
					</td>
					<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<div style="display: flex; align-items: center; justify-content: center;">
							<div style="width: 60px; background: #e0e0e0; height: 8px; border-radius: 4px; margin-right: 8px;">
								<div style="background: ${progress_color}; height: 100%; width: ${item.percentage || 0}%; border-radius: 4px;"></div>
							</div>
							<span style="font-size: 12px; color: ${progress_color}; font-weight: bold;">${item.percentage || 0}%</span>
						</div>
					</td>
					<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.rate || 0}</td>
					<td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.amount || 0}</td>
				</tr>
			`;
		});
	} else {
		html += `
			<tr>
				<td colspan="7" style="padding: 20px; text-align: center; color: #666;">No items data available</td>
			</tr>
		`;
	}
	
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
					<h3 style="margin: 0; color: #333; font-size: 18px;">${data.supplier_name || data.supplier || 'N/A'}</h3>
					<p style="margin: 5px 0; color: #666; font-size: 12px;">PO: ${data.po_name || 'N/A'}</p>
					<p style="margin: 5px 0; color: #666; font-size: 12px;">Date: ${data.transaction_date || 'N/A'}</p>
				</div>
				<div style="text-align: right;">
					<div style="font-size: 20px; font-weight: bold; color: ${data.status_info?.status_color || '#666'};">${data.status_info?.status || 'N/A'}</div>
					<div style="color: #666; font-size: 12px;">${data.status_info?.message || ''}</div>
				</div>
			</div>

			<!-- KPI Cards -->
			<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #1976d2;">${data.total_ordered || 0}</div>
					<div style="color: #666; font-size: 12px;">Total Ordered</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${data.total_received || 0}</div>
					<div style="color: #666; font-size: 12px;">Total Received</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #f57c00;">${data.total_billed || 0}</div>
					<div style="color: #666; font-size: 12px;">Total Billed</div>
				</div>
				<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
					<div style="font-size: 24px; font-weight: bold; color: #1976d2;">${data.total_amount || 0}</div>
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
						<span style="font-size: 14px; font-weight: bold; color: #2e7d32;">${data.overall_received_percentage || 0}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #2e7d32; height: 100%; width: ${data.overall_received_percentage || 0}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Received: ${data.total_received || 0}</span>
						<span>Pending: ${data.total_pending_receipt || 0}</span>
					</div>
				</div>
				
				<!-- Billed Progress -->
				<div style="margin-bottom: 15px;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
						<span style="font-size: 14px; color: #333;">Billing Progress</span>
						<span style="font-size: 14px; font-weight: bold; color: #f57c00;">${data.overall_billed_percentage || 0}%</span>
					</div>
					<div style="background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden;">
						<div style="background: #f57c00; height: 100%; width: ${data.overall_billed_percentage || 0}%; transition: width 0.3s;"></div>
					</div>
					<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: #666;">
						<span>Billed: ${data.total_billed || 0}</span>
						<span>Pending: ${data.total_pending_billing || 0}</span>
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
	
	if (data.items_data && data.items_data.length > 0) {
		data.items_data.forEach(item => {
			let received_color = item.received_percentage >= 100 ? '#2e7d32' : item.received_percentage > 0 ? '#f57c00' : '#d32f2f';
			let billed_color = item.billed_percentage >= 100 ? '#2e7d32' : item.billed_percentage > 0 ? '#f57c00' : '#d32f2f';
			
			html += `
				<tr>
					<td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
						<div style="font-weight: bold; font-size: 11px;">${item.item_code || ''}</div>
						<div style="font-size: 10px; color: #666;">${item.item_name || ''}</div>
					</td>
					<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.ordered_qty || 0}</td>
					<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<span style="color: #2e7d32; font-weight: bold;">${item.received_qty || 0}</span>
					</td>
					<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<span style="color: #f57c00; font-weight: bold;">${item.billed_qty || 0}</span>
					</td>
					<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<div style="display: flex; align-items: center; justify-content: center;">
							<div style="width: 40px; background: #e0e0e0; height: 6px; border-radius: 3px; margin-right: 5px;">
								<div style="background: ${received_color}; height: 100%; width: ${item.received_percentage || 0}%; border-radius: 3px;"></div>
							</div>
							<span style="font-size: 10px; color: ${received_color}; font-weight: bold;">${item.received_percentage || 0}%</span>
						</div>
					</td>
					<td style="padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0;">
						<div style="display: flex; align-items: center; justify-content: center;">
							<div style="width: 40px; background: #e0e0e0; height: 6px; border-radius: 3px; margin-right: 5px;">
								<div style="background: ${billed_color}; height: 100%; width: ${item.billed_percentage || 0}%; border-radius: 3px;"></div>
							</div>
							<span style="font-size: 10px; color: ${billed_color}; font-weight: bold;">${item.billed_percentage || 0}%</span>
						</div>
					</td>
				</tr>
			`;
		});
	} else {
		html += `
			<tr>
				<td colspan="6" style="padding: 20px; text-align: center; color: #666;">No items data available</td>
			</tr>
		`;
	}
	
	html += `
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
	
	return html;
}

// ========== CONSOLIDATION FUNCTION ==========
function consolidate_items(frm) {
	if (!frm.doc.items || frm.doc.items.length === 0) {
		frappe.msgprint({
			message: __('No items to consolidate'),
			indicator: 'orange',
			title: __('No Items')
		});
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
			frappe.msgprint({
				message: __('Error consolidating items: ') + (r.message || 'Unknown error'),
				indicator: 'red',
				title: __('Error')
			});
		}
	});
}

