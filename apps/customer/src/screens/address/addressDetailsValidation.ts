interface AddressDetails {
  building: string;
  street: string;
  landmark: string;
  instructions: string;
  recipientName: string;
  recipientPhone: string;
  label: string;
}
export function addressDetailsReady(details: AddressDetails): boolean {
  const required = [
    [details.building, 150], [details.street, 140], [details.landmark, 200],
    [details.recipientName, 100], [details.label, 40],
  ] as const;
  return required.every(([value, limit]) => value.trim().length > 0 && value.length <= limit)
    && details.instructions.length <= 300
    && /^(?:\+91)?[6-9]\d{9}$/.test(details.recipientPhone.trim());
}
