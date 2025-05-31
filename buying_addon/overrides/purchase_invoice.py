import frappe
from frappe.utils import flt

from erpnext.accounts.doctype.purchase_invoice.purchase_invoice import PurchaseInvoice as PI

class CustomPurchaseInvoice(PI):
    def check_overflow_with_allowance(self, item, args):
        grp = frappe.get_value("Item", item.item_code, "item_group")
        if frappe.get_value("Item Group", grp, "custom_exempt_from_over_delivery"):
            return
        super().check_overflow_with_allowance(item, args)
