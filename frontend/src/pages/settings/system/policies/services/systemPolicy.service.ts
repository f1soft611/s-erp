import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { PolicyHistory, PolicyPayload, PolicyUser, SystemPolicy } from '../types/systemPolicy.types';

const endpoint = '/api/v1/system/policies';
export async function getPolicies(): Promise<SystemPolicy[]> {
  return (await apiGet<{ resultList: SystemPolicy[] }>(endpoint)).resultList;
}
export async function createPolicy(payload: PolicyPayload): Promise<SystemPolicy> {
  return (await apiPost<{ item: SystemPolicy }>(endpoint, payload)).item;
}
export async function updatePolicy(id: number, payload: PolicyPayload & { version: number }): Promise<SystemPolicy> {
  return (await apiPut<{ item: SystemPolicy }>(`${endpoint}/${id}`, payload)).item;
}
export async function deletePolicy(id: number, version: number): Promise<void> {
  await apiDelete(`${endpoint}/${id}?version=${version}`);
}
export async function getPolicyHistory(id: number): Promise<PolicyHistory[]> {
  return (await apiGet<{ resultList: PolicyHistory[] }>(`${endpoint}/${id}/history`)).resultList;
}
export async function searchPolicyUsers(keyword: string): Promise<PolicyUser[]> {
  return (await apiGet<{ resultList: PolicyUser[] }>(`${endpoint}/users?keyword=${encodeURIComponent(keyword)}`)).resultList;
}
