export interface OrderIdBody {
  // Exactly one of orderId (POST /orders) / tripId (POST /trips, a
  // multi-store checkout) is set. A trip's payment is recorded on the trip
  // AND cascaded onto every child order (settle_checkout_payment), so nothing
  // downstream needs to know trips exist to answer "is this order paid".
  orderId?: string;
  tripId?: string;
}
