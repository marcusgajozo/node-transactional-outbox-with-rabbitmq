import { toProductor, toProductorRow } from './productor.mapper.js';
import type { ProductorRow } from './productor.entity.js';

describe('productor mapper', () => {
  const row: ProductorRow = {
    id: '0192f5a0-0000-7000-8000-000000000001',
    name: 'Acme',
    created_at: new Date('2026-10-30T12:00:00.000Z'),
    updated_at: new Date('2026-10-30T13:00:00.000Z'),
    deleted_at: null,
  };

  it('maps a row to a productor', () => {
    expect(toProductor(row)).toEqual({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  });

  it('round-trips a row through the domain type', () => {
    expect(toProductorRow(toProductor(row))).toEqual(row);
  });

  it('round-trips a soft-deleted row', () => {
    const deletedRow: ProductorRow = {
      ...row,
      deleted_at: new Date('2026-10-31T09:00:00.000Z'),
    };

    expect(toProductorRow(toProductor(deletedRow))).toEqual(deletedRow);
  });
});
