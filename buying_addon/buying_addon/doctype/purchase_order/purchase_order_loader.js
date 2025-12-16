// ========== PURCHASE ORDER FEATURE LOADER ==========
// This file loads all feature files
// To enable/disable features, comment/uncomment the lines below

// Feature 1: Supplier Protection Logic
// Uncomment to enable supplier protection when production plan items exist
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_supplier_protection");

// Feature 2: Dashboard Functionality
// Uncomment to enable dashboard buttons and order status dashboard
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_dashboard");

// Feature 3: Last Purchase Rates
// Uncomment to enable last purchase rates functionality
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_last_purchase_rates");

// Feature 4: PO Rate Setting
// Uncomment to enable PO rate setting when rate or qty changes
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_rate_setting");

// Feature 5: Before Submit Validation
// Uncomment to enable validation before submitting Purchase Order
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_validation");

// Feature 6: Custom Qty Handlers
// Uncomment to enable custom quantity calculations
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_custom_qty");

// Feature 7: Consolidation
// Uncomment to enable item consolidation functionality
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_consolidation");

// Feature 8: Change Supplier Button
// Uncomment to enable change supplier button functionality
// frappe.require("buying_addon.buying_addon.doctype.purchase_order.purchase_order_change_supplier");

// ========== ALTERNATIVE: Direct file loading ==========
// If frappe.require doesn't work, use direct script tags in hooks.py
// Or load files directly using $.getScript or similar

