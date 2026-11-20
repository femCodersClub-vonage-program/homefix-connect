import { expectTypeOf, test } from 'vitest';

import type { components } from './generated/openapi.js';
import type { IncidentDetailData, Role, UserRole } from './incidents.js';
import type { VideoTokenResponse } from './video.js';

type Schemas = components['schemas'];

test('IncidentDetailData es el schema Incident generado', () => {
  expectTypeOf<IncidentDetailData>().toEqualTypeOf<Schemas['Incident']>();
});

test('VideoTokenResponse es el schema generado', () => {
  expectTypeOf<VideoTokenResponse>().toEqualTypeOf<
    Schemas['VideoTokenResponse']
  >();
});

test('UserRole excluye MANAGER', () => {
  expectTypeOf<UserRole>().toEqualTypeOf<'TENANT' | 'TECHNICIAN'>();
});

test('Role incluye MANAGER', () => {
  expectTypeOf<Role>().toEqualTypeOf<'TENANT' | 'TECHNICIAN' | 'MANAGER'>();
});
