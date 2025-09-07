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
    Get comprehensive dashboard data for Sales Order including:
    - Order Status
    - Production Planning Status
    - Procurement Status
    - Delivery and Billing Status
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
    
    # Get comprehensive data including production and procurement
    dashboard_data = get_comprehensive_sales_order_data(so)
    
    return dashboard_data


def get_comprehensive_sales_order_data(so):
    """
    Get comprehensive data for Sales Order including production planning and procurement
    """
    # Basic order data
    total_ordered = 0
    total_delivered = 0
    total_billed = 0
    total_amount = so.total or 0
    
    # Production planning data
    production_plans = get_production_plans_for_sales_order(so.name)
    production_plan_status = get_production_plan_status(production_plans)
    
    # Procurement data
    procurement_data = get_procurement_data_for_sales_order(so.name)
    
    # Get items data with comprehensive tracking
    items_data = []
    for item in so.items:
        ordered_qty = item.qty or 0
        delivered_qty = item.delivered_qty or 0
        billed_amt = item.billed_amt or 0
        rate = item.rate or 0
        
        # Calculate billed quantity from billed amount and rate
        billed_qty = (billed_amt / rate) if rate and rate > 0 else 0
        
        # Get production planning data for this item
        item_production_data = get_item_production_data(item.item_code, so.name)
        
        # Get procurement data for this item
        item_procurement_data = get_item_procurement_data(item.item_code, so.name)
        
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
            "billed_qty": billed_qty,
            "pending_delivery": ordered_qty - delivered_qty,
            "pending_billing": ordered_qty - billed_qty,
            "delivered_percentage": round(delivered_percentage, 1),
            "billed_percentage": round(billed_percentage, 1),
            "rate": item.rate,
            "amount": item.amount,
            # Production planning data
            "production_planned_qty": item_production_data.get("planned_qty", 0),
            "production_completed_qty": item_production_data.get("completed_qty", 0),
            "production_pending_qty": item_production_data.get("pending_qty", 0),
            "production_percentage": item_production_data.get("percentage", 0),
            # Procurement data
            "material_requested_qty": item_procurement_data.get("requested_qty", 0),
            "po_ordered_qty": item_procurement_data.get("po_ordered_qty", 0),
            "pr_received_qty": item_procurement_data.get("pr_received_qty", 0),
            "pi_billed_qty": item_procurement_data.get("pi_billed_qty", 0),
            "procurement_percentage": item_procurement_data.get("percentage", 0)
        })
    
    # Calculate overall percentages
    overall_delivered_percentage = (total_delivered / total_ordered * 100) if total_ordered > 0 else 0
    overall_billed_percentage = (total_billed / total_ordered * 100) if total_ordered > 0 else 0
    
    # Calculate production and procurement KPIs
    production_kpis = calculate_production_kpis(production_plans)
    procurement_kpis = calculate_procurement_kpis(procurement_data)
    
    # Determine overall status
    status_info = get_comprehensive_status_info(
        so,
        overall_delivered_percentage, 
        overall_billed_percentage, 
        production_kpis, 
        procurement_kpis
    )
    
    return {
        "so_name": so.name,
        "customer": so.customer,
        "customer_name": so.customer_name,
        "transaction_date": so.transaction_date,
        "delivery_date": so.delivery_date,
        "status_info": status_info,
        # Order KPIs
        "total_ordered": total_ordered,
        "total_delivered": total_delivered,
        "total_billed": total_billed,
        "total_pending_delivery": total_ordered - total_delivered,
        "total_pending_billing": total_ordered - total_billed,
        "overall_delivered_percentage": round(overall_delivered_percentage, 1),
        "overall_billed_percentage": round(overall_billed_percentage, 1),
        "total_amount": total_amount,
        # Production KPIs
        "production_kpis": production_kpis,
        # Procurement KPIs
        "procurement_kpis": procurement_kpis,
        # Items data
        "items_data": items_data,
        # Related documents
        "production_plans": production_plans,
        "procurement_data": procurement_data
    }


