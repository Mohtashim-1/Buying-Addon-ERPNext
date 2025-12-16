// ========== FEATURE 7: CONSOLIDATION ==========
// This file handles item consolidation functionality
// To enable: Uncomment this file in hooks.py

frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
		// Add consolidation button
		if (frm.doc.items && frm.doc.items.length > 0) {
			frm.add_custom_button(__('Consolidate Items'), function() {
				consolidate_items(frm);
			}, __('Actions'));
		}
	},
});

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

