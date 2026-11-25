from erpnext.stock.doctype.material_request.material_request import MaterialRequest


class CustomMaterialRequest(MaterialRequest):
	def validate_material_request_type(self):
		"""Keep Customer for Purchase MRs (linked via custom Sales Order).

		Standard ERPNext clears customer unless type is Customer Provided.
		SAH uses Customer + custom_sales_order on Purchase Material Requests.
		"""
		return
