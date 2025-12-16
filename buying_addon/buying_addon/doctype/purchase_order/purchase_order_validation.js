// ========== FEATURE 5: BEFORE SUBMIT VALIDATION ==========
// This file handles validation before submitting Purchase Order
// To enable: Uncomment this file in hooks.py

frappe.ui.form.on('Purchase Order', {
	before_submit: function(frm) {
		if (frm.doc.total <= 0) {
			frappe.throw(
				msg = "Purchase Order Document can not be submit without Rate"
			);
			frappe.validated = false;
		}
		frm.set_value('custom_po_total', frm.doc.total);
	}
});

