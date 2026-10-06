export const User = {
  id: null,
  email: '',
  full_name: '',
  role: '',
  created_at: '',
  updated_at: '',
}

export const Product = {
  id: null,
  name: '',
  description: '',
  part_number: '',
  customer_id: null,
  created_at: '',
  updated_at: '',
}

export const Assembly = {
  id: null,
  product_id: null,
  name: '',
  description: '',
  created_at: '',
  updated_at: '',
}

export const SubAssembly = {
  id: null,
  assembly_id: null,
  name: '',
  description: '',
  created_at: '',
  updated_at: '',
}

export const Part = {
  id: null,
  subassembly_id: null,
  name: '',
  description: '',
  part_number: '',
  material: '',
  weight: null,
  dimensions: '',
  created_at: '',
  updated_at: '',
}

export const Document = {
  id: null,
  part_id: null,
  file_name: '',
  file_type: '',
  file_size: null,
  upload_date: '',
  storage_path: '',
  document_type: '',
}

export const ProcessPlan = {
  id: null,
  part_id: null,
  name: '',
  description: '',
  created_at: '',
  updated_at: '',
}

export const Operation = {
  id: null,
  process_plan_id: null,
  name: '',
  description: '',
  sequence_number: null,
  machine_id: null,
  setup_time: null,
  cycle_time: null,
  created_at: '',
  updated_at: '',
}

export const WorkCenter = {
  id: null,
  name: '',
  description: '',
  location: '',
  created_at: '',
  updated_at: '',
}

export const Machine = {
  id: null,
  work_center_id: null,
  name: '',
  description: '',
  machine_type: '',
  manufacturer: '',
  model: '',
  capacity: null,
  status: '',
  created_at: '',
  updated_at: '',
}

export const Customer = {
  id: null,
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  created_at: '',
  updated_at: '',
}

export const MHRParameters = {
  machine_id: null,
  labor_cost_per_hour: null,
  overhead_rate: null,
  energy_cost_per_hour: null,
  maintenance_cost_per_hour: null,
  depreciation_per_hour: null,
}

export const MHRResult = {
  machine_id: null,
  mhr_value: null,
  calculated_at: '',
  parameters: {},
}

export const CostEstimationRequest = {
  product_id: null,
  quantity: null,
  additional_costs: null,
  include_overhead: true,
}

export const CostEstimationResult = {
  product_id: null,
  calculation_id: null,
  total_cost: null,
  material_cost: null,
  labor_cost: null,
  overhead_cost: null,
  operation_costs: [],
  part_costs: [],
  breakdown: {},
  calculated_at: '',
}
