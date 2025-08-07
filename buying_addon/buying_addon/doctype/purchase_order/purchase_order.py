import frappe
from frappe.model.document import Document
from frappe.utils import get_url

# class PurchaseOrder(Document):
#     def before_save(self):
#         self.get_last_purchase_details_custom()


@frappe.whitelist()
def get_purchase_order_dashboard_data(purchase_order_name):
    """
    Get dashboard data for Purchase Order including:
    - Order Status
    - Received Percentage
    - Items breakdown
    """
    po = frappe.get_doc("Purchase Order", purchase_order_name)
    
    # Calculate received percentage
    total_ordered = 0
    total_received = 0
    items_data = []
    
    for item in po.items:
        ordered_qty = item.qty or 0
        received_qty = item.received_qty or 0
        
        total_ordered += ordered_qty
        total_received += received_qty
        
        # Calculate percentage for this item
        item_percentage = (received_qty / ordered_qty * 100) if ordered_qty > 0 else 0
        
        items_data.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "ordered_qty": ordered_qty,
            "received_qty": received_qty,
            "pending_qty": ordered_qty - received_qty,
            "percentage": round(item_percentage, 1),
            "rate": item.rate,
            "amount": item.amount
        })
    
    # Overall percentage
    overall_percentage = (total_received / total_ordered * 100) if total_ordered > 0 else 0
    
    # Determine order status
    order_status = get_order_status(po, overall_percentage)
    
    return {
        "order_status": order_status,
        "overall_percentage": round(overall_percentage, 1),
        "total_ordered": total_ordered,
        "total_received": total_received,
        "total_pending": total_ordered - total_received,
        "items_data": items_data,
        "supplier": po.supplier,
        "transaction_date": po.transaction_date,
        "schedule_date": po.schedule_date,
        "total_amount": po.total
    }


@frappe.whitelist()
def get_purchase_order_status_dashboard(purchase_order_name):
    """
    Get dashboard data for Purchase Order Status Dashboard
    Similar to interview feedback dashboard
    """
    try:
        po = frappe.get_doc("Purchase Order", purchase_order_name)
    except frappe.DoesNotExistError:
        return None
    
    # Calculate KPIs
    total_ordered = 0
    total_received = 0
    total_billed = 0
    total_amount = po.total or 0
    
    # Get items data
    items_data = []
    for item in po.items:
        ordered_qty = item.qty or 0
        received_qty = item.received_qty or 0
        billed_amt = item.billed_amt or 0
        rate = item.rate or 0
        
        # Calculate billed quantity from billed amount and rate
        billed_qty = (billed_amt / rate) if rate and rate > 0 else 0
        
        total_ordered += ordered_qty
        total_received += received_qty
        total_billed += billed_qty
        
        # Calculate percentages
        received_percentage = (received_qty / ordered_qty * 100) if ordered_qty > 0 else 0
        billed_percentage = (billed_qty / ordered_qty * 100) if ordered_qty > 0 else 0
        
        items_data.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "ordered_qty": ordered_qty,
            "received_qty": received_qty,
            "billed_qty": round(billed_qty, 2),
            "pending_receipt": max(0, ordered_qty - received_qty),
            "pending_billing": max(0, ordered_qty - billed_qty),
            "received_percentage": round(received_percentage, 1),
            "billed_percentage": round(billed_percentage, 1),
            "rate": item.rate,
            "amount": item.amount
        })
    
    # Overall percentages
    overall_received_percentage = (total_received / total_ordered * 100) if total_ordered > 0 else 0
    overall_billed_percentage = (total_billed / total_ordered * 100) if total_ordered > 0 else 0
    
    # Ensure percentages don't exceed 100%
    overall_received_percentage = min(overall_received_percentage, 100)
    overall_billed_percentage = min(overall_billed_percentage, 100)
    
    # Get status information
    status_info = get_detailed_status_info(po, overall_received_percentage, overall_billed_percentage)
    
    return {
        "po_name": po.name,
        "supplier": po.supplier,
        "supplier_name": po.supplier_name,
        "transaction_date": po.transaction_date,
        "schedule_date": po.schedule_date,
        "status": po.status,
        "docstatus": po.docstatus,
        "total_ordered": total_ordered,
        "total_received": total_received,
        "total_billed": round(total_billed, 2),
        "total_pending_receipt": max(0, total_ordered - total_received),
        "total_pending_billing": max(0, total_ordered - total_billed),
        "overall_received_percentage": round(overall_received_percentage, 1),
        "overall_billed_percentage": round(overall_billed_percentage, 1),
        "total_amount": total_amount,
        "items_data": items_data,
        "status_info": status_info
    }


