import frappe
from frappe.model.document import Document
from frappe.utils import get_url, flt


@frappe.whitelist()
def get_material_request_status_dashboard(material_request_name):
    """
    Get comprehensive dashboard data for Material Request including:
    - MR Status and progress
    - PO creation status
    - Pending, received, and billed quantities
    - Items breakdown with detailed progress
    """
    try:
        mr = frappe.get_doc("Material Request", material_request_name)
    except frappe.DoesNotExistError:
        return None
    except Exception as e:
        frappe.log_error(f"Error getting Material Request {material_request_name}: {str(e)}")
        return None
    
    try:
        # Calculate KPIs
        total_requested = 0
        total_ordered = 0
        total_received = 0
        total_billed = 0
        total_pending = 0
        
        # Get items data with detailed tracking
        items_data = []
        
        for item in mr.items:
            try:
                requested_qty = item.qty or 0
                ordered_qty = item.ordered_qty or 0
                received_qty = item.received_qty or 0
                billed_qty = 0
                
                # Calculate billed quantity from linked Purchase Orders
                billed_qty = get_billed_quantity_for_item(material_request_name, item.item_code)
                
                # Calculate pending quantity
                pending_qty = max(0, requested_qty - ordered_qty)
                
                total_requested += requested_qty
                total_ordered += ordered_qty
                total_received += received_qty
                total_billed += billed_qty
                total_pending += pending_qty
                
                # Calculate percentages
                ordered_percentage = (ordered_qty / requested_qty * 100) if requested_qty > 0 else 0
                received_percentage = (received_qty / requested_qty * 100) if requested_qty > 0 else 0
                billed_percentage = (billed_qty / requested_qty * 100) if requested_qty > 0 else 0
                
                items_data.append({
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "requested_qty": requested_qty,
                    "ordered_qty": ordered_qty,
                    "received_qty": received_qty,
                    "billed_qty": round(billed_qty, 2),
                    "pending_qty": pending_qty,
                    "ordered_percentage": round(ordered_percentage, 1),
                    "received_percentage": round(received_percentage, 1),
                    "billed_percentage": round(billed_percentage, 1),
                    "rate": item.rate,
                    "amount": item.amount
                })
            except Exception as e:
                frappe.log_error(f"Error processing item {item.item_code} in MR {material_request_name}: {str(e)}")
                continue
        
        # Overall percentages
        overall_ordered_percentage = (total_ordered / total_requested * 100) if total_requested > 0 else 0
        overall_received_percentage = (total_received / total_requested * 100) if total_requested > 0 else 0
        overall_billed_percentage = (total_billed / total_requested * 100) if total_requested > 0 else 0
        
        # Ensure percentages don't exceed 100%
        overall_ordered_percentage = min(overall_ordered_percentage, 100)
        overall_received_percentage = min(overall_received_percentage, 100)
        overall_billed_percentage = min(overall_billed_percentage, 100)
        
        # Get PO creation status
        po_status = get_po_creation_status(material_request_name)
        
        # Get status information
        status_info = get_mr_detailed_status_info(mr, overall_ordered_percentage, overall_received_percentage, overall_billed_percentage)
        
        return {
            "mr_name": mr.name,
            "title": mr.title,
            "material_request_type": mr.material_request_type,
            "customer": mr.customer,
            "customer_name": getattr(mr, "customer_name", None),
            "transaction_date": mr.transaction_date,
            "schedule_date": mr.schedule_date,
            "status": mr.status,
            "docstatus": mr.docstatus,
            "transfer_status": mr.transfer_status,
            "per_ordered": mr.per_ordered,
            "per_received": mr.per_received,
            "total_requested": total_requested,
            "total_ordered": total_ordered,
            "total_received": total_received,
            "total_billed": round(total_billed, 2),
            "total_pending": total_pending,
            "overall_ordered_percentage": round(overall_ordered_percentage, 1),
            "overall_received_percentage": round(overall_received_percentage, 1),
            "overall_billed_percentage": round(overall_billed_percentage, 1),
            "items_data": items_data,
            "po_status": po_status,
            "status_info": status_info
        }
    except Exception as e:
        frappe.log_error(f"Error in get_material_request_status_dashboard for {material_request_name}: {str(e)}")
        return None


def get_billed_quantity_for_item(material_request_name, item_code):
    """
    Calculate billed quantity for a specific item from linked Purchase Orders
    """
    try:
        billed_qty = 0
        
        # Get Purchase Orders linked to this Material Request
        po_list = frappe.get_all(
            "Purchase Order",
            filters={
                "docstatus": 1,
                "material_request": material_request_name
            },
            fields=["name"]
        )
        
        for po in po_list:
            try:
                po_doc = frappe.get_doc("Purchase Order", po.name)
                for po_item in po_doc.items:
                    if po_item.item_code == item_code:
                        # Calculate billed quantity from billed amount and rate
                        billed_amt = po_item.billed_amt or 0
                        rate = po_item.rate or 0
                        if rate and rate > 0:
                            billed_qty += billed_amt / rate
            except Exception as e:
                frappe.log_error(f"Error processing PO {po.name} for item {item_code}: {str(e)}")
                continue
        
        return billed_qty
    except Exception as e:
        frappe.log_error(f"Error in get_billed_quantity_for_item for MR {material_request_name}, item {item_code}: {str(e)}")
        return 0


