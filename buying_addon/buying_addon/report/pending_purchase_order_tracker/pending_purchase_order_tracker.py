# Copyright (c) 2026, mohtashim and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint, date_diff, flt, getdate, today


def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns = get_columns()
	data = get_data(filters)
	chart = get_chart_data(data)
	summary = get_report_summary(data)
	return columns, data, None, chart, summary


def get_columns():
	return [
		{
			"label": _("Vendor"),
			"fieldname": "supplier",
			"fieldtype": "Link",
			"options": "Supplier",
			"width": 180,
		},
		{
			"label": _("Purchase Order"),
			"fieldname": "purchase_order",
			"fieldtype": "Link",
			"options": "Purchase Order",
			"width": 140,
		},
		{
			"label": _("Workflow Stage"),
			"fieldname": "workflow_state",
			"fieldtype": "Data",
			"width": 130,
		},
		{
			"label": _("PO Status"),
			"fieldname": "status",
			"fieldtype": "Data",
			"width": 140,
		},
		{
			"label": _("PO Date"),
			"fieldname": "transaction_date",
			"fieldtype": "Date",
			"width": 100,
		},
		{
			"label": _("Required Date"),
			"fieldname": "schedule_date",
			"fieldtype": "Date",
			"width": 110,
		},
		{
			"label": _("Days Delayed"),
			"fieldname": "days_delayed",
			"fieldtype": "Int",
			"width": 100,
		},
		{
			"label": _("Delay Status"),
			"fieldname": "delay_status",
			"fieldtype": "Data",
			"width": 100,
		},
		{
			"label": _("Sales Order"),
			"fieldname": "sales_order",
			"fieldtype": "Link",
			"options": "Sales Order",
			"width": 140,
		},
		{
			"label": _("Material Request"),
			"fieldname": "material_request",
			"fieldtype": "Link",
			"options": "Material Request",
			"width": 140,
		},
		{
			"label": _("Production Plan"),
			"fieldname": "production_plan",
			"fieldtype": "Link",
			"options": "Production Plan",
			"width": 140,
		},
		{
			"label": _("Item Code"),
			"fieldname": "item_code",
			"fieldtype": "Link",
			"options": "Item",
			"width": 130,
		},
		{
			"label": _("Item Name"),
			"fieldname": "item_name",
			"fieldtype": "Data",
			"width": 160,
		},
		{
			"label": _("Ordered Qty"),
			"fieldname": "qty",
			"fieldtype": "Float",
			"width": 100,
			"convertible": "qty",
		},
		{
			"label": _("Received Qty"),
			"fieldname": "received_qty",
			"fieldtype": "Float",
			"width": 110,
			"convertible": "qty",
		},
		{
			"label": _("Pending Qty"),
			"fieldname": "pending_qty",
			"fieldtype": "Float",
			"width": 100,
			"convertible": "qty",
		},
		{
			"label": _("% Received"),
			"fieldname": "percent_received",
			"fieldtype": "Percent",
			"width": 100,
		},
		{
			"label": _("Pending Things"),
			"fieldname": "pending_things",
			"fieldtype": "Data",
			"width": 170,
		},
		{
			"label": _("Amount"),
			"fieldname": "amount",
			"fieldtype": "Currency",
			"width": 110,
		},
		{
			"label": _("Pending Amount"),
			"fieldname": "pending_amount",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Company"),
			"fieldname": "company",
			"fieldtype": "Link",
			"options": "Company",
			"width": 140,
		},
	]


