# Copyright (c) 2026, mohtashim and contributors
# License: MIT

"""SAH branded HTML email shell — table-based, CTA-first, email-client safe."""

from __future__ import annotations


BRAND = {
	"ink": "#17212B",
	"blue": "#016AA1",
	"lime": "#84C125",
	"muted": "#6B7681",
	"line": "#DDE4EA",
	"panel": "#F1F5F8",
	"ok": "#1F8A5B",
	"warn": "#C9851A",
	"danger": "#C8363D",
}


def wrap(
	*,
	eyebrow: str,
	title: str,
	subtitle: str = "",
	badge: str = "",
	badge_tone: str = "blue",
	body_html: str = "",
	cta_label: str = "",
	cta_url: str = "",
	footer_note: str = "",
) -> str:
	"""Return a full HTML email body (Jinja-safe — pass already-rendered or Jinja fragments)."""
	tones = {
		"blue": BRAND["blue"],
		"ok": BRAND["ok"],
		"warn": BRAND["warn"],
		"danger": BRAND["danger"],
		"lime": BRAND["lime"],
	}
	badge_bg = tones.get(badge_tone, BRAND["blue"])
	badge_html = ""
	if badge:
		badge_html = f"""
		<span style="display:inline-block;background:{badge_bg};color:#fff;font-size:11px;font-weight:700;
		letter-spacing:.6px;padding:4px 10px;border-radius:999px;text-transform:uppercase;">{badge}</span>
		"""

	cta_html = ""
	if cta_label and cta_url:
		cta_html = f"""
		<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
			<tr>
				<td style="border-radius:8px;background:{BRAND["blue"]};">
					<a href="{cta_url}"
						style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;
						font-weight:700;font-size:14px;letter-spacing:.2px;">{cta_label} →</a>
				</td>
				<td width="10"></td>
				<td style="border-radius:8px;border:1px solid {BRAND["line"]};background:#fff;">
					<a href="{cta_url}"
						style="display:inline-block;padding:12px 16px;color:{BRAND["blue"]};text-decoration:none;
						font-weight:600;font-size:13px;">Open in ERP</a>
				</td>
			</tr>
		</table>
		"""

	sub_html = (
		f'<div style="margin-top:6px;font-size:14px;color:{BRAND["muted"]};line-height:1.45;">{subtitle}</div>'
		if subtitle
		else ""
	)
	footer = footer_note or "S.A.H. Enterprise Inc · KEPZ, Karachi · I.T Department"

	return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E8EEF3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEF3;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0"
	style="width:640px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;
	border:1px solid {BRAND["line"]};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{BRAND["ink"]};">

	<!-- header band -->
	<tr>
		<td style="background:{BRAND["blue"]};padding:22px 28px;color:#fff;">
			<table width="100%" cellpadding="0" cellspacing="0"><tr>
				<td>
					<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#B9E07A;">{eyebrow}</div>
					<div style="font-size:24px;font-weight:800;margin-top:6px;line-height:1.2;">{title}</div>
					{sub_html}
				</td>
				<td align="right" valign="top">{badge_html}</td>
			</tr></table>
		</td>
	</tr>

	<!-- lime stitch -->
	<tr><td style="height:5px;background:{BRAND["lime"]};font-size:0;line-height:0;">&nbsp;</td></tr>

	<!-- body -->
	<tr>
		<td style="padding:26px 28px 8px;font-size:14px;line-height:1.55;color:{BRAND["ink"]};">
			{body_html}
			{cta_html}
		</td>
	</tr>

	<!-- footer -->
	<tr>
		<td style="padding:18px 28px 24px;border-top:1px dashed {BRAND["line"]};">
			<div style="font-size:12px;color:{BRAND["muted"]};line-height:1.5;">
				Thanks &amp; regards<br>
				<strong style="color:{BRAND["ink"]};">I.T Department</strong><br>
				{footer}
			</div>
		</td>
	</tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def meta_card(rows):
	"""Key/value card. Each value may be Jinja."""
	cells = []
	for label, value in rows:
		cells.append(
			f"""
			<tr>
				<td style="padding:8px 0;width:38%;color:{BRAND["muted"]};font-size:12px;font-weight:600;
					border-bottom:1px solid {BRAND["line"]};">{label}</td>
				<td style="padding:8px 0;font-size:13px;font-weight:700;color:{BRAND["ink"]};
					border-bottom:1px solid {BRAND["line"]};">{value}</td>
			</tr>
			"""
		)
	return f"""
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
		style="background:{BRAND["panel"]};border-radius:10px;padding:4px 14px;margin:14px 0 18px;">
		{"".join(cells)}
	</table>
	"""