def get_comprehensive_status_info(so, delivered_percentage, billed_percentage, production_kpis, procurement_kpis):
    """
    Get comprehensive status information including production and procurement
    """
    # First check the actual Sales Order status
    if so.status == "Closed":
        return {
            "status": "Closed",
            "status_color": "#6c757d",
            "message": "Order has been closed"
        }
    elif so.status == "Cancelled":
        return {
            "status": "Cancelled", 
            "status_color": "#dc3545",
            "message": "Order has been cancelled"
        }
    elif so.status == "On Hold":
        return {
            "status": "On Hold",
            "status_color": "#fd7e14", 
            "message": "Order is on hold"
        }
    elif so.status == "Completed":
        return {
            "status": "Completed",
            "status_color": "#2e7d32",
            "message": "Order completed successfully"
        }
    
    # If not a special status, determine based on progress
    status_info = {
        "status": "In Progress",
        "status_color": "#1976d2",
        "message": "Order is being processed"
    }
    
    # Check if all processes are complete
    if (delivered_percentage >= 100 and billed_percentage >= 100 and 
        production_kpis.get("overall_percentage", 0) >= 100 and 
        procurement_kpis.get("overall_percentage", 0) >= 100):
        status_info.update({
            "status": "Completed",
            "status_color": "#2e7d32",
            "message": "All processes completed successfully"
        })
    elif delivered_percentage >= 100 and billed_percentage >= 100:
        status_info.update({
            "status": "Delivered & Billed",
            "status_color": "#2e7d32",
            "message": "Order delivered and billed, production/procurement may be pending"
        })
    elif delivered_percentage >= 100:
        status_info.update({
            "status": "To Bill",
            "status_color": "#f57c00",
            "message": "All items delivered, pending billing"
        })
    elif production_kpis.get("overall_percentage", 0) >= 100:
        status_info.update({
            "status": "Production Complete",
            "status_color": "#1976d2",
            "message": "Production completed, pending delivery"
        })
    elif procurement_kpis.get("overall_percentage", 0) >= 100:
        status_info.update({
            "status": "Procurement Complete",
            "status_color": "#1976d2",
            "message": "Procurement completed, pending production"
        })
    
    return status_info


def get_production_plans_for_sales_order(sales_order_name):
    """
    Get production plans linked to the sales order
    """
    try:
        production_plans = frappe.db.sql("""
            SELECT 
                pp.name,
                pp.production_plan_name,
                pp.status,
                pp.docstatus,
                pp.planned_start_date,
                pp.planned_end_date,
                pp.total_planned_qty,
                pp.total_produced_qty
            FROM `tabProduction Plan` pp
            WHERE pp.sales_order = %s
            ORDER BY pp.creation DESC
        """, (sales_order_name,), as_dict=True)
        
        return production_plans
    except Exception as e:
        frappe.logger().error(f"Error getting production plans: {str(e)}")
        return []


def get_production_plan_status(production_plans):
    """
    Calculate production plan status
    """
    if not production_plans:
        return {"status": "Not Started", "percentage": 0}
    
    total_planned = sum(plan.get("total_planned_qty", 0) for plan in production_plans)
    total_produced = sum(plan.get("total_produced_qty", 0) for plan in production_plans)
    
    if total_planned > 0:
        percentage = (total_produced / total_planned) * 100
    else:
        percentage = 0
    
    return {
        "status": "In Progress" if percentage > 0 and percentage < 100 else "Completed" if percentage >= 100 else "Not Started",
        "percentage": round(percentage, 1)
    }


def get_procurement_data_for_sales_order(sales_order_name):
    """
    Get procurement data (Material Request, PO, PR, PI) for the sales order
    """
    try:
        # Get Material Requests
        material_requests = frappe.db.sql("""
            SELECT 
                mr.name,
                mr.material_request_type,
                mr.status,
                mr.docstatus,
                mri.item_code,
                mri.qty,
                mri.ordered_qty,
                mri.received_qty
            FROM `tabMaterial Request` mr
            JOIN `tabMaterial Request Item` mri ON mr.name = mri.parent
            WHERE mr.sales_order = %s
        """, (sales_order_name,), as_dict=True)
        
        # Get Purchase Orders
        purchase_orders = frappe.db.sql("""
            SELECT 
                po.name,
                po.status,
                po.docstatus,
                poi.item_code,
                poi.qty,
                poi.received_qty,
                poi.billed_qty
            FROM `tabPurchase Order` po
            JOIN `tabPurchase Order Item` poi ON po.name = poi.parent
            WHERE po.sales_order = %s
        """, (sales_order_name,), as_dict=True)
        
        # Get Purchase Receipts
        purchase_receipts = frappe.db.sql("""
            SELECT 
                pr.name,
                pr.status,
                pr.docstatus,
                pri.item_code,
                pri.qty,
                pri.received_qty
            FROM `tabPurchase Receipt` pr
            JOIN `tabPurchase Receipt Item` pri ON pr.name = pri.parent
            WHERE pr.sales_order = %s
        """, (sales_order_name,), as_dict=True)
        
        # Get Purchase Invoices
        purchase_invoices = frappe.db.sql("""
            SELECT 
                pi.name,
                pi.status,
                pi.docstatus,
                pii.item_code,
                pii.qty,
                pii.amount
            FROM `tabPurchase Invoice` pi
            JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
            WHERE pi.sales_order = %s
        """, (sales_order_name,), as_dict=True)
        
        return {
            "material_requests": material_requests,
            "purchase_orders": purchase_orders,
            "purchase_receipts": purchase_receipts,
            "purchase_invoices": purchase_invoices
        }
    except Exception as e:
        frappe.logger().error(f"Error getting procurement data: {str(e)}")
        return {"material_requests": [], "purchase_orders": [], "purchase_receipts": [], "purchase_invoices": []}