def get_po_creation_status(material_request_name):
    """
    Get PO creation status and details
    """
    try:
        # Check if any Purchase Orders are created from this MR
        po_list = frappe.get_all(
            "Purchase Order",
            filters={
                "docstatus": ["in", [0, 1]],
                "material_request": material_request_name
            },
            fields=["name", "status", "docstatus", "total"]
        )
        
        if not po_list:
            return {
                "status": "No PO Created",
                "status_color": "red",
                "message": "No Purchase Orders created from this Material Request",
                "po_count": 0,
                "total_amount": 0
            }
        
        # Calculate total PO amount
        total_amount = sum(po.total or 0 for po in po_list)
        
        # Determine overall PO status
        draft_pos = [po for po in po_list if po.docstatus == 0]
        submitted_pos = [po for po in po_list if po.docstatus == 1]
        
        if draft_pos and not submitted_pos:
            status = "Draft POs Only"
            status_color = "orange"
            message = f"{len(draft_pos)} draft Purchase Order(s) created"
        elif submitted_pos:
            status = "POs Created"
            status_color = "green"
            message = f"{len(submitted_pos)} submitted Purchase Order(s) created"
        else:
            status = "Mixed Status"
            status_color = "blue"
            message = f"{len(draft_pos)} draft and {len(submitted_pos)} submitted Purchase Order(s)"
        
        return {
            "status": status,
            "status_color": status_color,
            "message": message,
            "po_count": len(po_list),
            "total_amount": total_amount,
            "draft_count": len(draft_pos),
            "submitted_count": len(submitted_pos)
        }
    except Exception as e:
        frappe.log_error(f"Error in get_po_creation_status for MR {material_request_name}: {str(e)}")
        return {
            "status": "Error",
            "status_color": "red",
            "message": "Error retrieving PO status",
            "po_count": 0,
            "total_amount": 0
        }


def get_mr_detailed_status_info(mr, ordered_percentage, received_percentage, billed_percentage):
    """
    Get detailed status information for the Material Request dashboard
    """
    try:
        status_info = {
            "status": mr.status,
            "status_color": "gray",
            "progress_color": "#1976d2",
            "message": ""
        }
        
        if mr.docstatus == 0:
            status_info.update({
                "status": "Draft",
                "status_color": "gray",
                "message": "Material Request is in draft status"
            })
        elif mr.docstatus == 2:
            status_info.update({
                "status": "Cancelled",
                "status_color": "red",
                "message": "Material Request has been cancelled"
            })
        elif mr.status == "Stopped":
            status_info.update({
                "status": "Stopped",
                "status_color": "red",
                "message": "Material Request has been stopped"
            })
        elif ordered_percentage >= 100 and received_percentage >= 100 and billed_percentage >= 100:
            status_info.update({
                "status": "Completed",
                "status_color": "green",
                "progress_color": "#2e7d32",
                "message": "All items ordered, received and billed"
            })
        elif ordered_percentage >= 100 and received_percentage >= 100:
            status_info.update({
                "status": "To Bill",
                "status_color": "orange",
                "progress_color": "#f57c00",
                "message": "All items ordered and received, pending billing"
            })
        elif ordered_percentage >= 100:
            status_info.update({
                "status": "To Receive",
                "status_color": "blue",
                "progress_color": "#1976d2",
                "message": "All items ordered, pending receipt"
            })
        elif ordered_percentage > 0:
            status_info.update({
                "status": "Partially Ordered",
                "status_color": "orange",
                "progress_color": "#f57c00",
                "message": "Some items ordered, pending completion"
            })
        else:
            status_info.update({
                "status": "Pending Order",
                "status_color": "red",
                "message": "No items ordered yet"
            })
        
        return status_info
    except Exception as e:
        frappe.log_error(f"Error in get_mr_detailed_status_info for MR {mr.name}: {str(e)}")
        return {
            "status": "Error",
            "status_color": "red",
            "progress_color": "#d32f2f",
            "message": "Error determining status"
        }


@frappe.whitelist()
def get_material_request_summary(material_request_name):
    """
    Get a quick summary of Material Request status
    """
    try:
        mr = frappe.get_doc("Material Request", material_request_name)
    except frappe.DoesNotExistError:
        return None
    
    # Get basic counts
    total_items = len(mr.items)
    ordered_items = sum(1 for item in mr.items if item.ordered_qty and item.ordered_qty > 0)
    received_items = sum(1 for item in mr.items if item.received_qty and item.received_qty > 0)
    
    # Get PO count
    po_count = frappe.db.count("Purchase Order", {
        "material_request": material_request_name,
        "docstatus": ["in", [0, 1]]
    })
    
    return {
        "total_items": total_items,
        "ordered_items": ordered_items,
        "received_items": received_items,
        "po_count": po_count,
        "status": mr.status,
        "per_ordered": mr.per_ordered,
        "per_received": mr.per_received
    } 