# Purchase Order Status Dashboard

This module adds a comprehensive dashboard to the Purchase Order doctype, similar to the interview feedback dashboard in HRMS.

## Features

### 1. Custom Order Status Field
- Added a new HTML field `custom_order_status` to the Purchase Order form
- Displays real-time dashboard with KPIs and progress tracking
- Automatically updates when the form is refreshed or items are modified

### 2. Dashboard Components

#### KPI Cards
- **Total Ordered**: Total quantity ordered across all items
- **Total Received**: Total quantity received across all items  
- **Total Billed**: Total quantity billed across all items
- **Total Amount**: Total purchase order amount

#### Progress Bars
- **Received Progress**: Visual progress bar showing received vs pending quantities
- **Billing Progress**: Visual progress bar showing billed vs pending quantities
- Color-coded progress indicators (green for completed, orange for partial, red for pending)

#### Items Breakdown Table
- Detailed table showing each item's progress
- Columns: Item Code, Item Name, Ordered Qty, Received Qty, Billed Qty, Received %, Billed %
- Individual progress bars for each item

#### Status Information
- Dynamic status determination based on document state and progress
- Color-coded status indicators
- Status messages explaining current state

### 3. Status Logic

The dashboard automatically determines the order status based on:
- **Draft**: Document is in draft status
- **Cancelled**: Document has been cancelled
- **Completed**: All items received and billed (100%)
- **To Bill**: All items received, pending billing
- **To Receive and Bill**: Items pending both receipt and billing
- **On Hold**: Purchase order is on hold
- **In Progress**: General in-progress state

### 4. Technical Implementation

#### Python Functions
- `get_purchase_order_status_dashboard()`: Main function to get dashboard data
- `get_detailed_status_info()`: Determines status and styling information
- Error handling for non-existent documents

#### JavaScript Functions
- `load_order_status_dashboard()`: Loads dashboard data from server
- `render_order_status_dashboard()`: Renders dashboard HTML
- `create_order_status_dashboard_html()`: Creates the dashboard HTML structure
- Automatic refresh on form load and item updates

### 5. Usage

1. **View Dashboard**: The dashboard automatically appears in the `custom_order_status` field when viewing a submitted Purchase Order
2. **Real-time Updates**: Dashboard updates automatically when items are modified
3. **Responsive Design**: Dashboard adapts to different screen sizes
4. **Error Handling**: Graceful handling of missing data or errors

### 6. Customization

The dashboard can be customized by:
- Modifying the `create_order_status_dashboard_html()` function for different layouts
- Adjusting colors and styling in the HTML template
- Adding additional KPIs in the Python data collection
- Extending the status logic in `get_detailed_status_info()`

### 7. Dependencies

- Requires the `custom_order_status` HTML field to be added to Purchase Order doctype
- Uses standard Frappe/ERPNext Purchase Order functionality
- Compatible with existing Purchase Order workflows

## Installation

1. The custom field `custom_order_status` is automatically added to Purchase Order
2. The Python and JavaScript functions are included in the module
3. No additional configuration required
4. Dashboard appears automatically for submitted Purchase Orders

## Troubleshooting

- **Dashboard not showing**: Ensure the Purchase Order is submitted (docstatus = 1)
- **No data**: Check if the Purchase Order has items and valid quantities
- **Styling issues**: Verify the custom field is properly configured as HTML type
- **Performance**: Dashboard loads asynchronously to avoid blocking the UI 