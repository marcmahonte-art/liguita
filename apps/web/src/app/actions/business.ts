'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { runMatchingForFound } from '../../lib/matching/run';
import { parseCsvObjects } from '../../lib/business/csv';

export interface BusinessMembership {
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'READONLY';
  locationId: string | null;
}

export interface BusinessLocation {
  id: string;
  name: string;
  citySlug: string;
  address: string | null;
  isActive: boolean;
}

export interface BusinessOrganization {
  id: string;
  name: string;
  slug: string;
  sector: string | null;
  isVerified: boolean;
}

export interface BusinessDashboard {
  organization: BusinessOrganization;
  membership: BusinessMembership;
  locations: BusinessLocation[];
  counts: {
    total: number;
    pending: number;
    matches: number;
    returned: number;
  };
}

export interface BusinessInventoryItem {
  id: string;
  publicRef: string | null;
  title: string;
  categoryCode: string;
  itemTypeCode: string;
  citySlug: string;
  placeLabel: string;
  status: string;
  locationId: string | null;
  locationName: string | null;
  building: string | null;
  floor: string | null;
  storageZone: string | null;
  cabinet: string | null;
  locker: string | null;
  internalRef: string | null;
  internalNotes: string | null;
  isPublic: boolean;
  canManagePhotos: boolean;
  qrCode: string | null;
  createdAt: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function membershipFor(
  userId: string,
  organizationId: string,
): Promise<BusinessMembership | null> {
  const service = tryCreateServiceClient();
  if (!service) return null;
  const { data: global } = await service
    .from('organization_users')
    .select('organization_id, role, location_id, accepted_at')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .is('location_id', null)
    .maybeSingle();
  const { data: scoped } = global
    ? { data: global }
    : await service
        .from('organization_users')
        .select('organization_id, role, location_id, accepted_at')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .not('location_id', 'is', null)
        .limit(1)
        .maybeSingle();
  if (!scoped?.accepted_at) return null;
  return {
    organizationId: scoped.organization_id,
    role: scoped.role,
    locationId: scoped.location_id,
  };
}

export async function listMyBusinessMemberships(): Promise<BusinessMembership[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];
  const { data } = await supabase
    .from('organization_users')
    .select('organization_id, role, location_id, accepted_at')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null);
  return (data ?? []).map((row) => ({
    organizationId: row.organization_id,
    role: row.role,
    locationId: row.location_id,
  }));
}

export async function createOrganization(
  name: string,
  sector: string,
  citySlug: string,
): Promise<{ organizationId?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_sector: sector,
    p_city_slug: citySlug,
  });
  if (error || !data) return { error: error?.message ?? 'Création impossible.' };
  revalidatePath('/business');
  return { organizationId: data as string };
}

export async function createBusinessLocation(
  organizationId: string,
  name: string,
  citySlug: string,
  address: string,
): Promise<{ locationId?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const { data, error } = await supabase.rpc('create_organization_location', {
    p_organization_id: organizationId,
    p_name: name,
    p_city_slug: citySlug,
    p_address: address,
  });
  if (error || !data) return { error: error?.message ?? 'Création impossible.' };
  revalidatePath('/business/sites');
  return { locationId: data as string };
}

