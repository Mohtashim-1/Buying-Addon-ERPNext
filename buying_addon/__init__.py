__version__ = "0.0.1"

# Patch Contact/Address child-table permissions as soon as the app loads
try:
	from buying_addon.buying_addon.setup.child_table_perms import apply_child_table_permission_patch

	apply_child_table_permission_patch()
except Exception:
	# Avoid breaking bench commands if site/db is not ready
	pass
