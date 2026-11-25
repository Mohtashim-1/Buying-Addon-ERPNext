# Copyright (c) 2026, mohtashim and contributors
# License: MIT

"""Ensure SAH branded interactive emails for documents + Email Templates."""

from __future__ import annotations

import frappe
from frappe import _

from buying_addon.buying_addon.setup.email_brand import items_table_jinja, notification_shell, wrap

OUTGOING_EMAIL_ACCOUNT = "ERP Notifications"


# ---------------------------------------------------------------------------
# Document Notifications (auto-send)
# ---------------------------------------------------------------------------

NOTIFICATIONS = [
	{
		# Disabled: Draft MRs were emailing every Purchase/Director/System Manager user.
		"name": "Material Request",
		"document_type": "Material Request",
		"event": "New",
		"value_changed": None,
		"condition": 'doc.workflow_state=="Draft"',
		"subject": "{{ doc.name }} · Material Request Draft",
		"attach_print": 0,
		"enabled": 0,
		"roles": [],
		"fields": ["owner"],
		"message": notification_shell(
			eyebrow="PROCUREMENT · MATERIAL REQUEST",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="Draft Material Request ready for review",
			badge="DRAFT",
			badge_tone="warn",
			intro_jinja="A new <strong>Material Request</strong> was created and is waiting in Draft.",
			meta_rows=[
				("Type", "{{ doc.material_request_type }}"),
				("Company", "{{ doc.company }}"),
				("Required By", "{{ doc.schedule_date or '—' }}"),
				("Created By", "{{ doc.owner }}"),
			],
			extra_html=items_table_jinja(),
			cta_label="Open Material Request",
		),
	},
	{
		"name": "Purchase Order",
		"document_type": "Purchase Order",
		"event": "Value Change",
		"value_changed": "workflow_state",
		"condition": 'doc.workflow_state=="Pending For Approval"',
		"subject": "{{ doc.name }} · PO Pending Approval",
		"attach_print": 1,
		"roles": ["System Manager", "Purchase Manager", "Director"],
		"fields": ["owner"],
		"message": notification_shell(
			eyebrow="PROCUREMENT · PURCHASE ORDER",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="Needs your approval",
			badge="APPROVAL",
			badge_tone="warn",
			intro_jinja="Purchase Order is <strong>Pending For Approval</strong>. Review items and totals, then approve or reject.",
			meta_rows=[
				("Supplier", "{{ doc.supplier_name or doc.supplier }}"),
				("Date", "{{ doc.transaction_date }}"),
				("Grand Total", "{{ doc.grand_total }} {{ doc.currency or '' }}"),
				("Created By", "{{ doc.owner }}"),
			],
			extra_html=items_table_jinja(),
			cta_label="Review & Approve PO",
		),
	},
	{
		"name": "Outward Gate Pass",
		"document_type": "Outward Gate Pass",
		"event": "Value Change",
		"value_changed": "workflow_state",
		"condition": 'doc.workflow_state=="For Approval"',
		"subject": "{{ doc.name }} · Gate Pass Approval",
		"attach_print": 1,
		"roles": ["System Manager"],
		"fields": [],
		"message": notification_shell(
			eyebrow="LOGISTICS · OUTWARD GATE PASS",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="Waiting for gate pass approval",
			badge="FOR APPROVAL",
			badge_tone="warn",
			intro_jinja="An <strong>Outward Gate Pass</strong> needs approval before dispatch.",
			meta_rows=[
				("Type", "{{ doc.ogp_type or '' }} / {{ doc.type or '' }}"),
				("Customer", "{{ doc.customer or '—' }}"),
				("Supplier", "{{ doc.supplier or '—' }}"),
				("Prepared By", "{{ doc.prepared_by or doc.owner }}"),
			],
			cta_label="Approve Gate Pass",
		),
	},
	{
		"name": "Outward Gate Pass Approved",
		"document_type": "Outward Gate Pass",
		"event": "Value Change",
		"value_changed": "workflow_state",
		"condition": 'doc.workflow_state in ("Approved", "Direct Approval")',
		"subject": "{{ doc.name }} · Gate Pass Approved",
		"attach_print": 1,
		"roles": ["System Manager"],
		"fields": [],
		"message": notification_shell(
			eyebrow="LOGISTICS · OUTWARD GATE PASS",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="Approved — ready for dispatch",
			badge="APPROVED",
			badge_tone="ok",
			intro_jinja="Outward Gate Pass has been <strong>Approved</strong>.",
			meta_rows=[
				("Type", "{{ doc.ogp_type or '' }} / {{ doc.type or '' }}"),
				("Customer", "{{ doc.customer or '—' }}"),
				("Supplier", "{{ doc.supplier or '—' }}"),
				("Vehicle", "{{ doc.vehicle_no or '—' }}"),
				("Approved By", "{{ doc.approved_by or doc.approved_user or '—' }}"),
			],
			cta_label="Open Gate Pass",
		),
	},
	{
		"name": "Delivery Note Submitted",
		"document_type": "Delivery Note",
		"event": "Submit",
		"value_changed": None,
		"condition": "doc.docstatus==1",
		"subject": "{{ doc.name }} · Delivery Note Submitted",
		"attach_print": 1,
		"roles": ["Sales Manager", "Stock Manager", "System Manager"],
		"fields": ["owner", "contact_email"],
		"message": notification_shell(
			eyebrow="SALES · DELIVERY NOTE",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="Submitted successfully",
			badge="SUBMITTED",
			badge_tone="ok",
			intro_jinja="Delivery Note has been <strong>submitted</strong>. Stock movement is posted.",
			meta_rows=[
				("Customer", "{{ doc.customer_name or doc.customer }}"),
				("Date", "{{ doc.posting_date }}"),
				("Grand Total", "{{ doc.grand_total }} {{ doc.currency or '' }}"),
				("Created By", "{{ doc.owner }}"),
			],
			extra_html=items_table_jinja(),
			cta_label="Open Delivery Note",
		),
	},
	# Extra branded HR / system notifications (enabled ones)
	{
		"name": "Exit Interview Scheduled",
		"document_type": "Exit Interview",
		"event": "Days Before",
		"value_changed": None,
		"condition": "",
		"subject": "Exit Interview · {{ doc.name }}",
		"attach_print": 0,
		"roles": [],
		"fields": [],  # keep existing employee email recipients
		"days_in_advance": 1,
		"date_changed": "date",
		"message": notification_shell(
			eyebrow="HR · EXIT INTERVIEW",
			title_jinja="Exit Interview Scheduled",
			subtitle_jinja="{{ doc.name }}",
			badge="REMINDER",
			badge_tone="blue",
			intro_jinja="An exit interview is coming up. Please prepare and attend on time.",
			meta_rows=[
				("Employee", "{{ doc.employee }} — {{ doc.employee_name or '' }}"),
				("Date", "{{ doc.date or '—' }}"),
				("Status", "{{ doc.status or '—' }}"),
			],
			cta_label="Open Exit Interview",
		),
		"skip_if_standard_fields_missing": True,
	},
	{
		"name": "Notification for new fiscal year",
		"document_type": "Fiscal Year",
		"event": "New",
		"value_changed": None,
		"condition": "",
		"subject": "New Fiscal Year {{ doc.name }} · Review Required",
		"attach_print": 0,
		"roles": ["Accounts Manager", "System Manager"],
		"fields": [],
		"message": notification_shell(
			eyebrow="ACCOUNTS · FISCAL YEAR",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="New fiscal year created — please review",
			badge="REVIEW",
			badge_tone="warn",
			intro_jinja="A new <strong>Fiscal Year</strong> was created automatically. Confirm dates and accounting setup.",
			meta_rows=[
				("Year Name", "{{ doc.name }}"),
				("Start Date", "{{ frappe.format_value(doc.year_start_date) }}"),
				("End Date", "{{ frappe.format_value(doc.year_end_date) }}"),
			],
			cta_label="Open Fiscal Year",
		),
	},
	{
		"name": "Retention Bonus",
		"document_type": "Retention Bonus",
		"event": "Days Before",
		"value_changed": None,
		"condition": "",
		"subject": "Retention Bonus · {{ doc.employee_name or doc.employee }}",
		"attach_print": 0,
		"roles": [],  # keep existing recipients
		"fields": [],
		"days_in_advance": 14,
		"date_changed": "bonus_payment_date",
		"message": notification_shell(
			eyebrow="HR · RETENTION BONUS",
			title_jinja="Bonus payment due soon",
			subtitle_jinja="{{ doc.employee_name or doc.employee }}",
			badge="DUE SOON",
			badge_tone="warn",
			intro_jinja="Retention Bonus payment date is approaching.",
			meta_rows=[
				("Employee", "{{ doc.employee_name or doc.employee }}"),
				("Payment Date", "{{ doc.bonus_payment_date }}"),
				("Amount", "{{ doc.bonus_amount or '—' }}"),
			],
			cta_label="Open Retention Bonus",
		),
		"skip_if_standard_fields_missing": True,
	},
	{
		"name": "Training Scheduled",
		"document_type": "Training Event",
		"event": "Submit",
		"value_changed": None,
		"condition": "doc.docstatus==1",
		"subject": "Training Scheduled · {{ doc.name }}",
		"attach_print": 0,
		"roles": [],
		"fields": [],
		"message": notification_shell(
			eyebrow="HR · TRAINING",
			title_jinja="{{ doc.event_name or doc.name }}",
			subtitle_jinja="Training event scheduled",
			badge="SCHEDULED",
			badge_tone="ok",
			intro_jinja="{{ doc.introduction or 'A training event has been scheduled. See details below.' }}",
			meta_rows=[
				("Event", "{{ doc.event_name or doc.name }}"),
				("Location", "{{ doc.location or '—' }}"),
				("Start", "{{ doc.start_time or '—' }}"),
				("End", "{{ doc.end_time or '—' }}"),
			],
			cta_label="Open Training Event",
		),
	},
	{
		"name": "Training Feedback",
		"document_type": "Training Result",
		"event": "Submit",
		"value_changed": None,
		"condition": "doc.docstatus==1",
		"subject": "Share feedback · {{ doc.training_event }}",
		"attach_print": 0,
		"roles": [],
		"fields": [],
		"message": notification_shell(
			eyebrow="HR · TRAINING FEEDBACK",
			title_jinja="Please share your feedback",
			subtitle_jinja="{{ doc.training_event }}",
			badge="FEEDBACK",
			badge_tone="blue",
			intro_jinja="Your training result is submitted. Please share feedback when prompted.",
			meta_rows=[
				("Training Event", "{{ doc.training_event }}"),
				("Employee", "{{ doc.employee_name or doc.employee or '—' }}"),
			],
			cta_label="Open Training Result",
		),
	},
]