def get_item_production_data(item_code, sales_order_name):
    """
    Get production data for a specific item
    """
    try:
        # Get production plans for this item
        production_data = frappe.db.sql("""
            SELECT 
                ppi.item_code,
                SUM(ppi.planned_qty) as planned_qty,
                SUM(ppi.produced_qty) as produced_qty
            FROM `tabProduction Plan Item` ppi
            JOIN `tabProduction Plan` pp ON ppi.parent = pp.name
            WHERE pp.sales_order = %s AND ppi.item_code = %s
            GROUP BY ppi.item_code
        """, (sales_order_name, item_code), as_dict=True)
        
        if production_data:
            data = production_data[0]
            planned_qty = data.get("planned_qty", 0)
            produced_qty = data.get("produced_qty", 0)
            pending_qty = planned_qty - produced_qty
            percentage = (produced_qty / planned_qty * 100) if planned_qty > 0 else 0
            
            return {
                "planned_qty": planned_qty,
                "produced_qty": produced_qty,
                "pending_qty": pending_qty,
                "percentage": round(percentage, 1)
            }
        else:
            return {"planned_qty": 0, "produced_qty": 0, "pending_qty": 0, "percentage": 0}
    except Exception as e:
        frappe.logger().error(f"Error getting item production data: {str(e)}")
        return {"planned_qty": 0, "produced_qty": 0, "pending_qty": 0, "percentage": 0}


def get_item_procurement_data(item_code, sales_order_name):
    """
    Get procurement data for a specific item
    """
    try:
        # Material Request data
        mr_data = frappe.db.sql("""
            SELECT 
                SUM(mri.qty) as requested_qty,
                SUM(mri.ordered_qty) as ordered_qty,
                SUM(mri.received_qty) as received_qty
            FROM `tabMaterial Request Item` mri
            JOIN `tabMaterial Request` mr ON mri.parent = mr.name
            WHERE mr.sales_order = %s AND mri.item_code = %s
        """, (sales_order_name, item_code), as_dict=True)
        
        # Purchase Order data
        po_data = frappe.db.sql("""
            SELECT 
                SUM(poi.qty) as ordered_qty,
                SUM(poi.received_qty) as received_qty,
                SUM(poi.billed_qty) as billed_qty
            FROM `tabPurchase Order Item` poi
            JOIN `tabPurchase Order` po ON poi.parent = po.name
            WHERE po.sales_order = %s AND poi.item_code = %s
        """, (sales_order_name, item_code), as_dict=True)
        
        # Purchase Receipt data
        pr_data = frappe.db.sql("""
            SELECT 
                SUM(pri.qty) as received_qty
            FROM `tabPurchase Receipt Item` pri
            JOIN `tabPurchase Receipt` pr ON pri.parent = pr.name
            WHERE pr.sales_order = %s AND pri.item_code = %s
        """, (sales_order_name, item_code), as_dict=True)
        
        # Purchase Invoice data
        pi_data = frappe.db.sql("""
            SELECT 
                SUM(pii.qty) as billed_qty
            FROM `tabPurchase Invoice Item` pii
            JOIN `tabPurchase Invoice` pi ON pii.parent = pi.name
            WHERE pi.sales_order = %s AND pii.item_code = %s
        """, (sales_order_name, item_code), as_dict=True)
        
        # Calculate totals
        requested_qty = mr_data[0].get("requested_qty", 0) if mr_data else 0
        po_ordered_qty = po_data[0].get("ordered_qty", 0) if po_data else 0
        pr_received_qty = pr_data[0].get("received_qty", 0) if pr_data else 0
        pi_billed_qty = pi_data[0].get("billed_qty", 0) if pi_data else 0
        
        # Calculate percentage based on the highest value
        max_qty = max(requested_qty, po_ordered_qty, pr_received_qty, pi_billed_qty)
        percentage = (pi_billed_qty / max_qty * 100) if max_qty > 0 else 0
        
        return {
            "requested_qty": requested_qty,
            "po_ordered_qty": po_ordered_qty,
            "pr_received_qty": pr_received_qty,
            "pi_billed_qty": pi_billed_qty,
            "percentage": round(percentage, 1)
        }
    except Exception as e:
        frappe.logger().error(f"Error getting item procurement data: {str(e)}")
        return {"requested_qty": 0, "po_ordered_qty": 0, "pr_received_qty": 0, "pi_billed_qty": 0, "percentage": 0}


