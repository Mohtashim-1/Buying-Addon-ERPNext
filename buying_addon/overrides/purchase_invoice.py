import frappe
from frappe.utils import flt

# ← Correct import path: Purchase Invoice lives under "erpnext.accounts"
from erpnext.accounts.doctype.purchase_invoice.purchase_invoice import PurchaseInvoice as PI

class CustomPurchaseInvoice(PI):
    def check_overflow_with_allowance(self, item, args):
        # 1) Find the Item Group for this item
        grp = frappe.get_value("Item", item.item_code, "item_group")

        # 2) If the Item Group has your custom checkbox, skip the overflow check
        if frappe.get_value("Item Group", grp, "custom_exempt_from_over_delivery"):
            return

        # 3) Otherwise, run ERPNext’s standard logic
        super().check_overflow_with_allowance(item, args)