# ---------------------------------------------------------------------------
# Email Templates (manual / system reuse)
# ---------------------------------------------------------------------------

EMAIL_TEMPLATES = [
	{
		"name": "SAH Material Request",
		"subject": "{{ doc.name }} · Material Request",
		"use_html": 1,
		"response_html": notification_shell(
			eyebrow="PROCUREMENT · MATERIAL REQUEST",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="{{ doc.material_request_type or '' }}",
			badge="MR",
			badge_tone="blue",
			intro_jinja="Please review this Material Request.",
			meta_rows=[
				("Company", "{{ doc.company }}"),
				("Required By", "{{ doc.schedule_date or '—' }}"),
				("Status", "{{ doc.workflow_state or doc.status or '—' }}"),
			],
			extra_html=items_table_jinja(),
			cta_label="Open Material Request",
		),
	},
	{
		"name": "SAH Purchase Order",
		"subject": "{{ doc.name }} · Purchase Order",
		"use_html": 1,
		"response_html": notification_shell(
			eyebrow="PROCUREMENT · PURCHASE ORDER",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="{{ doc.supplier_name or doc.supplier }}",
			badge="PO",
			badge_tone="blue",
			intro_jinja="Purchase Order details for your review.",
			meta_rows=[
				("Supplier", "{{ doc.supplier_name or doc.supplier }}"),
				("Date", "{{ doc.transaction_date }}"),
				("Grand Total", "{{ doc.grand_total }} {{ doc.currency or '' }}"),
				("Status", "{{ doc.workflow_state or doc.status or '—' }}"),
			],
			extra_html=items_table_jinja(),
			cta_label="Open Purchase Order",
		),
	},
	{
		"name": "SAH Outward Gate Pass",
		"subject": "{{ doc.name }} · Outward Gate Pass",
		"use_html": 1,
		"response_html": notification_shell(
			eyebrow="LOGISTICS · GATE PASS",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="{{ doc.workflow_state or '' }}",
			badge="OGP",
			badge_tone="blue",
			intro_jinja="Outward Gate Pass details.",
			meta_rows=[
				("Type", "{{ doc.ogp_type or '' }} / {{ doc.type or '' }}"),
				("Customer", "{{ doc.customer or '—' }}"),
				("Supplier", "{{ doc.supplier or '—' }}"),
				("Vehicle", "{{ doc.vehicle_no or '—' }}"),
			],
			cta_label="Open Gate Pass",
		),
	},
	{
		"name": "SAH Delivery Note",
		"subject": "{{ doc.name }} · Delivery Note",
		"use_html": 1,
		"response_html": notification_shell(
			eyebrow="SALES · DELIVERY",
			title_jinja="{{ doc.name }}",
			subtitle_jinja="{{ doc.customer_name or doc.customer }}",
			badge="DN",
			badge_tone="ok",
			intro_jinja="Delivery Note details for your records.",
			meta_rows=[
				("Customer", "{{ doc.customer_name or doc.customer }}"),
				("Date", "{{ doc.posting_date }}"),
				("Grand Total", "{{ doc.grand_total }} {{ doc.currency or '' }}"),
			],
			extra_html=items_table_jinja(),
			cta_label="Open Delivery Note",
		),
	},
	{
		"name": "Leave Approval Notification",
		"subject": "Leave Approval · {{ employee_name }}",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="HR · LEAVE APPROVAL",
			title="Leave Application",
			subtitle="Action required",
			badge="APPROVE",
			badge_tone="warn",
			body_html="""
			<div style="font-size:15px;">A leave application needs your attention.</div>
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
				style="background:#F1F5F8;border-radius:10px;padding:4px 14px;margin:14px 0 18px;">
				<tr><td style="padding:8px 0;width:38%;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Employee</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{employee_name}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Leave Type</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{leave_type}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">From</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{from_date}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">To</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{to_date}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;">Status</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;">{{status}}</td></tr>
			</table>
			{% set doc_link = frappe.utils.get_url_to_form('Leave Application', name) %}
			<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
				<tr><td style="border-radius:8px;background:#016AA1;">
					<a href="{{ doc_link }}" style="display:inline-block;padding:12px 22px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Review Leave →</a>
				</td></tr>
			</table>
			""",
		),
	},
	{
		"name": "Leave Status Notification",
		"subject": "Leave Status · {{ employee_name }} · {{ status }}",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="HR · LEAVE STATUS",
			title="Leave Update",
			subtitle="{{ status }}",
			badge="STATUS",
			badge_tone="blue",
			body_html="""
			<div style="font-size:15px;">Your leave application status has been updated.</div>
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
				style="background:#F1F5F8;border-radius:10px;padding:4px 14px;margin:14px 0 18px;">
				<tr><td style="padding:8px 0;width:38%;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Employee</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{employee_name}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Leave Type</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{leave_type}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">From</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{from_date}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">To</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{to_date}}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;">Status</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;">{{status}}</td></tr>
			</table>
			{% set doc_link = frappe.utils.get_url_to_form('Leave Application', name) %}
			<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
				<tr><td style="border-radius:8px;background:#016AA1;">
					<a href="{{ doc_link }}" style="display:inline-block;padding:12px 22px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Open Leave →</a>
				</td></tr>
			</table>
			""",
		),
	},
	{
		"name": "Interview Reminder",
		"subject": "Interview Reminder · {{ name }}",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="HR · INTERVIEW",
			title="Interview Reminder",
			subtitle="{{ name }}",
			badge="REMINDER",
			badge_tone="warn",
			body_html="""
			<div style="font-size:15px;">You have an upcoming interview.</div>
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
				style="background:#F1F5F8;border-radius:10px;padding:4px 14px;margin:14px 0 18px;">
				<tr><td style="padding:8px 0;width:38%;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Interview</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{ name }}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Date</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{ scheduled_on }}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;">Time</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;">{{ from_time }} – {{ to_time }}</td></tr>
			</table>
			""",
		),
	},
	{
		"name": "Interview Feedback Reminder",
		"subject": "Interview Feedback · {{ name }}",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="HR · INTERVIEW FEEDBACK",
			title="Feedback Pending",
			subtitle="{{ name }}",
			badge="ACTION",
			badge_tone="warn",
			body_html="""
			<div style="font-size:15px;">Interview feedback for <strong>{{ name }}</strong> is not submitted yet. Please submit your feedback.</div>
			""",
		),
	},
	{
		"name": "Exit Questionnaire Notification",
		"subject": "Exit Questionnaire · {{ employee_name }}",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="HR · EXIT QUESTIONNAIRE",
			title="We value your feedback",
			subtitle="{{ company }}",
			badge="EXIT",
			badge_tone="blue",
			body_html="""
			<div style="font-size:15px;">
				Dear {{ employee_name }},<br><br>
				Thank you for your contribution at <strong>{{ company }}</strong>.
				Please take a few minutes to complete the Exit Questionnaire.
			</div>
			{% set web_form = frappe.db.get_value('HR Settings', 'HR Settings', 'exit_questionnaire_web_form') %}
			{% set web_form_link = frappe.utils.get_url(uri=frappe.db.get_value('Web Form', web_form, 'route')) if web_form else '#' %}
			<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
				<tr><td style="border-radius:8px;background:#016AA1;">
					<a href="{{ web_form_link }}" style="display:inline-block;padding:12px 22px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Submit Questionnaire →</a>
				</td></tr>
			</table>
			""",
		),
	},
	{
		"name": "Dispatch Notification",
		"subject": "Your order is out for delivery!",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="LOGISTICS · DISPATCH",
			title="Out for delivery",
			subtitle="{{ delivery_note }}",
			badge="DISPATCH",
			badge_tone="ok",
			body_html="""
			<div style="font-size:15px;">Your order is on the way.</div>
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
				style="background:#F1F5F8;border-radius:10px;padding:4px 14px;margin:14px 0 18px;">
				<tr><td style="padding:8px 0;width:38%;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Customer</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{ customer }}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Contact</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{ first_name }} {{ last_name }}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Address</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{ address }}<br><span style="font-weight:500;color:#6B7681;">{{ customer_address }}</span></td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;border-bottom:1px solid #DDE4EA;">Order</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;border-bottom:1px solid #DDE4EA;">{{ delivery_note }}</td></tr>
				<tr><td style="padding:8px 0;color:#6B7681;font-size:12px;font-weight:600;">Total</td>
					<td style="padding:8px 0;font-size:13px;font-weight:700;">{{ grand_total }}</td></tr>
			</table>
			""",
		),
	},
	{
		"name": "Purchase Reconciliation",
		"subject": "2A/2B Reconciliation · {{ supplier_name }}-{{ supplier_gstin }}",
		"use_html": 1,
		"response_html": wrap(
			eyebrow="ACCOUNTS · GST RECONCILIATION",
			title="Purchase Reconciliation",
			subtitle="{{ supplier_name }}",
			badge="2A/2B",
			badge_tone="blue",
			body_html="""
			<div style="font-size:15px;">
				We have prepared a purchase reconciliation for
				<strong>{{ inward_supply_from_date }}</strong> to <strong>{{ inward_supply_to_date }}</strong>
				for purchases by <strong>{{ company }}</strong> from you.
				<br><br>
				Please make any required corrections on the GST Portal. The attached sheet is for your reference.
			</div>
			""",
		),
	},
]