def get_detailed_status_info(po, received_percentage, billed_percentage):
    """
    Get detailed status information for the dashboard
    """
    status_info = {
        "status": po.status,
        "status_color": "gray",
        "progress_color": "#1976d2",
        "message": ""
    }
    
    if po.docstatus == 0:
        status_info.update({
            "status": "Draft",
            "status_color": "gray",
            "message": "Purchase Order is in draft status"
        })
    elif po.docstatus == 2:
        status_info.update({
            "status": "Cancelled",
            "status_color": "red",
            "message": "Purchase Order has been cancelled"
        })
    elif received_percentage >= 100 and billed_percentage >= 100:
        status_info.update({
            "status": "Completed",
            "status_color": "green",
            "progress_color": "#2e7d32",
            "message": "All items received and billed"
        })
    elif received_percentage >= 100 and billed_percentage < 100:
        status_info.update({
            "status": "To Bill",
            "status_color": "orange",
            "progress_color": "#f57c00",
            "message": "All items received, pending billing"
        })
    elif received_percentage < 100 and billed_percentage < 100:
        status_info.update({
            "status": "To Receive and Bill",
            "status_color": "orange",
            "progress_color": "#f57c00",
            "message": "Items pending receipt and billing"
        })
    elif po.status == "On Hold":
        status_info.update({
            "status": "On Hold",
            "status_color": "orange",
            "message": "Purchase Order is on hold"
        })
    else:
        status_info.update({
            "status": "In Progress",
            "status_color": "blue",
            "message": "Purchase Order is in progress"
        })
    
    return status_info


def get_order_status(po, percentage):
    """
    Determine order status based on received percentage and PO status
    """
    if po.docstatus == 0:
        return "Draft"
    elif po.docstatus == 2:
        return "Cancelled"
    elif percentage >= 100:
        return "Fully Received"
    elif percentage > 0:
        return "Partially Received"
    else:
        return "Pending Receipt"


@frappe.whitelist()
def get_last_purchase_details_custom(item_code=None):
	if item_code:
		result = frappe.db.sql("""
			SELECT p.supplier AS supplier, p.name AS invoice_no, p.currency AS currency,
			       p.transaction_date AS date, pc.qty AS qty, pc.rate
			FROM `tabPurchase Order` p
			LEFT JOIN `tabPurchase Order Item` pc ON pc.parent = p.name
			WHERE p.docstatus = 1 AND pc.item_code = %s
		""", (item_code,), as_dict=1)

		if result:
			base_url = get_url()  
			table = """<table style="border: 1px solid black; border-collapse: collapse; width: 100%;">
				<tr>
					<th style="border: 1px solid black;">Date</th>
					<th style="border: 1px solid black;">Invoice No</th>
					<th style="border: 1px solid black;">Supplier</th>
					<th style="border: 1px solid black;">Currency</th>
					<th style="border: 1px solid black;">Rate</th>
					<th style="border: 1px solid black;">Qty</th>
				</tr>"""
			for item in result:
				table += f"""
				<tr>
					<td style="border: 1px solid black;">{item.date}</td>
					<td style="border: 1px solid black;">
						<a href="{base_url}/app/purchase-order/{item.invoice_no}">{item.invoice_no}</a>
					</td>
					<td style="border: 1px solid black;">{item.supplier}</td>
					<td style="border: 1px solid black;">{item.currency}</td>
					<td style="border: 1px solid black;">{item.rate}</td>
					<td style="border: 1px solid black;">{item.qty}</td>
				</tr>"""
			table += "</table>"
			return table
		else:
			return False
	else:
		return False