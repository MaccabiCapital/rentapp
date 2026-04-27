'use server'

// ============================================================
// Photo upload / attach / detach server actions
// ============================================================
//
// Flow:
//   1. Client resizes + converts to WebP using canvas API
//   2. Client calls uploadPhoto with the resized File
//   3. Server generates a path, uploads to Storage, appends the
//      path to the entity's photos[] column
//   4. Server revalidates the page
//
// Detach removes the path from the array AND deletes the file
// from Storage so we don't accumulate orphans.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  PHOTO_BUCKET,
  buildPhotoPath,
  type PhotoEntityType,
} from '@/app/lib/storage/photos'
import type { ActionState } from '@/app/lib/types'

// Table name per entity type
const ENTITY_TABLES: Record<PhotoEntityType, string> = {
  units: 'units',
  maintenance: 'maintenance_requests',
  properties: 'properties',
  inspection_items: 'inspection_items',
}

// Revalidate paths per entity type so the UI refreshes after
// upload/delete. Takes the entity row so we can build the
// property-scoped paths.
function revalidateForEntity(
  entityType: PhotoEntityType,
  entityId: string,
  propertyId: string | null,
  parentId: string | null = null,
) {
  revalidatePath('/dashboard')
  if (entityType === 'properties') {
    revalidatePath('/dashboard/properties')
    revalidatePath(`/dashboard/properties/${entityId}`)
  } else if (entityType === 'units') {
    revalidatePath('/dashboard/properties')
    if (propertyId) {
      revalidatePath(`/dashboard/properties/${propertyId}`)
      revalidatePath(`/dashboard/properties/${propertyId}/units/${entityId}`)
    }
  } else if (entityType === 'maintenance') {
    revalidatePath('/dashboard/properties/maintenance')
    revalidatePath(`/dashboard/properties/maintenance/${entityId}`)
  } else if (entityType === 'inspection_items') {
    revalidatePath('/dashboard/properties/inspections')
    if (parentId) {
      revalidatePath(`/dashboard/properties/inspections/${parentId}`)
    }
  }
}

// Load the entity row and return its current photos[] + property_id
// (for revalidation paths) + parent_id (inspection_items → parent
// inspection, used for revalidation of the detail page).
async function loadEntity(
  entityType: PhotoEntityType,
  entityId: string,
): Promise<{
  photos: string[]
  property_id: string | null
  parent_id: string | null
} | null> {
  const supabase = await createServerClient()
  const table = ENTITY_TABLES[entityType]
  const selectCols =
    entityType === 'units'
      ? 'photos, property_id'
      : entityType === 'maintenance'
        ? 'photos, unit_id'
        : entityType === 'inspection_items'
          ? 'photos, inspection_id'
          : 'photos'
  const { data, error } = await supabase
    .from(table)
    .select(selectCols)
    .eq('id', entityId)
    .maybeSingle()
  if (error || !data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  let propertyId: string | null = null
  let parentId: string | null = null
  if (entityType === 'units') {
    propertyId = row.property_id ?? null
  } else if (entityType === 'maintenance') {
    // For maintenance we need to follow the unit → property chain
    if (row.unit_id) {
      const { data: unit } = await supabase
        .from('units')
        .select('property_id')
        .eq('id', row.unit_id)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      propertyId = (unit as any)?.property_id ?? null
    }
  } else if (entityType === 'inspection_items') {
    parentId = row.inspection_id ?? null
  }
  return {
    photos: row.photos ?? [],
    property_id: propertyId,
    parent_id: parentId,
  }
}

export async function uploadPhoto(
  entityType: PhotoEntityType,
  entityId: string,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get('photo')
  if (!(file instanceof File)) {
    return { success: false, message: 'No photo file provided.' }
  }
  if (file.size === 0) {
    return { success: false, message: 'The photo file is empty.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, message: 'Photo must be under 10MB.' }
  }
  if (!file.type.startsWith('image/')) {
    return { success: false, message: 'File must be an image.' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to upload photos.' }
  }

  const entity = await loadEntity(entityType, entityId)
  if (!entity) {
    return { success: false, message: 'Entity not found.' }
  }

  const path = buildPhotoPath(user.id, entityType, entityId, file.name)

  // Upload to Supabase Storage
  const { error: uploadErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadErr) {
    return {
      success: false,
      message: `Upload failed: ${uploadErr.message}`,
    }
  }

  // Append the path to the entity's photos[] column
  const newPhotos = [...entity.photos, path]
  const table = ENTITY_TABLES[entityType]
  const { error: updateErr } = await supabase
    .from(table)
    .update({ photos: newPhotos })
    .eq('id', entityId)

  if (updateErr) {
    // Roll back the storage upload so we don't orphan
    await supabase.storage.from(PHOTO_BUCKET).remove([path])
    return {
      success: false,
      message: `Failed to attach photo: ${updateErr.message}`,
    }
  }

  revalidateForEntity(entityType, entityId, entity.property_id, entity.parent_id)
  return { success: true }
}

export async function deletePhoto(
  entityType: PhotoEntityType,
  entityId: string,
  photoPath: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const entity = await loadEntity(entityType, entityId)
  if (!entity) {
    return { success: false, message: 'Entity not found.' }
  }

  // Remove the path from the array first
  const newPhotos = entity.photos.filter((p) => p !== photoPath)
  const table = ENTITY_TABLES[entityType]
  const { error: updateErr } = await supabase
    .from(table)
    .update({ photos: newPhotos })
    .eq('id', entityId)

  if (updateErr) {
    return {
      success: false,
      message: `Failed to detach photo: ${updateErr.message}`,
    }
  }

  // Only delete from Storage if it's an internal path (not an
  // external Unsplash URL from the demo seed)
  if (!photoPath.startsWith('http')) {
    const { error: removeErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([photoPath])
    // Don't fail the whole action if cleanup fails — the row
    // is already detached. Orphan file is a minor cost.
    if (removeErr) {
      console.error('Storage cleanup failed:', removeErr.message)
    }
  }

  revalidateForEntity(entityType, entityId, entity.property_id, entity.parent_id)
  return { success: true }
}
