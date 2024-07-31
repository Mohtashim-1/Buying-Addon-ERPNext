import frappe
from frappe.model.document import Document

# class PurchaseOrder(Document):
#     def before_save(self):
#         self.get_last_purchase_details_custom()


@frappe.whitelist()
def get_last_purchase_details_custom(item_code=None):
	if item_code:
		result = frappe.db.sql(""" select p.supplier as supplier,p.name as invoice_no,p.currency as currency,p.transaction_date as date, pc.qty as qty,pc.rate from `tabPurchase Order` p Left Join `tabPurchase Order Item` pc
		ON pc.parent=p.name where p.docstatus=1 and pc.item_code=%s """,(item_code),as_dict=1)
		if len(result) > 0:
			table = """ <table style="  border: 1px solid black;
						border-collapse: collapse; width:100%"> <tr><th style="  border: 1px solid black;
						border-collapse: collapse;" >Date</th> <th style="  border: 1px solid black;
						border-collapse: collapse;" >Invoice No</th><th style="  border: 1px solid black;
						border-collapse: collapse;" >Supplier</th><th style="  border: 1px solid black;
						border-collapse: collapse;" >Currency</th> <th style="  border: 1px solid black;
						border-collapse: collapse;">Rate</th><th style="  border: 1px solid black;
						border-collapse: collapse;">Qty</th></tr>"""
			for item in result:
				string_d =""" <tr> <td style="  border: 1px solid black;
							border-collapse: collapse;">{0}</td> <td style="  border: 1px solid black;
							border-collapse: collapse;"><a href="http://104.219.42.250/app/purchase-order/{1}">{1}</a></td><td style="  border: 1px solid black;
							border-collapse: collapse;">{2}</td><td style="  border: 1px solid black;
							border-collapse: collapse;">{3}</td><td style="  border: 1px solid black;
							border-collapse: collapse;">{4}</td><td style="  border: 1px solid black;
							border-collapse: collapse;">{5}</td></tr>
							""".format(str(item.date),str(item.invoice_no),str(item.supplier),str(item.currency),str(item.rate),str(item.qty))
				table+=string_d
			table+="</table>"
			return table
		else:
			return False
	else:
		return False
