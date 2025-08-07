# Material Request Status Dashboard

This module adds a comprehensive dashboard to the Material Request doctype, providing real-time KPIs and progress tracking for the entire procurement lifecycle.

## Features

### 1. Custom Status Dashboard Field
- Added a new HTML field `custom_status` to the Material Request form
- Displays real-time dashboard with comprehensive KPIs and progress tracking
- Automatically updates when the form is refreshed or items are modified
- Shows complete procurement lifecycle from request to billing

### 2. Dashboard Components

#### KPI Cards
- **Total Requested**: Total quantity requested across all items
- **Total Ordered**: Total quantity ordered through Purchase Orders
- **Total Received**: Total quantity received across all items
- **Total Billed**: Total quantity billed through Purchase Invoices

#### Purchase Order Status Card
- **PO Creation Status**: Shows whether Purchase Orders have been created
- **PO Count**: Number of Purchase Orders created from this MR
- **Total PO Amount**: Total value of all Purchase Orders
- **Status Indicators**: Draft POs, Submitted POs, or No POs

#### Progress Bars
- **Ordered Progress**: Visual progress bar showing ordered vs pending quantities
- **Received Progress**: Visual progress bar showing received vs pending quantities
- **Billed Progress**: Visual progress bar showing billed vs pending quantities
- Color-coded progress indicators (green for completed, orange for partial, red for pending)

#### Items Breakdown Table
- Detailed table showing each item's progress through the entire lifecycle
- Columns: Item Code, Item Name, Requested Qty, Ordered Qty, Received Qty, Billed Qty
- Individual progress bars for Ordered %, Received %, and Billed % for each item
- Color-coded progress indicators for each metric

#### Status Information
- Dynamic status determination based on document state and progress
- Color-coded status indicators
- Status messages explaining current state

### 3. Status Logic

The dashboard automatically determines the Material Request status based on:
- **Draft**: Document is in draft status
- **Cancelled**: Document has been cancelled
- **Stopped**: Material Request has been stopped
- **Completed**: All items ordered, received and billed (100%)
- **To Bill**: All items ordered and received, pending billing
- **To Receive**: All items ordered, pending receipt
- **Partially Ordered**: Some items ordered, pending completion
- **Pending Order**: No items ordered yet

### 4. Technical Implementation

#### Python Functions
- `get_material_request_status_dashboard()`: Main function to get comprehensive dashboard data
- `get_billed_quantity_for_item()`: Calculates billed quantity from linked Purchase Orders
- `get_po_creation_status()`: Determines PO creation status and details
- `get_mr_detailed_status_info()`: Determines status and styling information
- `get_material_request_summary()`: Quick summary function for basic status
- Error handling for non-existent documents

#### JavaScript Functions
- `load_mr_status_dashboard()`: Loads dashboard data from server
- `render_mr_status_dashboard()`: Renders dashboard HTML
- `create_mr_status_dashboard_html()`: Creates the dashboard HTML structure
- `show_material_request_dashboard()`: Shows dashboard in a dialog
- Automatic refresh on form load and item updates

### 5. Comprehensive KPI Tracking

#### Request Lifecycle Tracking
- **Requested Quantities**: Original quantities requested in Material Request
- **Ordered Quantities**: Quantities ordered through Purchase Orders
- **Received Quantities**: Quantities received through Purchase Receipts
- **Billed Quantities**: Quantities billed through Purchase Invoices
- **Pending Quantities**: Remaining quantities to be ordered/received/billed

#### Purchase Order Integration
- **PO Creation Status**: Whether Purchase Orders have been created
- **PO Count**: Number of Purchase Orders linked to this MR
- **PO Amount**: Total value of all Purchase Orders
- **PO Status**: Draft vs Submitted Purchase Orders

#### Progress Calculations
- **Ordered Progress**: (Total Ordered / Total Requested) × 100
- **Received Progress**: (Total Received / Total Requested) × 100
- **Billed Progress**: (Total Billed / Total Requested) × 100
- **Item-level Progress**: Individual progress for each item

### 6. Usage

1. **View Dashboard**: The dashboard automatically appears in the `custom_status` field when viewing a submitted Material Request
2. **Real-time Updates**: Dashboard updates automatically when items are modified or linked documents change
3. **Responsive Design**: Dashboard adapts to different screen sizes
4. **Error Handling**: Graceful handling of missing data or errors
5. **Dialog View**: Click "Request Dashboard" button to view in a popup dialog

### 7. Customization

The dashboard can be customized by:
- Modifying the `create_mr_status_dashboard_html()` function for different layouts
- Adjusting colors and styling in the HTML template
- Adding additional KPIs in the Python data collection
- Extending the status logic in `get_mr_detailed_status_info()`
- Adding new progress metrics or calculations

### 8. Dependencies

- Requires the `custom_status` HTML field to be added to Material Request doctype
- Uses standard Frappe/ERPNext Material Request functionality
- Integrates with Purchase Order, Purchase Receipt, and Purchase Invoice workflows
- Compatible with existing Material Request workflows

## Installation

1. The custom field `custom_status` is automatically added to Material Request
2. The Python and JavaScript functions are included in the module
3. No additional configuration required
4. Dashboard appears automatically for submitted Material Requests

## Data Sources

The dashboard pulls data from:
- **Material Request**: Basic information, items, status
- **Purchase Order**: Ordered quantities, linked POs, PO status
- **Purchase Receipt**: Received quantities
- **Purchase Invoice**: Billed quantities and amounts

## Troubleshooting

- **Dashboard not showing**: Ensure the Material Request is submitted (docstatus = 1)
- **No data**: Check if the Material Request has items and valid quantities
- **Styling issues**: Verify the custom field is properly configured as HTML type
- **Performance**: Dashboard loads asynchronously to avoid blocking the UI
- **Missing PO data**: Ensure Purchase Orders are properly linked to Material Request
- **Billing calculations**: Verify Purchase Invoices are linked to correct Purchase Orders

## Reporting Features

### KPI Summary
- Total requested vs ordered vs received vs billed quantities
- Overall progress percentages across all items
- PO creation and status tracking
- Item-level detailed progress

### Progress Tracking
- Visual progress bars for ordered, received, and billed quantities
- Color-coded indicators (green=complete, orange=partial, red=pending)
- Individual item progress tracking
- Real-time status updates

### Status Monitoring
- Dynamic status determination based on progress
- Clear status messages explaining current state
- PO creation status and details
- Error handling for missing or invalid data 