def _valid_roles(roles):
	out = []
	for role in roles or []:
		if frappe.db.exists("Role", role):
			out.append(role)
	return out


def _valid_fields(doctype, fields):
	meta = frappe.get_meta(doctype)
	out = []
	for field in fields or []:
		if field == "owner" or meta.has_field(field):
			out.append(field)
	return out


def upsert_notification(spec):
	name = spec["name"]
	if not frappe.db.exists("DocType", spec["document_type"]):
		return None

	if frappe.db.exists("Notification", name):
		doc = frappe.get_doc("Notification", name)
	else:
		doc = frappe.new_doc("Notification")
		doc.name = name

	# Preserve schedule fields for Days Before events if already set
	if spec.get("event") == "Days Before":
		if spec.get("days_in_advance") is not None:
			doc.days_in_advance = spec["days_in_advance"]
		if spec.get("date_changed"):
			doc.date_changed = spec["date_changed"]
		elif not doc.date_changed:
			# Don't wipe an existing working schedule
			pass

	doc.enabled = 1 if spec.get("enabled", 1) else 0
	doc.is_standard = 0
	doc.channel = "Email"
	doc.document_type = spec["document_type"]
	doc.event = spec["event"]
	doc.value_changed = spec.get("value_changed") or ""
	doc.condition_type = "Python"
	doc.condition = spec.get("condition") or ""
	doc.subject = spec["subject"]
	doc.message_type = "HTML"
	doc.message = spec["message"]
	doc.attach_print = spec.get("attach_print") or 0
	doc.send_system_notification = 1
	doc.send_to_all_assignees = 0

	if frappe.db.exists("Email Account", OUTGOING_EMAIL_ACCOUNT):
		doc.sender = OUTGOING_EMAIL_ACCOUNT
		doc.sender_email = frappe.db.get_value("Email Account", OUTGOING_EMAIL_ACCOUNT, "email_id")

	# Only rewrite recipients when we have explicit roles/fields in the spec
	# (keeps HR defaults for templates that rely on employee emails via code)
	roles = _valid_roles(spec.get("roles"))
	fields = _valid_fields(spec["document_type"], spec.get("fields"))
	if roles or fields or spec.get("force_recipients"):
		doc.set("recipients", [])
		for role in roles:
			doc.append("recipients", {"receiver_by_role": role})
		for field in fields:
			doc.append("recipients", {"receiver_by_document_field": field})

	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	return doc.name


