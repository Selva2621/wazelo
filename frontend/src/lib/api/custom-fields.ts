import apiClient from "./client";

export interface CustomFieldDefinition {
  id: string;
  orgId: string;
  entity: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  options: string[] | null;
  isRequired: boolean;
  defaultValue: string | null;
  sortOrder: number;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  entityId: string;
  value: string;
  field: { fieldName: string; fieldLabel: string; fieldType: string; options: string[] | null };
}

// Definitions
export async function listFieldDefinitions(entity?: string): Promise<CustomFieldDefinition[]> {
  const { data } = await apiClient.get("/custom-fields/definitions", { params: { entity } });
  return data;
}

export async function createFieldDefinition(req: {
  entity: string; fieldName: string; fieldLabel: string; fieldType: string;
  options?: string[]; isRequired?: boolean; defaultValue?: string;
}): Promise<CustomFieldDefinition> {
  const { data } = await apiClient.post("/custom-fields/definitions", req);
  return data;
}

export async function updateFieldDefinition(id: string, req: Partial<{
  fieldLabel: string; options: string[] | null; isRequired: boolean; defaultValue: string | null; sortOrder: number;
}>): Promise<CustomFieldDefinition> {
  const { data } = await apiClient.patch(`/custom-fields/definitions/${id}`, req);
  return data;
}

export async function deleteFieldDefinition(id: string): Promise<void> {
  await apiClient.delete(`/custom-fields/definitions/${id}`);
}

// Values
export async function getFieldValues(entityId: string): Promise<CustomFieldValue[]> {
  const { data } = await apiClient.get(`/custom-fields/values/${entityId}`);
  return data;
}

export async function setFieldValues(entityId: string, values: { fieldId: string; value: string }[]): Promise<void> {
  await apiClient.post(`/custom-fields/values/${entityId}`, { values });
}
