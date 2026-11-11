// Copyright (c) 2026, mohtashim and contributors
// For license information, please see license.txt

frappe.query_reports["Pending Purchase Order Tracker"] = {
	filters: [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
		},
		{
			fieldname: "from_date",
			label: __("PO From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -3),
		},
		{
			fieldname: "to_date",
			label: __("PO To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
		{
			fieldname: "supplier",
			label: __("Vendor / Supplier"),
			fieldtype: "Link",
			options: "Supplier",
		},
		{
			fieldname: "workflow_state",
			label: __("PO Workflow Stage"),
			fieldtype: "Link",
			options: "Workflow State",
		},
		{
			fieldname: "sales_order",
			label: __("Sales Order"),
			fieldtype: "Link",
			options: "Sales Order",
		},
		{
			fieldname: "material_request",
			label: __("Material Request"),
			fieldtype: "Link",
			options: "Material Request",
		},
		{
			fieldname: "receipt_status",
			label: __("Receipt Status"),
			fieldtype: "Select",
			options: "\nNot Received\nPartially Received\nAll Pending",
			default: "All Pending",
		},
		{
			fieldname: "delayed_only",
			label: __("Delayed Only"),
			fieldtype: "Check",
			default: 0,
		},
		{
			fieldname: "missing_sales_order",
			label: __("Missing Sales Order Only"),
			fieldtype: "Check",
			default: 0,
		},
		{
			fieldname: "group_by_vendor",
			label: __("Group By Vendor"),
			fieldtype: "Check",
			default: 1,
		},
	],
	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		if (!data) return value;

		if (column.fieldname === "delay_status") {
			if (data.delay_status === "Delayed") {
				value = `<span style="color:#b91c1c;font-weight:600">${value}</span>`;
			} else if (data.delay_status === "Due Today") {
				value = `<span style="color:#ca8a04;font-weight:600">${value}</span>`;
			} else if (data.delay_status === "On Time") {
				value = `<span style="color:#15803d">${value}</span>`;
			}
		}

		if (column.fieldname === "pending_things" && data.pending_qty > 0) {
			value = `<span style="color:#b45309">${value}</span>`;
		}

		if (column.fieldname === "sales_order" && !data.sales_order) {
			value = `<span style="color:#dc2626">Missing SO</span>`;
		}

		return value;
	},
};
