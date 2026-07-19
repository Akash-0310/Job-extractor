'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, qs } from '@/lib/api-client';
import type { DashboardStats, Paginated, RecipientFilters, SyncProgress } from '@/types';

// ---- Dashboard ------------------------------------------------------------

export interface DashboardResponse {
  stats: DashboardStats;
  topCompanies: { id: string; name: string; domain: string; recipients: number }[];
  monthly: { month: string; count: number }[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardResponse>('/api/stats'),
    refetchInterval: 15_000,
  });
}

// ---- Recipients -----------------------------------------------------------

export interface RecipientRow {
  id: string;
  email: string;
  sentCount: number;
  firstSentAt: string;
  lastSentAt: string;
  latestSubject: string | null;
  company: { id: string; name: string; domain: string } | null;
  latestTemplate: { id: string; name: string } | null;
}

export function useRecipients(filters: RecipientFilters) {
  return useQuery({
    queryKey: ['recipients', filters],
    queryFn: () => apiGet<Paginated<RecipientRow>>(`/api/recipients${qs(filters as Record<string, unknown>)}`),
  });
}

export interface RecipientDetail {
  recipient: RecipientRow & { latestBodyText: string | null; latestBodyHtml: string | null };
  history: {
    id: string;
    subject: string | null;
    sentAt: string;
    template: { id: string; name: string } | null;
  }[];
}

export function useRecipientDetail(id: string | null) {
  return useQuery({
    queryKey: ['recipient', id],
    queryFn: () => apiGet<RecipientDetail>(`/api/recipients/${id}`),
    enabled: Boolean(id),
  });
}

// ---- Companies ------------------------------------------------------------

export interface CompanyRow {
  id: string;
  name: string;
  domain: string;
  recipients: number;
  messages: number;
  createdAt: string;
}

export function useCompanies(params: { q?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => apiGet<Paginated<CompanyRow>>(`/api/companies${qs(params)}`),
  });
}

// ---- Templates ------------------------------------------------------------

export interface TemplateRow {
  id: string;
  name: string;
  emailCount: number;
  recipients: number;
  sampleSubject: string | null;
  sampleBodyText: string | null;
  createdAt: string;
}

export function useTemplates(params: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: () => apiGet<Paginated<TemplateRow>>(`/api/templates${qs(params)}`),
  });
}

export function useRenameTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiSend(`/api/templates/${id}`, 'PATCH', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

// ---- Settings -------------------------------------------------------------

export interface Settings {
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  syncIntervalMinutes: number;
  batchSize: number;
  maxEmails: number;
  exportDir: string;
  autoSyncEnabled: boolean;
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => apiGet<Settings>('/api/settings') });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Settings>) => apiSend<Settings>('/api/settings', 'PATCH', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

// ---- Sync -----------------------------------------------------------------

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: () => apiGet<SyncProgress>('/api/sync'),
    refetchInterval: (query) =>
      query.state.data?.status === 'RUNNING' ? 2_000 : 10_000,
  });
}

export function useStartSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: 'full' | 'incremental' | 'auto' = 'auto') =>
      apiSend<{ enqueued: boolean }>('/api/sync', 'POST', { mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sync-status'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