export async function getBusinessDashboard(
  organizationId?: string,
): Promise<{ dashboard: BusinessDashboard | null; error?: string }> {
  const { user } = await requireUser();
  if (!user) return { dashboard: null, error: 'Non connecté' };
  const memberships = await listMyBusinessMemberships();
  const selected =
    memberships.find((item) => item.organizationId === organizationId) ?? memberships[0];
  if (!selected) return { dashboard: null, error: 'Aucune organisation.' };
  const membership = await membershipFor(user.id, selected.organizationId);
  const service = tryCreateServiceClient();
  if (!membership || !service) return { dashboard: null, error: 'Accès refusé.' };

  const [{ data: organization }, { data: locations }, { data: items }] = await Promise.all([
    service
      .from('organizations')
      .select('id, name, slug, sector, is_verified')
      .eq('id', membership.organizationId)
      .maybeSingle(),
    service
      .from('organization_locations')
      .select('id, name, city_slug, address, is_active')
      .eq('organization_id', membership.organizationId)
      .eq('is_active', true)
      .order('name'),
    service
      .from('found_items')
      .select('id, status, location_id')
      .eq('organization_id', membership.organizationId),
  ]);
  if (!organization) return { dashboard: null, error: 'Organisation introuvable.' };
  const visibleLocations = membership.locationId
    ? (locations ?? []).filter((location) => location.id === membership.locationId)
    : (locations ?? []);
  const visibleLocationIds = visibleLocations.map((location) => location.id);
  const visibleItems = (items ?? []).filter(
    (item) => !item.location_id || visibleLocationIds.includes(item.location_id),
  );
  const { data: matches } = visibleItems.length
    ? await service
        .from('matches')
        .select('id, status')
        .in(
          'found_item_id',
          visibleItems.map((item) => item.id),
        )
    : { data: [] as Array<{ id: string; status: string }> };
  return {
    dashboard: {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        sector: organization.sector,
        isVerified: organization.is_verified,
      },
      membership,
      locations: visibleLocations.map((location) => ({
        id: location.id,
        name: location.name,
        citySlug: location.city_slug,
        address: location.address,
        isActive: location.is_active,
      })),
      counts: {
        total: visibleItems.length,
        pending: visibleItems.filter((item) =>
          ['FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE'].includes(item.status),
        ).length,
        matches: (matches ?? []).length,
        returned: visibleItems.filter((item) => item.status === 'RETURNED').length,
      },
    },
  };
}

