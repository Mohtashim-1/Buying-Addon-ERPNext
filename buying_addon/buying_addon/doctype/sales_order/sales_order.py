import frappe
from frappe.model.document import Document
from frappe.utils import get_url


@frappe.whitelist()
def get_sales_order_dashboard_data(sales_order_name):
    """
    Get dashboard data for Sales Order including:
    - Order Status
    - Delivered Percentage
    - Items breakdown
    """
    so = frappe.get_doc("Sales Order", sales_order_name)
    
    # Calculate delivered percentage
    total_ordered = 0
    total_delivered = 0
    items_data = []
    
    for item in so.items:
        ordered_qty = item.qty or 0
        delivered_qty = item.delivered_qty or 0
        
        total_ordered += ordered_qty
        total_delivered += delivered_qty
        
        # Calculate percentage for this item
        item_percentage = (delivered_qty / ordered_qty * 100) if ordered_qty > 0 else 0
        
        items_data.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "ordered_qty": ordered_qty,
            "delivered_qty": delivered_qty,
            "pending_qty": ordered_qty - delivered_qty,
            "percentage": round(item_percentage, 1),
            "rate": item.rate,
            "amount": item.amount
        })
    
    # Overall percentage
    overall_percentage = (total_delivered / total_ordered * 100) if total_ordered > 0 else 0
    
    # Determine order status
    order_status = get_order_status(so, overall_percentage)
    
    return {
        "order_status": order_status,
        "overall_percentage": round(overall_percentage, 1),
        "total_ordered": total_ordered,
        "total_delivered": total_delivered,
        "total_pending": total_ordered - total_delivered,
        "items_data": items_data,
        "customer": so.customer,
        "customer_name": so.customer_name,
        "transaction_date": so.transaction_date,
        "delivery_date": so.delivery_date,
        "total_amount": so.total
    }


@frappe.whitelist()
def get_sales_order_status_dashboard(sales_order_name):
    """
    Get dashboard data for Sales Order Status Dashboard
    Similar to purchase order status dashboard
    """
    frappe.logger().info(f"🔍 DEBUG: get_sales_order_status_dashboard called with sales_order_name: {sales_order_name}")
    
    try:
        so = frappe.get_doc("Sales Order", sales_order_name)
        frappe.logger().info(f"🔍 DEBUG: Successfully loaded Sales Order: {so.name}")
    except frappe.DoesNotExistError:
        frappe.logger().error(f"❌ ERROR: Sales Order {sales_order_name} does not exist")
        return None
    except Exception as e:
        frappe.logger().error(f"❌ ERROR: Failed to load Sales Order {sales_order_name}: {str(e)}")
        return None
    
    # Calculate KPIs
    total_ordered = 0
    total_delivered = 0
    total_billed = 0
    total_amount = so.total or 0
    
    # Get items data
    items_data = []
    for item in so.items:
        ordered_qty = item.qty or 0
        delivered_qty = item.delivered_qty or 0
        billed_amt = item.billed_amt or 0
        rate = item.rate or 0
        
        # Calculate billed quantity from billed amount and rate
        billed_qty = (billed_amt / rate) if rate and rate > 0 else 0
        
        total_ordered += ordered_qty
        total_delivered += delivered_qty
        total_billed += billed_qty
        
        # Calculate percentages
        delivered_percentage = (delivered_qty / ordered_qty * 100) if ordered_qty > 0 else 0
        billed_percentage = (billed_qty / ordered_qty * 100) if ordered_qty > 0 else 0
        
        items_data.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "ordered_qty": ordered_qty,
            "delivered_qty": delivered_qty,
            "billed_qty": round(billed_qty, 2),
            "pending_delivery": max(0, ordered_qty - delivered_qty),
            "pending_billing": max(0, ordered_qty - billed_qty),
            "delivered_percentage": round(delivered_percentage, 1),
            "billed_percentage": round(billed_percentage, 1),
            "rate": item.rate,
            "amount": item.amount
        })
    
    # Overall percentages
    overall_delivered_percentage = (total_delivered / total_ordered * 100) if total_ordered > 0 else 0
    overall_billed_percentage = (total_billed / total_ordered * 100) if total_ordered > 0 else 0
    
    # Ensure percentages don't exceed 100%
    overall_delivered_percentage = min(overall_delivered_percentage, 100)
    overall_billed_percentage = min(overall_billed_percentage, 100)
    
    # Get status information
    status_info = get_detailed_status_info(so, overall_delivered_percentage, overall_billed_percentage)
    
    result_data = {
        "so_name": so.name,
        "customer": so.customer,
        "customer_name": so.customer_name,
        "transaction_date": so.transaction_date,
        "delivery_date": so.delivery_date,
        "status": so.status,
        "docstatus": so.docstatus,
        "total_ordered": total_ordered,
        "total_delivered": total_delivered,
        "total_billed": round(total_billed, 2),
        "total_pending_delivery": max(0, total_ordered - total_delivered),
        "total_pending_billing": max(0, total_ordered - total_billed),
        "overall_delivered_percentage": round(overall_delivered_percentage, 1),
        "overall_billed_percentage": round(overall_billed_percentage, 1),
        "total_amount": total_amount,
        "items_data": items_data,
        "status_info": status_info
    }
    
    frappe.logger().info(f"🔍 DEBUG: Returning dashboard data: {result_data}")
    return result_data