def upsert_email_template(spec):
	name = spec["name"]
	if frappe.db.exists("Email Template", name):
		doc = frappe.get_doc("Email Template", name)
	else:
		doc = frappe.new_doc("Email Template")
		doc.name = name

	doc.subject = spec["subject"]
	doc.use_html = 1 if spec.get("use_html", 1) else 0
	if doc.use_html:
		doc.response_html = spec.get("response_html") or spec.get("response") or ""
		# keep plain response in sync for clients that ignore response_html
		doc.response = doc.response_html
	else:
		doc.response = spec.get("response") or ""

	if spec.get("reference_doctype"):
		doc.reference_doctype = spec["reference_doctype"]

	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	return doc.name


def fix_outgoing_email_account_login():
	"""SMTP login is often the mailbox address; empty login_id breaks some providers."""
	if not frappe.db.exists("Email Account", OUTGOING_EMAIL_ACCOUNT):
		return {"fixed": False, "reason": "missing_account"}

	account = frappe.get_doc("Email Account", OUTGOING_EMAIL_ACCOUNT)
	changed = False
	if not account.login_id and account.email_id:
		frappe.db.set_value(
			"Email Account",
			account.name,
			"login_id",
			account.email_id,
			update_modified=False,
		)
		changed = True
		account.login_id = account.email_id
	return {"fixed": changed, "login_id": account.login_id}