export async function listBusinessInventory(
  organizationId: string,
  locationId?: string,
  status?: string,
  search?: string,
): Promise<{ items: BusinessInventoryItem[]; error?: string }> {
  const { user } = await requireUser();
  if (!user) return { items: [], error: 'Non connecté' };
  const membership = await membershipFor(user.id, organizationId);
  const service = tryCreateServiceClient();
  if (!membership || !service) return { items: [], error: 'Accès refusé.' };
  if (membership.role === 'READONLY') return { items: [], error: 'Accès en lecture seule.' };
  if (membership.locationId && locationId && membership.locationId !== locationId)
    return { items: [], error: 'Site non autorisé.' };
  const effectiveLocation = locationId ?? membership.locationId ?? undefined;
  let query = service
    .from('found_items')
    .select(
      'id, public_ref, title, category_code, item_type_code, city_slug, place_label, status, location_id, building, floor, storage_zone, cabinet, locker, internal_ref, internal_notes, is_public, qr_code, created_at',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (effectiveLocation) query = query.eq('location_id', effectiveLocation);
  if (status) query = query.eq('status', status as never);
  if (search?.trim()) query = query.ilike('title', `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) return { items: [], error: error.message };
  const { data: locations } = await service
    .from('organization_locations')
    .select('id, name')
    .eq('organization_id', organizationId);
  const locationById = new Map((locations ?? []).map((location) => [location.id, location.name]));
  return {
    items: (data ?? []).map((item) => ({
      id: item.id,
      publicRef: item.public_ref,
      title: item.title,
      categoryCode: item.category_code,
      itemTypeCode: item.item_type_code,
      citySlug: item.city_slug,
      placeLabel: item.place_label,
      status: item.status,
      locationId: item.location_id,
      locationName: item.location_id ? (locationById.get(item.location_id) ?? null) : null,
      building: item.building,
      floor: item.floor,
      storageZone: item.storage_zone,
      cabinet: item.cabinet,
      locker: item.locker,
      internalRef: item.internal_ref,
      internalNotes: item.internal_notes,
       isPublic: item.is_public,
       canManagePhotos: ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role),
       qrCode: item.qr_code,
      createdAt: item.created_at,
    })),
  };
}

export async function generateBusinessQr(id: string): Promise<{ qrCode?: string; error?: string }> {
  const { user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const service = tryCreateServiceClient();
  if (!service) return { error: 'Service indisponible.' };
  const { data: row } = await service
    .from('found_items')
    .select('id, organization_id, location_id, qr_code')
    .eq('id', id)
    .maybeSingle();
  if (!row?.organization_id) return { error: 'Objet introuvable.' };
  const membership = await membershipFor(user.id, row.organization_id);
  if (!membership || (membership.locationId && membership.locationId !== row.location_id))
    return { error: 'Accès refusé.' };
  const qrCode = row.qr_code ?? crypto.randomUUID();
  const { error } = await service.from('found_items').update({ qr_code: qrCode }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/business/objets/${id}`);
  return { qrCode };
}

export async function getBusinessInventoryItem(
  id: string,
): Promise<{ item: BusinessInventoryItem | null; error?: string }> {
  const { user } = await requireUser();
  if (!user) return { item: null, error: 'Non connecté' };
  const service = tryCreateServiceClient();
  if (!service) return { item: null, error: 'Service indisponible.' };
  const { data: row } = await service
    .from('found_items')
    .select(
      'id, organization_id, location_id, public_ref, title, category_code, item_type_code, city_slug, place_label, status, building, floor, storage_zone, cabinet, locker, internal_ref, internal_notes, is_public, qr_code, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!row?.organization_id) return { item: null, error: 'Objet introuvable.' };
  const membership = await membershipFor(user.id, row.organization_id);
  if (!membership || (membership.locationId && membership.locationId !== row.location_id))
    return { item: null, error: 'Accès refusé.' };
  const { data: locations } = await service
    .from('organization_locations')
    .select('id, name')
    .eq('id', row.location_id ?? '')
    .maybeSingle();
  return {
    item: {
      id: row.id,
      publicRef: row.public_ref,
      title: row.title,
      categoryCode: row.category_code,
      itemTypeCode: row.item_type_code,
      citySlug: row.city_slug,
      placeLabel: row.place_label,
      status: row.status,
      locationId: row.location_id,
      locationName: locations?.name ?? null,
      building: row.building,
      floor: row.floor,
      storageZone: row.storage_zone,
      cabinet: row.cabinet,
      locker: row.locker,
      internalRef: row.internal_ref,
      internalNotes: row.internal_notes,
       isPublic: row.is_public,
       canManagePhotos: ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role),
       qrCode: row.qr_code,
      createdAt: row.created_at,
    },
  };
}

export async function createBusinessInventoryItem(input: {
  organizationId: string;
  locationId: string;
  categoryCode: string;
  itemTypeCode: string;
  title: string;
  citySlug: string;
  placeLabel: string;
  description?: string;
  building?: string;
  floor?: string;
  storageZone?: string;
  cabinet?: string;
  locker?: string;
  internalRef?: string;
  internalNotes?: string;
}): Promise<{ itemId?: string; error?: string }> {
  const { user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const membership = await membershipFor(user.id, input.organizationId);
  if (
    !membership ||
    membership.role === 'READONLY' ||
    (membership.locationId && membership.locationId !== input.locationId)
  ) {
    return { error: 'Accès refusé.' };
  }
  if (
    !input.title.trim() ||
    !input.categoryCode ||
    !input.itemTypeCode ||
    !input.citySlug ||
    !input.placeLabel.trim()
  ) {
    return { error: 'Les informations de l’objet sont obligatoires.' };
  }
  const service = tryCreateServiceClient();
  if (!service) return { error: 'Service indisponible.' };
  const { data, error } = await service
    .from('found_items')
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId,
      created_by: user.id,
      public_ref: `LG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      category_code: input.categoryCode,
      item_type_code: input.itemTypeCode,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      city_slug: input.citySlug,
      place_label: input.placeLabel.trim(),
      found_at: new Date().toISOString(),
      status: 'IN_INVENTORY',
      building: input.building?.trim() || null,
      floor: input.floor?.trim() || null,
      storage_zone: input.storageZone?.trim() || null,
      cabinet: input.cabinet?.trim() || null,
      locker: input.locker?.trim() || null,
      internal_ref: input.internalRef?.trim() || null,
      internal_notes: input.internalNotes?.trim() || null,
      is_public: false,
    })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Enregistrement impossible.' };
  await runMatchingForFound(service, data.id);
  revalidatePath('/business');
  revalidatePath('/business/objets');
  return { itemId: data.id };
}

export async function acceptBusinessInvitation(
  token: string,
): Promise<{ organizationId?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const { data, error } = await supabase.rpc('accept_organization_invitation', { p_token: token });
  if (error || !data) return { error: error?.message ?? 'Invitation invalide.' };
  revalidatePath('/business');
  return { organizationId: data as string };
}

export async function importBusinessInventoryCsv(
  organizationId: string,
  locationId: string,
  text: string,
): Promise<{ imported: number; errors: string[] }> {
  if (text.length > 1_000_000)
    return { imported: 0, errors: ['Fichier trop volumineux (1 Mo maximum).'] };
  const { user } = await requireUser();
  if (!user) return { imported: 0, errors: ['Non connecté.'] };
  const membership = await membershipFor(user.id, organizationId);
  if (
    !membership ||
    membership.role === 'READONLY' ||
    (membership.locationId && membership.locationId !== locationId)
  ) {
    return { imported: 0, errors: ['Accès refusé.'] };
  }
  let rows: Record<string, string>[];
  try {
    rows = parseCsvObjects(text);
  } catch (error) {
    return { imported: 0, errors: [error instanceof Error ? error.message : 'CSV invalide.'] };
  }
  if (rows.length === 0) return { imported: 0, errors: ['CSV vide.'] };
  if (rows.length > 100) return { imported: 0, errors: ['Maximum 100 lignes par import.'] };
  const errors: string[] = [];
  let imported = 0;
  for (const [index, row] of rows.entries()) {
    const title = row.title?.trim() ?? '';
    const categoryCode = row.categorycode ?? row.category_code ?? '';
    const itemTypeCode = row.itemtypecode ?? row.item_type_code ?? '';
    const citySlug = row.cityslug ?? row.city_slug ?? '';
    const placeLabel = row.placelabel ?? row.place_label ?? '';
    if (!title || !categoryCode || !itemTypeCode || !citySlug || !placeLabel) {
      errors.push(`Ligne ${index + 2}: champs obligatoires manquants.`);
      continue;
    }
    const result = await createBusinessInventoryItem({
      organizationId,
      locationId,
      categoryCode,
      itemTypeCode,
      title,
      citySlug,
      placeLabel,
      description: row.description,
      building: row.building,
      floor: row.floor,
      storageZone: row.storagezone ?? row.storage_zone,
      cabinet: row.cabinet,
      locker: row.locker,
      internalRef: row.internalref ?? row.internal_ref,
      internalNotes: row.internalnotes ?? row.internal_notes,
    });
    if (result.error) errors.push(`Ligne ${index + 2}: ${result.error}`);
    else imported += 1;
  }
  revalidatePath('/business/objets');
  return { imported, errors };
}

export async function inviteBusinessMember(
  organizationId: string,
  email: string,
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'READONLY',
  locationId?: string,
): Promise<{ token?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const { data, error } = await supabase.rpc('invite_organization_member', {
    p_organization_id: organizationId,
    p_email: email,
    p_role: role,
    p_location_id: locationId ?? null,
  });
  if (error || !data) return { error: error?.message ?? 'Invitation impossible.' };
  revalidatePath('/business/equipe');
  return { token: data as string };
}
