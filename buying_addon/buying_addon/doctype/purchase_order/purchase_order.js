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