def verify_outgoing_email_account():
	"""Return whether the default outgoing account can decrypt SMTP password and send."""
	result = {
		"account": OUTGOING_EMAIL_ACCOUNT,
		"exists": False,
		"outgoing_enabled": False,
		"password_ok": False,
		"login_id": None,
		"error": None,
	}

	if not frappe.db.exists("Email Account", OUTGOING_EMAIL_ACCOUNT):
		result["error"] = "Email Account not found"
		return result

	result["exists"] = True
	account = frappe.get_doc("Email Account", OUTGOING_EMAIL_ACCOUNT)
	result["outgoing_enabled"] = bool(account.enable_outgoing)
	result["login_id"] = account.login_id or account.email_id

	try:
		account.get_password(raise_exception=True)
		result["password_ok"] = True
	except Exception as exc:
		result["error"] = str(exc)

	return result


@frappe.whitelist()
def document_email_health():
	"""Desk/bench health check for document notification email delivery."""
	out = {
		"outgoing": verify_outgoing_email_account(),
		"notifications": [],
		"email_templates": [],
		"email_queue_errors_7d": 0,
	}

	for spec in NOTIFICATIONS:
		name = spec["name"]
		enabled = frappe.db.get_value("Notification", name, "enabled") if frappe.db.exists("Notification", name) else None
		out["notifications"].append({"name": name, "enabled": enabled, "document_type": spec["document_type"]})

	for spec in EMAIL_TEMPLATES:
		name = spec["name"]
		exists = frappe.db.exists("Email Template", name)
		use_html = frappe.db.get_value("Email Template", name, "use_html") if exists else None
		out["email_templates"].append({"name": name, "exists": bool(exists), "use_html": use_html})

	out["email_queue_errors_7d"] = frappe.db.count(
		"Email Queue",
		{
			"status": "Error",
			"creation": [">=", frappe.utils.add_days(frappe.utils.nowdate(), -7)],
		},
	)
	return out


