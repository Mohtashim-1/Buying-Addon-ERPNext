frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
		// Add dashboard button
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button(__('Order Dashboard'), function() {
				show_purchase_order_dashboard(frm);
			}, __('View'));
		}
		
		// Add consolidation button
		if (frm.doc.items && frm.doc.items.length > 0) {
			frm.add_custom_button(__('Consolidate Items'), function() {
				consolidate_items(frm);
			}, __('Actions'));
		}
		
		// Load dashboard data for custom_order_status field
		if (frm.doc.name && !frm.doc.__islocal) {
			frm.trigger("load_order_status_dashboard");
		}
	},
	
	onload(frm) {
		// Load dashboard data when form loads
		if (frm.doc.name && !frm.doc.__islocal) {
			frm.trigger("load_order_status_dashboard");
		}
	},
	
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
	
	render_order_status_dashboard: function(frm, data) {
		if (frm.fields_dict.custom_order_status) {
			const wrapper = $(frm.fields_dict.custom_order_status.wrapper);
			const dashboard_html = create_order_status_dashboard_html(data);
			$(wrapper).empty();
			$(dashboard_html).appendTo(wrapper);
		}
	},
	
	// Reload dashboard when items are updated
	items: function(frm) {
		if (frm.doc.name && !frm.doc.__islocal) {
			setTimeout(() => {
				frm.trigger("load_order_status_dashboard");
			}, 1000);
		}
		// Trigger consolidation when items change
		if (frm.doc.items && frm.doc.items.length > 0) {
			setTimeout(() => {
				consolidate_items(frm);
			}, 500);
		}
	}
})

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

// run through client script 
frappe.ui.form.on("Purchase Order Item", {
	custom_last_purchase_rates:function(frm,cdt,cdn){
		var row = locals[cdt][cdn]
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
					})
					d.fields_dict.lp_rates.$wrapper.html(r.message)
					d.show()
				}
				else{
					frappe.msgprint("No data found.")
				}
			}
		});
	}
})

frappe.ui.form.on("Purchase Order Item", {
	rate: function(frm, cdt, cdn) {
	  set_po_rate(frm, cdt, cdn);
	  
	},
	qty: function(frm, cdt, cdn) {
	  set_po_rate(frm, cdt, cdn);
	  
	},  
  });
  function set_po_rate(frm, cdt, cdn){
	  var d = locals[cdt][cdn];
	
	frappe.model.set_value(d.doctype, d.name, 'po_rate', d.rate);
	frappe.model.set_value(d.doctype, d.name, 'po_amount', d.rate*d.qty);
  }
  
  
  
  
frappe.ui.form.on("Purchase Order Item",{
		rate: function (frm,cdt,cdn){
			set_po_rate(frm,cdt,cdn)
		},
		qty:function(frm,cdt,cdn){
			set_po_rate(frm,cdt,cdn)
		}
	
})

function set_po_rate(frm,cdt,cdn){
	var d = locals[cdt][cdn]
	frappe.model.set_value(d.doctype, d.name, "custom_po_rate",d.rate )
	frappe.model.set_value(d.doctype, d.name, "custom_po_amount", (d.rate * d.qty) )
}

frappe.ui.form.on('Purchase Order',{
	before_submit:function (frm){
		if(frm.doc.total<=0){
			frappe.throw(
			msg = "Purchase Order Document can not be submit without Rate"
			);
			frappe.validated = false
		}
		frm.set_value('custom_po_total',frm.doc.total)
	}
})

// frappe.ui.form.on('Purchase Order',{
// 	before_submit:function(frm){
// 		$.each(frm.doc.items, function(i, d){
// 			if(d.custom_temp_qty == 0){
// 				d.custom_temp_qty = d.qty
// 				d.custom_real_qty = d.qty
// 				frappe.msgprint('1')
// 			}
// 		})
// 	}
// })
frappe.ui.form.on('Purchase Order',{
	refresh:function(frm){
		$.each(frm.doc.items, function(i, d){
			if(d.custom_temp_qty == 0){
				d.custom_temp_qty = d.qty
				d.custom_real_qty = d.qty
			}
		});
		frm.refresh_field('items');
		cur_frm.refresh_field("items")
	}
})


frappe.ui.form.on('Purchase Order Item',{
	custom_qty_:function(frm,cdt,cdn){
		increase_qty(frm,cdt,cdn)
	},
	qty:function(frm,cdt,cdn){
		var d = locals[cdt][cdn]
		if(d.custom_temp_qty==0){
			d.custom_temp_qty = d.qty
		}
		var new_qty = ((d.custom_temp_qty-d.qty) *100 )/ d.custom_temp_qty
		console.log(new_qty)
		d.custom_qty_ = new_qty
		d.custom_real_qty = d.custom_temp_qty
		cur_frm.refresh_field('items')
	
	}
})

function increase_qty(frm,cdt,cdn){
	var d = locals[cdt][cdn]
	if(d.custom_temp_qty==0){
		d.custom_temp_qty = d.qty
	}
	var act_qty = d.custom_temp_qty
	var add_per = (d.custom_qty_*d.qty)/100
	var new_qty = act_qty+add_per
	d.custom_real_qty= act_qty
	if(d.uom == "KG" || d.uom == "METER"){
		d.qty = new_qty
	}
	else{
		d.qty = Math.round(new_qty)
	}
}

// frappe.ui.form.on("Purchase Order", {
//     onload: function(frm) {
// 		frappe.msgprint("onload")
//         frm.fields_dict.items.grid.get_field('item_code').get_query = function(doc, cdt, cdn) {
//             return {
//                 query: "erpnext.controllers.queries.item_query"
//             };
//         };
//         frm.fields_dict.items.grid.get_field('item_code').get_formatter = function(value, doc) {
//             return value;
//         };
//     }
// });

// Function to consolidate items
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