// buying_addon: safe Layout.refresh_dependency for Frappe v15.107+
//
// Some grids (e.g. total row / partial render) can leave entries in grid_rows that are not
// full GridRow instances, so row.refresh_dependency is missing. Core uses row?.refresh_dependency()
// which still throws when the property exists but is not a function, or when invocation fails.
//
// Wrap the stock refresh_dependency: before it runs, temporarily shrink each table's grid_rows
// to only real rows that expose refresh_dependency, then restore (so we do not fork core logic).

(function apply_buying_addon_layout_dependency_guard() {
	function attempt() {
		if (!frappe?.ui?.form?.Layout?.prototype?.refresh_dependency) {
			setTimeout(attempt, 50);
			return;
		}
		if (frappe.ui.form.Layout._buying_addon_refresh_dependency_wrapped) {
			return;
		}
		frappe.ui.form.Layout._buying_addon_refresh_dependency_wrapped = true;

		const original = frappe.ui.form.Layout.prototype.refresh_dependency;
		frappe.ui.form.Layout.prototype.refresh_dependency = function () {
			const fields = this.fields_list.concat(this.tabs);
			const restores = [];

			for (const f of fields) {
				if (f.df.fieldtype === "Table" && f.grid && Array.isArray(f.grid.grid_rows)) {
					const rows = f.grid.grid_rows;
					const safe = rows.filter(
						(row) => row && typeof row.refresh_dependency === "function"
					);
					if (safe.length !== rows.length) {
						restores.push({ grid: f.grid, rows });
						f.grid.grid_rows = safe;
					}
				}
			}

			try {
				return original.apply(this, arguments);
			} finally {
				for (const { grid, rows } of restores) {
					grid.grid_rows = rows;
				}
			}
		};

		frappe.ui.form.Layout._buying_addon_refresh_dependency_original = original;
	}

	attempt();
})();
