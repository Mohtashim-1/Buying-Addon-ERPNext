// ========== FEATURE 1: SUPPLIER PROTECTION LOGIC ==========
// This file handles supplier protection when production plan items exist
// To enable: Uncomment this file in hooks.py

frappe.ui.form.on('Purchase Order', {
	refresh(frm) {
		// Make supplier field editable if document is in draft status
		if (frm.doc.docstatus === 0 && frm.fields_dict.supplier) {
			frm.set_df_property("supplier", "read_only", 0);
		}
		
		// Store supplier to prevent reset from production plan
		if (frm.doc.docstatus === 0 && frm.doc.supplier) {
			if (!frm._user_supplier) {
				frm._user_supplier = frm.doc.supplier;
			}
		}
		
		// Clear existing supplier watcher
		if (frm._supplier_watcher) {
			clearInterval(frm._supplier_watcher);
			frm._supplier_watcher = null;
		}
		
		// Start continuous watcher to prevent supplier reset
		if (frm.doc.docstatus === 0 && frm.doc.supplier && frm.fields_dict.supplier) {
			// Initialize _user_supplier if not set
			if (!frm._user_supplier) {
				frm._user_supplier = frm.doc.supplier;
			}
			
			// Clear existing watcher first
			if (frm._supplier_watcher) {
				clearInterval(frm._supplier_watcher);
			}
			
			// Prevent infinite loop - track last restored supplier
			if (!frm._last_restored_supplier) {
				frm._last_restored_supplier = null;
			}
			
			frm._supplier_watcher = setInterval(() => {
				// Only restore if supplier changed AND it's different from what we just restored
				if (frm.doc.supplier !== frm._user_supplier && 
					frm._user_supplier && 
					frm.doc.docstatus === 0 &&
					frm.doc.supplier !== frm._last_restored_supplier) {
					
					console.log(`[PO DEBUG] ⚠️ Watcher: Supplier reset detected!`);
					console.log(`[PO DEBUG] Current: ${frm.doc.supplier}, Expected: ${frm._user_supplier}`);
					console.log(`[PO DEBUG] Restoring supplier to: ${frm._user_supplier}`);
					
					// Mark that we're restoring
					frm._last_restored_supplier = frm._user_supplier;
					frm._restoring_supplier = true;
					
					// Direct assignment + refresh to prevent loop
					frm.doc.supplier = frm._user_supplier;
					frm.refresh_field('supplier');
					
					// Also use set_value for proper form update
					frm.set_value('supplier', frm._user_supplier).then(() => {
						// Update stored value
						frm._user_supplier = frm._user_supplier;
						// Clear restoring flag after a delay
						setTimeout(() => {
							frm._restoring_supplier = false;
							// Reset last restored after a delay to allow new changes
							setTimeout(() => {
								if (frm.doc.supplier === frm._user_supplier) {
									frm._last_restored_supplier = null;
								}
							}, 500);
						}, 200);
						
						if (frm.fields_dict.supplier) {
							frm.set_df_property("supplier", "read_only", 0);
						}
					});
				}
			}, 300); // Check every 300ms
		}
	},
	
	// Supplier handler - store user's supplier choice
	supplier: function(frm) {
		if (frm.doc.docstatus === 0 && frm.doc.supplier && frm.fields_dict.supplier) {
			// Don't update if we're currently restoring supplier (prevent loop)
			if (frm._restoring_supplier) {
				console.log(`[PO DEBUG] Supplier handler: Skipping - currently restoring`);
				return;
			}
			
			// Store user's supplier choice - this is the authoritative value
			console.log(`[PO DEBUG] Supplier handler: User changed supplier to: ${frm.doc.supplier}`);
			frm._user_supplier = frm.doc.supplier;
			frm._last_restored_supplier = null; // Reset to allow new changes
			
			// Ensure supplier field remains editable
			frm.set_df_property("supplier", "read_only", 0);
		}
	},
	
	// Items handler - prevent supplier reset when items change
	items: function(frm) {
		if (frm.doc.docstatus === 0 && frm.doc.supplier && frm.fields_dict.supplier) {
			// Store the supplier that user wants to keep (use stored value if available)
			const current_supplier = frm._user_supplier || frm.doc.supplier;
			frm._user_supplier = current_supplier;
			console.log(`[PO DEBUG] Items handler: Preserved supplier: ${current_supplier}`);
			
			// Mark that we're monitoring supplier changes
			if (!frm._monitoring_supplier) {
				frm._monitoring_supplier = true;
				
				// Watch for supplier changes multiple times with increasing delays
				[50, 100, 200, 500, 1000, 2000].forEach(delay => {
					setTimeout(() => {
						if (frm.doc.supplier !== current_supplier && 
							current_supplier && 
							frm.doc.docstatus === 0 &&
							!frm._restoring_supplier) {
							console.log(`[PO DEBUG] ⚠️ Items handler: Supplier reset detected after ${delay}ms!`);
							console.log(`[PO DEBUG] Current: ${frm.doc.supplier}, Expected: ${current_supplier}`);
							console.log(`[PO DEBUG] Restoring supplier to: ${current_supplier}`);
							
							// Mark that we're restoring
							frm._restoring_supplier = true;
							frm._last_restored_supplier = current_supplier;
							
							// Supplier was reset - restore it
							frm.doc.supplier = current_supplier;
							frm.refresh_field('supplier');
							frm.set_value('supplier', current_supplier).then(() => {
								// Update stored value
								frm._user_supplier = current_supplier;
								setTimeout(() => {
									frm._restoring_supplier = false;
								}, 200);
							});
						}
						// Always ensure field is editable
						if (frm.fields_dict.supplier) {
							frm.set_df_property("supplier", "read_only", 0);
						}
					}, delay);
				});
				
				// Clear monitoring flag after 3 seconds
				setTimeout(() => {
					frm._monitoring_supplier = false;
				}, 3000);
			}
		}
	},
});

