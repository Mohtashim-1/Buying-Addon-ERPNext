// ========== FEATURE 8: CHANGE SUPPLIER BUTTON ==========
// This file handles change supplier button functionality
// To enable: Uncomment this file in hooks.py

frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
		// Add Change Supplier button (only for draft documents)
		if (frm.doc.docstatus === 0) {
			frm.add_custom_button(__('Change Supplier'), function() {
				change_supplier(frm);
			}, __('Actions'));
		}
	},
});

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