def ensure_document_emails():
	created = []
	templates = []
	for spec in NOTIFICATIONS:
		try:
			name = upsert_notification(spec)
			if name:
				created.append(name)
		except Exception:
			frappe.log_error(title=f"ensure_document_emails · {spec.get('name')}")

	for spec in EMAIL_TEMPLATES:
		try:
			templates.append(upsert_email_template(spec))
		except Exception:
			frappe.log_error(title=f"ensure_email_template · {spec.get('name')}")

	login_fix = fix_outgoing_email_account_login()
	frappe.db.commit()

	health = verify_outgoing_email_account()
	if not health.get("password_ok"):
		frappe.log_error(
			title=_("Document notification emails blocked — fix Email Account password"),
			message=_(
				"Notifications for Material Request, Purchase Order, Gate Pass, and Delivery Note "
				"are enabled but outgoing mail cannot send.<br><br>"
				"<b>Action:</b> Open Email Account <b>{0}</b>, re-enter the SMTP password, save, "
				"then retry failed rows in Email Queue.<br><br>"
				"Technical detail: {1}"
			).format(OUTGOING_EMAIL_ACCOUNT, health.get("error") or "unknown"),
		)

	return {
		"notifications": created,
		"email_templates": templates,
		"login_fix": login_fix,
		"email_health": health,
	}
