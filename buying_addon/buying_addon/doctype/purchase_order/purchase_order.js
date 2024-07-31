frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
	}
})
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