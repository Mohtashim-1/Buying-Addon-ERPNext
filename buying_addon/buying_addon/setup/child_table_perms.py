# Copyright (c) 2026, mohtashim and contributors
# License: MIT

"""Allow Desk users to query Contact/Address child tables.

Frappe child DocTypes (istable) require a parent_doctype for permission checks.
Desk still calls ``frappe.client.get_list`` on ``Dynamic Link`` / Contact Email /
Contact Phone without a parent, which raises:

	Permission Error: Insufficient Permission for Dynamic Link

This patch grants access when the user can already read Contact or Address.
"""

from __future__ import annotations

import frappe

_PATCHED = False

# Child tables that live under Contact / Address and get listed without parent
_CONTACT_CHILDREN = frozenset(
	{
		"Dynamic Link",
		"Contact Email",
		"Contact Phone",
	}
)


def _user_can_read_contact_or_address(user, perm):
	user = user or frappe.session.user
	if user in ("Administrator", "Guest"):
		return user == "Administrator"
	return perm.has_permission(
		"Contact", "read", user=user, print_logs=False
	) or perm.has_permission("Address", "read", user=user, print_logs=False)


def apply_child_table_permission_patch():
	global _PATCHED
	if _PATCHED:
		return

	import frappe.permissions as perm

	_orig_child = perm.has_child_permission
	_orig_roles = perm.get_role_permissions

	def _has_child_permission(
		child_doctype,
		ptype="read",
		child_doc=None,
		user=None,
		parent_doctype=None,
		*,
		debug=False,
		print_logs=True,
	):
		if (
			child_doctype in _CONTACT_CHILDREN
			and not parent_doctype
			and not child_doc
			and user != "Guest"
		):
			if _user_can_read_contact_or_address(user, perm):
				return True

		return _orig_child(
			child_doctype,
			ptype,
			child_doc,
			user,
			parent_doctype,
			debug=debug,
			print_logs=print_logs,
		)

	def _get_role_permissions(doctype, user=None, **kwargs):
		result = _orig_roles(doctype, user=user, **kwargs)
		name = doctype if isinstance(doctype, str) else getattr(doctype, "name", None)
		if name in _CONTACT_CHILDREN and not (
			result.get("read") or result.get("select")
		):
			if _user_can_read_contact_or_address(user, perm):
				result = dict(result)
				result.update({"read": 1, "select": 1, "write": 1, "create": 1})
		return result

	perm.has_child_permission = _has_child_permission
	perm.get_role_permissions = _get_role_permissions
	_PATCHED = True


def ensure_on_migrate():
	"""after_migrate hook — re-apply patch in worker processes after migrate."""
	apply_child_table_permission_patch()
