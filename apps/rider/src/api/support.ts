// Rider help contacts (GET /app-config/support/rider, edited on admin "App
// settings") and rider support tickets (/staff-support, answered from the
// admin Support inbox). The logic lives in @gloceries/shared's support module,
// shared with apps/partner.
import { createStaffSupportApi } from '@gloceries/shared';
import { apiRequest } from './client';

export const supportApi = createStaffSupportApi(apiRequest, 'rider');
