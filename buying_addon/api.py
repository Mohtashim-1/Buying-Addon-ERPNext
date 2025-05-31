# import frappe
# from frappe import _
# from frappe.utils import flt

# def validate_over_delivery(doc, method):
#     # 1) Read the global setting
#     allow_pct = flt(frappe.get_single("Stock Settings")
#                     .over_delivery_receipt_allowance or 0)

#     # Nothing to do if zero
#     if allow_pct <= 0:
#         return

#     for row in doc.items:
#         # 2) Look up its Item Group exemption flag
#         item_group = frappe.get_value("Item", row.item_code, "item_group")
#         exempt = frappe.get_value("Item Group", item_group,
#                                   "exempt_from_over_delivery")
#         if exempt:
#             continue  # skip this row

#         # 3) Calculate max allowed qty
#         max_qty = flt(row.qty) * (1 + allow_pct/100)
#         received = flt(getattr(row, "received_qty", row.get("qty")))

#         if received > max_qty:
#             frappe.throw(_(
#                 "Over-delivery not allowed for {0}: {1} > {2} ({3}% allowance)"
#             ).format(row.item_code,
#                      received,
#                      max_qty,
#                      allow_pct),
#             title=_("Over-Delivery Exceeded"))
