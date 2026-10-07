# Admin store editing

Open **Stores → Edit store**. The editor groups the 28 existing editable business fields into profile, address/delivery, hours/availability, business documents and bank record. Upload, replace or remove the storefront profile photo, or supply a hosted image URL. Edits are drafts until Save changes / Save store succeeds. Discard restores the last successful save. Uploading and saving disable conflicting actions; repeated submit events are guarded synchronously.

`storeDraft.ts` maps the server DTO into inputs and submits only changed fields. `storeTime.ts` handles legacy 12-hour labels as well as database 24-hour values. `storePatch.ts` is the shared client/server allow-list and validation boundary. The PATCH route validates the existing merged record and returns the persisted DTO. The customer and partner apps read this same stores table.

Photo upload uses the existing store-images bucket: JPG/PNG/WebP, max 5 MB, decoded pixel cap 40 million, normalized WebP and at most 800×800. A failed upload keeps the old photo and displays a retryable error. Save publishes the uploaded URL. Discarded uploads may leave an unused storage object; the editor never deletes an old image still referenced elsewhere.

Store writes and uploads repeat founder authorization inside the server route, in addition to dashboard middleware. Unknown fields are rejected rather than written through. Database IDs, owner login identity, ratings and payout verification status are managed by their dedicated workflows; profile editing does not falsify a verified payout destination. The bank section edits business-record bank name and account last four digits, not the live payout account.

No migration is needed. Tests live in backend/src/lib/adminStoreEditing.test.ts. Production photo upload still requires the existing store-images Storage bucket and its service-role credentials.
