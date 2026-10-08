import { expect, it } from 'vitest';
import { parseStorePatch, validateMergedStore } from '../../../apps/admin/src/features/store-management/storePatch';
import { changedStoreFields } from '../../../apps/admin/src/features/store-management/storeDraft';
it('maps all editable store details and photo removal to existing database columns', () => {
  const patch = parseStorePatch({ name:' New store ', ownerName:' New owner ', photoUrl:null, addressLine:'New address', manualAddress:'Near bus stand',
    city:'Kaup',district:'Udupi',state:'Karnataka',country:'India',category:'Kirana & Grocery',phone:'+91 9876543210',
    openTime:'06:00',closeTime:'23:00',lat:13.2,lng:74.7,deliveryRadiusKm:15,avgPrepMinutes:12,isActive:false,
    fssaiNumber:'12345678901234',panNumber:'ABCDE1234F',
    shopEstablishmentNumber:'record',gstNumber:'record',drugLicenseNumber:'record',udyamNumber:'record' });
  expect(patch).toMatchObject({name:'New store',owner_name:'New owner',photo_url:null,manual_address:'Near bus stand',is_active:false,avg_prep_minutes:12,udyam_number:'record'});
  expect(Object.keys(patch)).toHaveLength(24);
});
it('rejects hidden database writes, malformed types, bad coordinates, hours and unsafe images', () => {
  for (const value of [null,[],{}, {owner_user_id:'other-owner'},{payout_details_status:'verified'}, {rating:5}, {isActive:'true'},
    {lat:NaN},{lng:181},{lat:-91},{avgPrepMinutes:1.5},{deliveryRadiusKm:0},{category:'unknown'}, {name:''},
    {openTime:'25:00'}, {photoUrl:'javascript:alert(1)'},{photoUrl:'https://user:password@host/photo.png'},
    // Legacy fields payouts never read are no longer editable.
    {aadhaarLast4:'1234'}, {bankAccountLast4:'5678'}, {bankName:'Bank'}, {turnoverExceedsGstThreshold:true}, {phone:'not a number'}]) expect(()=>parseStorePatch(value)).toThrow();
});
it('requires paired coordinates', () => {
  expect(()=>validateMergedStore({lat:13,lng:74},{lat:null})).toThrow('both latitude');
  expect(()=>validateMergedStore({lat:13,lng:74},{lat:null,lng:null})).not.toThrow();
});
it('sends only edited fields and converts blank numeric overrides to null', () => {
  expect(changedStoreFields({name:'Old',photoUrl:'new',lat:'',avgPrepMinutes:'15'},{name:'Old',photoUrl:'old',lat:'13',avgPrepMinutes:'10'}))
    .toEqual({photoUrl:'new',lat:null,avgPrepMinutes:15});
  expect(changedStoreFields({name:'Same'},{name:'Same'})).toEqual({});
});

import { editableStoreTime } from '../../../apps/admin/src/features/store-management/storeTime';
it('edits legacy opening-hour labels correctly without losing midnight or noon', () => {
  expect(editableStoreTime('5:40 AM')).toBe('05:40');
  expect(editableStoreTime('9:30 PM')).toBe('21:30');
  expect(editableStoreTime('12:00 am')).toBe('00:00');
  expect(editableStoreTime('12:00 PM')).toBe('12:00');
  expect(editableStoreTime('05:40:00')).toBe('05:40');
});
it('requires a pharmacy licence when switching to pharmacy', () => {
  expect(() => validateMergedStore({ category: 'Others' }, { category: 'Pharmacy' })).toThrow('drug licence');
  expect(() => validateMergedStore({}, { category: 'Pharmacy', drug_license_number: 'licence' })).not.toThrow();
});
