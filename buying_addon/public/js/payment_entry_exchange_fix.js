/**
 * Fix: rate onchange must do full sync (same as validate/save), not half-update.
 *
 * Replaces ERPNext Payment Entry source/target exchange rate handlers so
 * same-currency transfers sync immediately on rate change.
 */
frappe.ui.form.on("Payment Entry", {
	onload(frm) {
		_sah_replace_exchange_handlers(frm);
	},
	refresh(frm) {
		_sah_replace_exchange_handlers(frm);
	},
});

function _sah_replace_exchange_handlers(frm) {
	if (frm._sah_exchange_handlers_patched) {
		return;
	}
	frm._sah_exchange_handlers_patched = true;

	const handler = (which) => (f) => _sah_full_sync_on_rate_change(f, which);

	// 1) Replace frm.events / cscript handlers used by frm.trigger
	frm.events.source_exchange_rate = handler("source");
	frm.events.target_exchange_rate = handler("target");
	if (frm.cscript) {
		frm.cscript.source_exchange_rate = handler("source");
		frm.cscript.target_exchange_rate = handler("target");
	}

	// 2) Replace globally registered frappe.ui.form.on handlers for this doctype
	const handlers = frappe.ui.form.handlers?.["Payment Entry"];
	if (handlers) {
		handlers.source_exchange_rate = [handler("source")];
		handlers.target_exchange_rate = [handler("target")];
	}
}

function _sah_same_account_currency(frm) {
	return (
		frm.doc.paid_from_account_currency &&
		frm.doc.paid_from_account_currency === frm.doc.paid_to_account_currency
	);
}

function _sah_full_sync_on_rate_change(frm, which) {
	if (!frm || !frm.doc || frm._sah_syncing_exchange) {
		return;
	}

	frm._sah_syncing_exchange = true;
	frm.set_paid_amount_based_on_received_amount = true;

	try {
		if (_sah_same_account_currency(frm)) {
			const rate =
				which === "target"
					? flt(frm.doc.target_exchange_rate) || flt(frm.doc.source_exchange_rate)
					: flt(frm.doc.source_exchange_rate) || flt(frm.doc.target_exchange_rate);

			if (!rate) {
				return;
			}

			// Same as server validate: target = source, amounts equal, bases = amount × rate
			frm.doc.source_exchange_rate = rate;
			frm.doc.target_exchange_rate = rate;

			const amount = flt(frm.doc.paid_amount) || flt(frm.doc.received_amount);
			if (amount) {
				frm.doc.paid_amount = amount;
				frm.doc.received_amount = amount;
			}

			const base = flt(amount) * flt(rate);
			frm.doc.base_paid_amount = base;
			frm.doc.base_received_amount = base;

			[
				"source_exchange_rate",
				"target_exchange_rate",
				"paid_amount",
				"received_amount",
				"base_paid_amount",
				"base_received_amount",
			].forEach((field) => frm.refresh_field(field));
		} else if (which === "source") {
			if (frm.doc.paid_amount && frm.doc.source_exchange_rate) {
				frm.doc.base_paid_amount =
					flt(frm.doc.paid_amount) * flt(frm.doc.source_exchange_rate);
				frm.refresh_field("base_paid_amount");
			}
			if (frm.doc.base_paid_amount && frm.doc.target_exchange_rate) {
				frm.doc.base_received_amount = frm.doc.base_paid_amount;
				frm.doc.received_amount =
					flt(frm.doc.base_received_amount) / flt(frm.doc.target_exchange_rate);
				frm.refresh_field("base_received_amount");
				frm.refresh_field("received_amount");
			}
		} else if (which === "target") {
			if (frm.doc.base_paid_amount && frm.doc.target_exchange_rate) {
				frm.doc.base_received_amount = frm.doc.base_paid_amount;
				frm.doc.received_amount =
					flt(frm.doc.base_received_amount) / flt(frm.doc.target_exchange_rate);
				frm.refresh_field("base_received_amount");
				frm.refresh_field("received_amount");
			}
		}

		if (frm.events.set_total_allocated_amount) {
			frm.events.set_total_allocated_amount(frm);
		}
		if (frm.events.set_unallocated_amount) {
			frm.events.set_unallocated_amount(frm);
		}
		if (frm.events.set_exchange_gain_loss_deduction) {
			frm.events.set_exchange_gain_loss_deduction(frm);
		}
		if (frm.events.hide_unhide_fields) {
			frm.events.hide_unhide_fields(frm);
		}
	} finally {
		frm.set_paid_amount_based_on_received_amount = false;
		frm._sah_syncing_exchange = false;
	}
}
