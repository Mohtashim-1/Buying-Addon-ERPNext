import frappe
from frappe.model.document import Document
from frappe.utils import get_url

# class PurchaseOrder(Document):
#     def before_save(self):
#         self.get_last_purchase_details_custom()


@frappe.whitelist()
def get_last_purchase_details_custom(item_code=None):
	if item_code:
		result = frappe.db.sql("""
			SELECT p.supplier AS supplier, p.name AS invoice_no, p.currency AS currency,
			       p.transaction_date AS date, pc.qty AS qty, pc.rate
			FROM `tabPurchase Order` p
			LEFT JOIN `tabPurchase Order Item` pc ON pc.parent = p.name
			WHERE p.docstatus = 1 AND pc.item_code = %s
		""", (item_code,), as_dict=1)

		if result:
			base_url = get_url()  
			table = """<table style="border: 1px solid black; border-collapse: collapse; width: 100%;">
				<tr>
					<th style="border: 1px solid black;">Date</th>
					<th style="border: 1px solid black;">Invoice No</th>
					<th style="border: 1px solid black;">Supplier</th>
					<th style="border: 1px solid black;">Currency</th>
					<th style="border: 1px solid black;">Rate</th>
					<th style="border: 1px solid black;">Qty</th>
				</tr>"""
			for item in result:
				table += f"""
				<tr>
					<td style="border: 1px solid black;">{item.date}</td>
					<td style="border: 1px solid black;">
						<a href="{base_url}/app/purchase-order/{item.invoice_no}">{item.invoice_no}</a>
					</td>
					<td style="border: 1px solid black;">{item.supplier}</td>
					<td style="border: 1px solid black;">{item.currency}</td>
					<td style="border: 1px solid black;">{item.rate}</td>
					<td style="border: 1px solid black;">{item.qty}</td>
				</tr>"""
			table += "</table>"
			return table
		else:
			return False
	else:
		return False