from erpnext.stock.doctype.purchase_receipt.purchase_receipt import PurchaseReceipt
import frappe

class CustomPurchaseReceipt(PurchaseReceipt):
    def check_overflow_with_allowance(self, item, args):
        grp = frappe.get_value("Item", item.item_code, "item_group")
        if frappe.get_value("Item Group", grp, "custom_exempt_from_over_delivery"):
            return
        super().check_overflow_with_allowance(item, args)