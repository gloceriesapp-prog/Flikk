// Store-partner help contacts (GET /app-config/support/partner, edited on admin "App
// settings") and partner support tickets (/staff-support, answered from the
// admin Support inbox). The logic lives in @gloceries/shared's support module,
// shared with apps/rider.
import { createStaffSupportApi } from '@gloceries/shared';
import { apiRequest } from './client';

export const supportApi = createStaffSupportApi(apiRequest, 'partner');