def items_table_jinja(limit: int = 30) -> str:
	line = BRAND["line"]
	muted = BRAND["muted"]
	blue = BRAND["blue"]
	return f"""
	<div style="font-size:11px;font-weight:800;letter-spacing:1.4px;color:{blue};margin:8px 0 8px;">ITEMS</div>
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
		style="border-collapse:collapse;font-size:12.5px;border:1px solid {line};border-radius:8px;overflow:hidden;">
		<tr style="background:{blue};color:#fff;">
			<th align="left" style="padding:9px 10px;font-weight:700;">Item</th>
			<th align="right" style="padding:9px 10px;font-weight:700;">Qty</th>
			<th align="left" style="padding:9px 10px;font-weight:700;">UOM</th>
		</tr>
		{{% for item in (doc.items or [])[:{limit}] %}}
		<tr>
			<td style="padding:8px 10px;border-top:1px solid {line};background:#F8FBFD;">
				<strong>{{{{ item.item_code }}}}</strong>
				{{% if item.item_name %}}<div style="color:{muted};font-size:11px;">{{{{ item.item_name }}}}</div>{{% endif %}}
			</td>
			<td align="right" style="padding:8px 10px;border-top:1px solid {line};font-weight:700;background:#F8FBFD;">{{{{ item.qty }}}}</td>
			<td style="padding:8px 10px;border-top:1px solid {line};background:#F8FBFD;">{{{{ item.uom or item.stock_uom or "" }}}}</td>
		</tr>
		{{% endfor %}}
	</table>
	{{% if (doc.items or [])|length > {limit} %}}
	<p style="font-size:12px;color:{muted};">Showing first {limit} items.</p>
	{{% endif %}}
	"""


def doc_cta_jinja(label: str = "Open document") -> str:
	"""CTA using Notification Jinja context (doc)."""
	return f"""
	{{% set _url = frappe.utils.get_url_to_form(doc.doctype, doc.name) %}}
	<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
		<tr>
			<td style="border-radius:8px;background:{BRAND["blue"]};">
				<a href="{{{{ _url }}}}"
					style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;
					font-weight:700;font-size:14px;">{label} →</a>
			</td>
		</tr>
	</table>
	"""


def notification_shell(
	*,
	eyebrow,
	title_jinja,
	subtitle_jinja="",
	badge="",
	badge_tone="blue",
	intro_jinja="",
	meta_rows=None,
	extra_html="",
	cta_label="Open in ERP",
):
	"""Compose a Notification message (Jinja) with SAH branding."""
	meta = meta_card(meta_rows or [])
	body = f"""
		<div style="font-size:15px;margin-bottom:4px;">{intro_jinja}</div>
		{meta}
		{extra_html}
		{doc_cta_jinja(cta_label)}
	"""
	# title/subtitle/badge may contain Jinja — inject into wrap without escaping
	tones = {
		"blue": BRAND["blue"],
		"ok": BRAND["ok"],
		"warn": BRAND["warn"],
		"danger": BRAND["danger"],
		"lime": BRAND["lime"],
	}
	badge_bg = tones.get(badge_tone, BRAND["blue"])
	badge_html = ""
	if badge:
		badge_html = f"""
		<span style="display:inline-block;background:{badge_bg};color:#fff;font-size:11px;font-weight:700;
		letter-spacing:.6px;padding:4px 10px;border-radius:999px;text-transform:uppercase;">{badge}</span>
		"""
	sub_html = (
		f'<div style="margin-top:6px;font-size:14px;color:#D6EAF7;line-height:1.45;opacity:.95;">{subtitle_jinja}</div>'
		if subtitle_jinja
		else ""
	)
	return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEF3;padding:12px 0;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0"
	style="width:640px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;
	border:1px solid {BRAND["line"]};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{BRAND["ink"]};">
	<tr>
		<td style="background:{BRAND["blue"]};padding:22px 28px;color:#fff;">
			<table width="100%" cellpadding="0" cellspacing="0"><tr>
				<td>
					<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#B9E07A;">{eyebrow}</div>
					<div style="font-size:22px;font-weight:800;margin-top:6px;line-height:1.25;">{title_jinja}</div>
					{sub_html}
				</td>
				<td align="right" valign="top">{badge_html}</td>
			</tr></table>
		</td>
	</tr>
	<tr><td style="height:5px;background:{BRAND["lime"]};font-size:0;line-height:0;">&nbsp;</td></tr>
	<tr>
		<td style="padding:26px 28px 8px;font-size:14px;line-height:1.55;">
			{body}
		</td>
	</tr>
	<tr>
		<td style="padding:18px 28px 24px;border-top:1px dashed {BRAND["line"]};">
			<div style="font-size:12px;color:{BRAND["muted"]};line-height:1.5;">
				Thanks &amp; regards<br>
				<strong style="color:{BRAND["ink"]};">I.T Department · S.A.H. Enterprise Inc</strong>
			</div>
		</td>
	</tr>
</table>
</td></tr>
</table>
"""