def calculate_production_kpis(production_plans):
    """
    Calculate production KPIs
    """
    if not production_plans:
        return {
            "total_plans": 0,
            "completed_plans": 0,
            "in_progress_plans": 0,
            "total_planned_qty": 0,
            "total_produced_qty": 0,
            "overall_percentage": 0
        }
    
    total_plans = len(production_plans)
    completed_plans = len([p for p in production_plans if p.get("status") == "Completed"])
    in_progress_plans = len([p for p in production_plans if p.get("status") == "In Progress"])
    total_planned_qty = sum(p.get("total_planned_qty", 0) for p in production_plans)
    total_produced_qty = sum(p.get("total_produced_qty", 0) for p in production_plans)
    
    overall_percentage = (total_produced_qty / total_planned_qty * 100) if total_planned_qty > 0 else 0
    
    return {
        "total_plans": total_plans,
        "completed_plans": completed_plans,
        "in_progress_plans": in_progress_plans,
        "total_planned_qty": total_planned_qty,
        "total_produced_qty": total_produced_qty,
        "overall_percentage": round(overall_percentage, 1)
    }


def calculate_procurement_kpis(procurement_data):
    """
    Calculate procurement KPIs
    """
    material_requests = procurement_data.get("material_requests", [])
    purchase_orders = procurement_data.get("purchase_orders", [])
    purchase_receipts = procurement_data.get("purchase_receipts", [])
    purchase_invoices = procurement_data.get("purchase_invoices", [])
    
    # Calculate totals
    total_mr_qty = sum(mr.get("qty", 0) for mr in material_requests)
    total_po_qty = sum(po.get("qty", 0) for po in purchase_orders)
    total_pr_qty = sum(pr.get("qty", 0) for pr in purchase_receipts)
    total_pi_qty = sum(pi.get("qty", 0) for pi in purchase_invoices)
    
    # Calculate percentage based on the highest value
    max_qty = max(total_mr_qty, total_po_qty, total_pr_qty, total_pi_qty)
    overall_percentage = (total_pi_qty / max_qty * 100) if max_qty > 0 else 0
    
    return {
        "total_material_requests": len(material_requests),
        "total_purchase_orders": len(purchase_orders),
        "total_purchase_receipts": len(purchase_receipts),
        "total_purchase_invoices": len(purchase_invoices),
        "total_mr_qty": total_mr_qty,
        "total_po_qty": total_po_qty,
        "total_pr_qty": total_pr_qty,
        "total_pi_qty": total_pi_qty,
        "overall_percentage": round(overall_percentage, 1)
    }


@frappe.whitelist()
def get_last_sales_details_custom(item_code):
    """
    Get last sales details for an item
    """
    try:
        # Get last 5 sales orders for this item
        last_sales = frappe.db.sql("""
            SELECT 
                soi.parent as sales_order,
                so.customer,
                so.customer_name,
                so.transaction_date,
                soi.qty,
                soi.rate,
                soi.amount
            FROM `tabSales Order Item` soi
            JOIN `tabSales Order` so ON soi.parent = so.name
            WHERE soi.item_code = %s 
            AND so.docstatus = 1
            ORDER BY so.transaction_date DESC
            LIMIT 5
        """, (item_code,), as_dict=True)
        
        if not last_sales:
            return "No previous sales found for this item."
        
        html = """
        <div style="padding: 20px;">
            <h4 style="margin-bottom: 15px; color: #333;">Last Sales for {}</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Sales Order</th>
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Customer</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Date</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Qty</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Rate</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">Amount</th>
                    </tr>
                </thead>
                <tbody>
        """.format(item_code)
        
        for sale in last_sales:
            html += """
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
                        <a href="/app/sales-order/{}" target="_blank">{}</a>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">{}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">{}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">{}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">{}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e0e0e0;">{}</td>
                </tr>
            """.format(
                sale.sales_order, sale.sales_order,
                sale.customer_name or sale.customer,
                sale.transaction_date,
                sale.qty,
                sale.rate,
                sale.amount
            )
        
        html += """
                </tbody>
            </table>
        </div>
        """
        
        return html
        
    except Exception as e:
        frappe.logger().error(f"Error getting last sales details: {str(e)}")
        return f"Error retrieving last sales details: {str(e)}"


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
