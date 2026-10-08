// Framework-free canonical constraints, shared by partner API and admin writes.
export const STORE_CATEGORIES = ['Kirana & Grocery', 'Supermarket', 'Pharmacy', 'Bakery', 'Fruits & Vegetables', 'Hardware', 'Paint Shop', 'Steel & Vessels', 'General Store', 'Others'] as const;
export function validateStoreFields(patch: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (['name','category','district','address_line','manual_address','owner_name','city','state','country','phone','photo_url','open_time','close_time','pan_number','fssai_number','gst_number','shop_establishment_number','drug_license_number','udyam_number'].includes(key)) {
      if (value !== null && typeof value !== 'string') throw new Error(`${key} must be text.`);
      const text = typeof value === 'string' ? value.trim() : '';
      if (text.length > (key === 'photo_url' ? 2048 : 500)) throw new Error(`${key} is too long.`);
      if (['name','category','city','district','state','country'].includes(key) && !text) throw new Error(`${key} cannot be empty.`);
      if (key === 'category' && !STORE_CATEGORIES.some(category => category === text)) throw new Error('Choose a valid store category.');
      if (['open_time','close_time'].includes(key) && text && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(text)) throw new Error('Hours must use a valid 24-hour time.');
      if (key === 'phone' && text && !/^\+?[\d\s()-]{7,25}$/.test(text)) throw new Error('Enter a valid contact phone number.');
      if (key === 'pan_number' && text && !/^[A-Z]{5}\d{4}[A-Z]$/.test(text.toUpperCase())) throw new Error('PAN must be in the format ABCDE1234F.');
      if (key === 'fssai_number' && text && !/^\d{14}$/.test(text)) throw new Error('FSSAI license number must be exactly 14 digits.');
      if (key === 'photo_url' && text) {
        let url: URL; try { url = new URL(text); } catch { throw new Error('Enter a valid photo URL.'); }
        if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Photo URL must use HTTP or HTTPS without credentials.');
      }
    }
    if (['lat','lng','delivery_radius_km','avg_prep_minutes'].includes(key) && value !== null) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a finite number.`);
      if (key === 'lat' && (value < -90 || value > 90)) throw new Error('Latitude must be between -90 and 90.');
      if (key === 'lng' && (value < -180 || value > 180)) throw new Error('Longitude must be between -180 and 180.');
      if (key === 'delivery_radius_km' && (value <= 0 || value > 50)) throw new Error('Delivery radius must be above 0 and no more than 50 km.');
      if (key === 'avg_prep_minutes' && (!Number.isInteger(value) || value < 0 || value > 1440)) throw new Error('Preparation time must be a whole number from 0 to 1440.');
    }
    if (key === 'is_active' && typeof value !== 'boolean') throw new Error('is_active must be true or false.');
  }
}
export function validateStoreCoordinates(store: Record<string, unknown>): void {
  if ((store.lat == null) !== (store.lng == null)) throw new Error('Set both latitude and longitude, or clear both.');
}
