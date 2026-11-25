# Copyright (c) 2026, SAH and contributors
# License: MIT

"""Purchase Order mapping overrides."""

import json

import frappe
from frappe import _


@frappe.whitelist()
def make_purchase_order(source_name, target_doc=None, args=None):
	"""Wrap ERPNext MR → PO mapper so naming_series is never copied from MR.

	Both doctypes share the fieldname `naming_series`. get_mapped_doc copies it
	onto the PO, which:
	1. On an existing PO → fails set_only_once ("Value cannot be changed for Series")
	2. On a new PO → can leave an invalid MR series (e.g. MR-MN-.###.-.YY)
	"""
	from erpnext.stock.doctype.material_request.material_request import (
		make_purchase_order as erpnext_make_purchase_order,
	)

	preserved_series = _extract_naming_series(target_doc)
	doc = erpnext_make_purchase_order(source_name, target_doc=target_doc, args=args)
	_sanitize_po_naming_series(doc, preserved_series=preserved_series, source_name=source_name)
	return doc


def _extract_naming_series(target_doc):
	if not target_doc:
		return None
	if isinstance(target_doc, str):
		try:
			data = json.loads(target_doc)
		except Exception:
			return None
		return data.get("naming_series")
	return target_doc.get("naming_series")


def _po_naming_series_options(doc):
	field = doc.meta.get_field("naming_series") if doc.meta else None
	if not field:
		return []
	return [o.strip() for o in (field.options or "").split("\n") if o.strip()]


def _sanitize_po_naming_series(doc, preserved_series=None, source_name=None):
	if not doc or not doc.meta.has_field("naming_series"):
		return

	options = _po_naming_series_options(doc)
	current = (doc.naming_series or "").strip()
	preserved = (preserved_series or "").strip() or None

	# Prefer the series already on the target PO (Get Items From existing PO)
	if preserved:
		doc.naming_series = preserved
		return

	# Existing saved PO: never let MR series overwrite DB series
	if doc.get("name") and not doc.is_new():
		db_series = frappe.db.get_value(doc.doctype, doc.name, "naming_series")
		if db_series:
			doc.naming_series = db_series
			return

	# If mapper left an MR series (or any series not valid for PO), replace it
	if current and options and current not in options:
		default = (doc.meta.get_field("naming_series").default or "").strip()
		if default and default in options:
			doc.naming_series = default
		elif options:
			doc.naming_series = options[0]
		return


def restore_naming_series_on_save(doc, method=None):
	"""Belt-and-suspenders: existing POs must keep DB naming_series (set_only_once).

	Get Items From → Material Request can briefly put MR series on the form;
	this restores the real PO series before set_only_once validation runs.
	"""
	if doc.is_new() or not doc.get("name"):
		return
	if not doc.meta.has_field("naming_series"):
		return

	db_series = frappe.db.get_value("Purchase Order", doc.name, "naming_series")
	if db_series and doc.naming_series != db_series:
		doc.naming_series = db_series