def get_data(filters):
	conditions = get_conditions(filters)
	rows = frappe.db.sql(
		f"""
		SELECT
			po.name AS purchase_order,
			po.supplier,
			po.supplier_name,
			po.transaction_date,
			po.company,
			po.status,
			po.workflow_state,
			po.per_received AS po_per_received,
			poi.schedule_date,
			poi.item_code,
			poi.item_name,
			poi.qty,
			poi.received_qty,
			(poi.qty - IFNULL(poi.received_qty, 0)) AS pending_qty,
			poi.rate,
			poi.amount,
			poi.material_request,
			poi.material_request_item,
			poi.production_plan,
			COALESCE(
				NULLIF(poi.sales_order, ''),
				NULLIF(mri.sales_order, ''),
				NULLIF(mr.custom_sales_order, '')
			) AS sales_order
		FROM `tabPurchase Order` po
		INNER JOIN `tabPurchase Order Item` poi ON poi.parent = po.name
		LEFT JOIN `tabMaterial Request` mr ON mr.name = poi.material_request
		LEFT JOIN `tabMaterial Request Item` mri
			ON mri.name = poi.material_request_item
			AND mri.parent = poi.material_request
		WHERE
			po.docstatus = 1
			AND IFNULL(po.status, '') NOT IN ('Closed', 'Cancelled', 'Delivered', 'Completed')
			AND IFNULL(po.workflow_state, '') NOT IN ('Cancelled', 'Closed')
			AND (poi.qty - IFNULL(poi.received_qty, 0)) > 0.0001
			{conditions}
		ORDER BY
			po.supplier ASC,
			CASE
				WHEN poi.schedule_date IS NULL THEN 1
				WHEN poi.schedule_date < CURDATE() THEN 0
				ELSE 2
			END ASC,
			poi.schedule_date ASC,
			po.transaction_date ASC,
			po.name ASC,
			poi.idx ASC
		""",
		filters,
		as_dict=True,
	)

	as_on = getdate(today())
	data = []
	for row in rows:
		pending_qty = flt(row.pending_qty)
		qty = flt(row.qty)
		received_qty = flt(row.received_qty)
		percent_received = (received_qty / qty * 100.0) if qty else 0.0
		rate = flt(row.rate)
		pending_amount = pending_qty * rate

		schedule_date = getdate(row.schedule_date) if row.schedule_date else None
		days_delayed = 0
		delay_status = "No Schedule"
		if schedule_date:
			diff = date_diff(as_on, schedule_date)
			if diff > 0:
				days_delayed = diff
				delay_status = "Delayed"
			elif diff == 0:
				delay_status = "Due Today"
			else:
				delay_status = "On Time"

		if cint(filters.get("delayed_only")) and delay_status != "Delayed":
			continue

		if cint(filters.get("missing_sales_order")) and row.sales_order:
			continue

		if received_qty <= 0:
			pending_things = _("Goods Not Received")
			receipt_bucket = "Not Received"
		else:
			pending_things = _("Partial Receipt Pending")
			receipt_bucket = "Partially Received"

		receipt_filter = filters.get("receipt_status")
		if receipt_filter and receipt_filter != "All Pending" and receipt_filter != receipt_bucket:
			continue

		stage = row.workflow_state or _("No Workflow")
		pending_things = f"{pending_things} | {stage}"

		data.append(
			{
				"supplier": row.supplier,
				"purchase_order": row.purchase_order,
				"workflow_state": row.workflow_state,
				"status": row.status,
				"transaction_date": row.transaction_date,
				"schedule_date": row.schedule_date,
				"days_delayed": days_delayed,
				"delay_status": delay_status,
				"sales_order": row.sales_order,
				"material_request": row.material_request,
				"production_plan": row.production_plan,
				"item_code": row.item_code,
				"item_name": row.item_name,
				"qty": qty,
				"received_qty": received_qty,
				"pending_qty": pending_qty,
				"percent_received": percent_received,
				"pending_things": pending_things,
				"amount": flt(row.amount),
				"pending_amount": pending_amount,
				"company": row.company,
			}
		)

	if cint(filters.get("group_by_vendor")):
		data = insert_vendor_group_rows(data)

	return data