def get_detailed_status_info(so, delivered_percentage, billed_percentage):
    """
    Get detailed status information for the dashboard
    """
    status_info = {
        "status": so.status,
        "status_color": "gray",
        "progress_color": "#1976d2",
        "message": ""
    }
    
    if so.docstatus == 0:
        status_info.update({
            "status": "Draft",
            "status_color": "gray",
            "message": "Sales Order is in draft status"
        })
    elif so.docstatus == 2:
        status_info.update({
            "status": "Cancelled",
            "status_color": "red",
            "message": "Sales Order has been cancelled"
        })
    elif delivered_percentage >= 100 and billed_percentage >= 100:
        status_info.update({
            "status": "Completed",
            "status_color": "green",
            "progress_color": "#2e7d32",
            "message": "All items delivered and billed"
        })
    elif delivered_percentage >= 100 and billed_percentage < 100:
        status_info.update({
            "status": "To Bill",
            "status_color": "orange",
            "progress_color": "#f57c00",
            "message": "All items delivered, pending billing"
        })
    elif delivered_percentage < 100 and billed_percentage < 100:
        status_info.update({
            "status": "To Deliver and Bill",
            "status_color": "orange",
            "progress_color": "#f57c00",
            "message": "Items pending delivery and billing"
        })
    elif so.status == "On Hold":
        status_info.update({
            "status": "On Hold",
            "status_color": "orange",
            "message": "Sales Order is on hold"
        })
    else:
        status_info.update({
            "status": "In Progress",
            "status_color": "blue",
            "message": "Sales Order is in progress"
        })
    
    return status_info


def get_order_status(so, percentage):
    """
    Determine order status based on delivered percentage and SO status
    """
    if so.docstatus == 0:
        return "Draft"
    elif so.docstatus == 2:
        return "Cancelled"
    elif percentage >= 100:
        return "Fully Delivered"
    elif percentage > 0:
        return "Partially Delivered"
    else:
        return "Pending Delivery"


@frappe.whitelist()
def get_last_sales_details_custom(item_code=None):
    if item_code:
        result = frappe.db.sql("""
            SELECT s.customer AS customer, s.name AS invoice_no, s.currency AS currency,
                   s.transaction_date AS date, si.qty AS qty, si.rate
            FROM `tabSales Order` s
            LEFT JOIN `tabSales Order Item` si ON si.parent = s.name
            WHERE s.docstatus = 1 AND si.item_code = %s
        """, (item_code,), as_dict=1)

        if result:
            base_url = get_url()  
            table = """<table style="border: 1px solid black; border-collapse: collapse; width: 100%;">
                <tr>
                    <th style="border: 1px solid black;">Date</th>
                    <th style="border: 1px solid black;">Order No</th>
                    <th style="border: 1px solid black;">Customer</th>
                    <th style="border: 1px solid black;">Currency</th>
                    <th style="border: 1px solid black;">Rate</th>
                    <th style="border: 1px solid black;">Qty</th>
                </tr>"""
            for item in result:
                table += f"""
                <tr>
                    <td style="border: 1px solid black;">{item.date}</td>
                    <td style="border: 1px solid black;">
                        <a href="{base_url}/app/sales-order/{item.invoice_no}">{item.invoice_no}</a>
                    </td>
                    <td style="border: 1px solid black;">{item.customer}</td>
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
