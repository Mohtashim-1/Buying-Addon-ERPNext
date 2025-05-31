from erpnext.stock.doctype.purchase_receipt.purchase_receipt import PurchaseReceipt
import frappe

class CustomPurchaseReceipt(PurchaseReceipt):
    def check_overflow_with_allowance(self, item, args):
        # 1) find the item's group
        grp = frappe.get_value("Item", item.item_code, "item_group")

        # 2) if the group is marked exempt, skip the core check
        if frappe.get_value("Item Group", grp, "custom_exempt_from_over_delivery"):
            return

        # 3) otherwise, run the standard logic
        super().check_overflow_with_allowance(item, args)