def get_conditions(filters):
	conditions = []

	if filters.get("company"):
		conditions.append("AND po.company = %(company)s")

	if filters.get("from_date"):
		conditions.append("AND po.transaction_date >= %(from_date)s")

	if filters.get("to_date"):
		conditions.append("AND po.transaction_date <= %(to_date)s")

	if filters.get("supplier"):
		conditions.append("AND po.supplier = %(supplier)s")

	if filters.get("workflow_state"):
		conditions.append("AND po.workflow_state = %(workflow_state)s")

	if filters.get("material_request"):
		conditions.append("AND poi.material_request = %(material_request)s")

	if filters.get("sales_order"):
		conditions.append(
			"""
			AND COALESCE(
				NULLIF(poi.sales_order, ''),
				NULLIF(mri.sales_order, ''),
				NULLIF(mr.custom_sales_order, '')
			) = %(sales_order)s
			"""
		)

	return "\n".join(conditions)


def insert_vendor_group_rows(rows):
	if not rows:
		return rows

	grouped = []
	current_supplier = None
	bucket = []

	def flush():
		nonlocal bucket
		if not bucket:
			return
		supplier = bucket[0].get("supplier")
		pending_qty = sum(flt(r.get("pending_qty")) for r in bucket)
		pending_amount = sum(flt(r.get("pending_amount")) for r in bucket)
		delayed = sum(1 for r in bucket if r.get("delay_status") == "Delayed")
		grouped.append(
			{
				"supplier": supplier,
				"purchase_order": "",
				"workflow_state": "",
				"status": "",
				"transaction_date": None,
				"schedule_date": None,
				"days_delayed": delayed,
				"delay_status": _("Vendor Summary"),
				"sales_order": "",
				"material_request": "",
				"production_plan": "",
				"item_code": "",
				"item_name": _("{0} open line(s)").format(len(bucket)),
				"qty": sum(flt(r.get("qty")) for r in bucket),
				"received_qty": sum(flt(r.get("received_qty")) for r in bucket),
				"pending_qty": pending_qty,
				"percent_received": 0,
				"pending_things": _("Pending against vendor"),
				"amount": sum(flt(r.get("amount")) for r in bucket),
				"pending_amount": pending_amount,
				"company": bucket[0].get("company"),
				"indent": 0,
				"is_group": 1,
			}
		)
		for r in bucket:
			r = frappe._dict(r)
			r["indent"] = 1
			grouped.append(r)
		bucket = []

	for row in rows:
		if row.get("supplier") != current_supplier:
			flush()
			current_supplier = row.get("supplier")
		bucket.append(row)
	flush()
	return grouped


def get_chart_data(data):
	detail_rows = [r for r in data if not r.get("is_group")]
	if not detail_rows:
		return None

	by_vendor = {}
	for row in detail_rows:
		supplier = row.get("supplier") or _("Unknown")
		by_vendor[supplier] = by_vendor.get(supplier, 0) + flt(row.get("pending_qty"))

	# Top 10 vendors by pending qty
	top = sorted(by_vendor.items(), key=lambda x: x[1], reverse=True)[:10]
	return {
		"data": {
			"labels": [x[0] for x in top],
			"datasets": [{"name": _("Pending Qty"), "values": [flt(x[1], 2) for x in top]}],
		},
		"type": "bar",
	}


def get_report_summary(data):
	detail_rows = [r for r in data if not r.get("is_group")]
	if not detail_rows:
		return []

	pos = {r.get("purchase_order") for r in detail_rows if r.get("purchase_order")}
	vendors = {r.get("supplier") for r in detail_rows if r.get("supplier")}
	delayed = sum(1 for r in detail_rows if r.get("delay_status") == "Delayed")
	missing_so = sum(1 for r in detail_rows if not r.get("sales_order"))
	pending_qty = sum(flt(r.get("pending_qty")) for r in detail_rows)
	pending_amount = sum(flt(r.get("pending_amount")) for r in detail_rows)

	return [
		{"value": len(pos), "label": _("Open POs"), "datatype": "Int"},
		{"value": len(vendors), "label": _("Vendors"), "datatype": "Int"},
		{"value": delayed, "label": _("Delayed Lines"), "datatype": "Int"},
		{"value": missing_so, "label": _("Missing SO Lines"), "datatype": "Int"},
		{"value": pending_qty, "label": _("Pending Qty"), "datatype": "Float"},
		{
			"value": pending_amount,
			"label": _("Pending Amount"),
			"datatype": "Currency",
		},
	]
