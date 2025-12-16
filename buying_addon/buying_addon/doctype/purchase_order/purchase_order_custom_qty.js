// ========== FEATURE 6: CUSTOM QTY HANDLERS ==========
// This file handles custom quantity calculations
// To enable: Uncomment this file in hooks.py

frappe.ui.form.on('Purchase Order Item', {
	custom_qty_: function(frm, cdt, cdn) {
		increase_qty(frm, cdt, cdn);
	},
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

