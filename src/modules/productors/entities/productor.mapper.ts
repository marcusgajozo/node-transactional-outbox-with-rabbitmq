import type { Productor, ProductorRow } from './productor.entity.js';

export function toProductor(row: ProductorRow): Productor {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toProductorRow(productor: Productor): ProductorRow {
  return {
    id: productor.id,
    name: productor.name,
    created_at: productor.createdAt,
    updated_at: productor.updatedAt,
    deleted_at: productor.deletedAt,
  };
}
