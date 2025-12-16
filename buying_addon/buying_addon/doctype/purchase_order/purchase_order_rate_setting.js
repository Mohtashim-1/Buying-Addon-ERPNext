// ========== FEATURE 4: PO RATE SETTING ==========
// This file handles PO rate setting when rate or qty changes
// To enable: Uncomment this file in hooks.py

frappe.ui.form.on("Purchase Order Item", {
	rate: function(frm, cdt, cdn) {
		set_po_rate(frm, cdt, cdn);
	},
	qty: function(frm, cdt, cdn) {
		set_po_rate(frm, cdt, cdn);
	},
});

function set_po_rate(frm, cdt, cdn) {
	var d = locals[cdt][cdn];
	frappe.model.set_value(d.doctype, d.name, "custom_po_rate", d.rate);
	frappe.model.set_value(d.doctype, d.name, "custom_po_amount", (d.rate * d.qty));
}

