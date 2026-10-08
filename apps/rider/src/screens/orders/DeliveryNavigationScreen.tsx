import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Call02Icon,
  InformationCircleIcon,
  Location01Icon,
  MapPinIcon,
  Navigation03Icon,
} from '@hugeicons/core-free-icons';

import { AppIcon } from '../../components/AppIcon';
import { CollectCashBanner } from '../../components/CollectCashBanner';
import { distanceKm, etaMinutes } from '../../utils/geo';
import { SlideToConfirmButton } from '../../components/SlideToConfirmButton';
import { colors, shadow } from '../../theme/tokens';
import { DeliveryMapView } from './components/DeliveryMapView';
import { openNavigation } from '../../location/openNavigation';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import type { Coordinates } from '../../location/riderLocation';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'DeliveryNavigation'
>;

export function DeliveryNavigationScreen({
  route,
  navigation,
}: Props) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();

  /*
   * ---------------------------------------------------------
   * STORE
   * ---------------------------------------------------------
   */

  const activeOrders = useRiderOrdersStore(
    (state) => state.activeOrders
  );

  const advanceOrderStatus = useRiderOrdersStore(
    (state) => state.advanceOrderStatus
  );

  const order = activeOrders.find(
    (item) => item.id === orderId
  );

  /*
   * ---------------------------------------------------------
   * STATE
   * ---------------------------------------------------------
   */

  const [riderCoords, setRiderCoords] =
    useState<Coordinates | null>(null);

  const [arriving, setArriving] =
    useState(false);

  const [routeInfo, setRouteInfo] =
    useState<{
      durationMin: number | null;
      distanceKm: number | null;
    } | null>(null);

  /*
   * ---------------------------------------------------------
   * ORDER NOT FOUND
   * ---------------------------------------------------------
   */

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base font-semibold text-ink">
          This order is no longer active.
        </Text>

        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-4"
        >
          <Text className="text-[14px] font-bold text-ink/60">
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * ---------------------------------------------------------
   * ROUTE INFO
   * ---------------------------------------------------------
   *
   * Rider -> customer. The routed Google distance/ETA from the map when
   * available, else the straight-line estimate from the live GPS fix.
   * "Locating…" until the first fix, never a made-up figure. A drop with no
   * pin (0,0) has no distance to show.
   */

  const hasDropPin =
    order.customerCoords.latitude !== 0 ||
    order.customerCoords.longitude !== 0;

  const straightKm =
    riderCoords && hasDropPin
      ? distanceKm(riderCoords, order.customerCoords)
      : null;

  const km = routeInfo?.distanceKm ?? straightKm;

  const eta =
    routeInfo?.durationMin ??
    (km != null ? etaMinutes(km) : null);

  const hasRouteInfo = km != null && eta != null;
  const distanceText = km != null ? `${km} km` : '';
  const durationText = eta != null ? `${eta} min` : '';

  /*
   * ---------------------------------------------------------
   * TRIP LEGS
   * ---------------------------------------------------------
   */

  const tripLegs = order.tripId
    ? activeOrders.filter(
        (item) => item.tripId === order.tripId
      )
    : [order];

  /*
   * ---------------------------------------------------------
   * CALL CUSTOMER
   * ---------------------------------------------------------
   */

  const callCustomer = () => {
    if (!order.customerPhone) {
      Alert.alert(
        'No phone number',
        'This customer has no phone number on the order.'
      );
      return;
    }

    void Linking.openURL(
      `tel:${order.customerPhone}`
    );
  };

  /*
   * ---------------------------------------------------------
   * ARRIVED AT CUSTOMER
   * ---------------------------------------------------------
   */

  const arrived = async () => {
    if (arriving) return;

    setArriving(true);

    try {
      await Promise.all(
        tripLegs.map((leg) =>
          advanceOrderStatus(leg.id)
        )
      );

      navigation.replace(
        'DeliveryProof',
        {
          orderId,
        }
      );
    } catch (error) {
      setArriving(false);

      Alert.alert(
        'Could not update this order',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <View className="flex-1 bg-ink">

      {/* =====================================================
          MAP
      ====================================================== */}

      <DeliveryMapView
        destination={order.customerCoords}
        destinationKind="customer"
        fullScreen
        onRiderMove={setRiderCoords}
        onRouteInfo={setRouteInfo}
      />

      {/* =====================================================
          BACK
      ====================================================== */}

      <Pressable
        onPress={() => navigation.goBack()}
        style={[
          {
            top: insets.top + 12,
          },
          shadow.chip,
        ]}
        className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-white"
      >
        <AppIcon
          icon={ArrowLeft01Icon}
          size={22}
          color={colors.ink}
        />
      </Pressable>

      {/* =====================================================
          DISTANCE / ETA
      ====================================================== */}

      <View
        style={[
          {
            top: insets.top + 12,
          },
          shadow.chip,
        ]}
        className="absolute left-[68px] h-11 flex-row items-center rounded-full bg-white px-4"
      >
        <AppIcon
          icon={Navigation03Icon}
          size={18}
          color={colors.ink}
        />

        {hasRouteInfo ? (
          <View className="ml-2 flex-row items-center">

            <Text className="text-[14px] font-semibold text-ink tabular-nums">
              {distanceText}
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-ink/30" />

            <Text className="text-[14px] font-semibold text-ink/60 tabular-nums">
              {durationText}
            </Text>

          </View>
        ) : (
          <Text className="ml-2 text-[14px] font-medium text-ink/50">
            Locating…
          </Text>
        )}
      </View>

      {/* =====================================================
          DELIVERY BOTTOM SHEET
      ====================================================== */}

      <View
        style={[
          {
            paddingBottom: insets.bottom + 20,
          },
          shadow.sheet,
        ]}
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pt-5"
      >

        {/* =================================================
            CUSTOMER HEADER
        ================================================== */}

        <View className="mb-4 flex-row items-center justify-between">

          <View className="flex-1 pr-3">

            <Text className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
              Deliver to
            </Text>

            <Text
              className="mt-0.5 text-[21px] font-semibold text-ink"
              numberOfLines={1}
            >
              {order.customerName}
            </Text>

          </View>

          {/* MAP BUTTON */}

          <Pressable
            onPress={() =>
              openNavigation(
                order.customerCoords,
                order.customerName
              )
            }
            className="h-11 flex-row items-center justify-center gap-1 rounded-full bg-[#F1F2F4] px-4"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text className="text-[14px] font-semibold text-ink">
              Map
            </Text>

            <AppIcon
              icon={ArrowRight01Icon}
              size={18}
              color={colors.ink}
            />
          </Pressable>

        </View>

        {/* Cash on delivery: amount for the whole order/trip. */}

        <View className="mb-3">
          <CollectCashBanner
            paymentMethod={order.paymentMethod}
            cashToCollect={order.cashToCollect}
          />
        </View>

        {/* =================================================
            DELIVERY DETAILS CARD
        ================================================== */}

        <View className="rounded-2xl bg-[#F1F2F4] px-4 py-4">

          {/* ADDRESS */}

          <View className="flex-row items-start gap-3">

            <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
              <AppIcon
                icon={Location01Icon}
                size={18}
                color={colors.ink}
              />
            </View>

            <View className="flex-1">

              <Text className="text-[11.5px] font-medium text-ink/45">
                Delivery address
              </Text>

              <Text className="mt-0.5 text-[14px] font-semibold leading-5 text-ink">
                {order.customerAddress || 'Address not provided'}
              </Text>

            </View>

          </View>

          {/* LANDMARK — only when the customer gave one */}

          {order.landmark ? (
          <View className="mt-3 flex-row items-start gap-3 border-t border-ink/10 pt-3">

            <View className="h-9 w-9 items-center justify-center">
              <AppIcon
                icon={MapPinIcon}
                size={18}
                color={colors.ink}
              />
            </View>

            <View className="flex-1">

              <Text className="text-[11.5px] font-medium text-ink/45">
                Landmark
              </Text>

              <Text className="mt-0.5 text-[13.5px] font-medium leading-5 text-ink/70">
                {order.landmark}
              </Text>

            </View>

          </View>
          ) : null}

          {/* DELIVERY INSTRUCTIONS — the customer's own note, if any */}

          {order.deliveryNote ? (
          <View className="mt-3 flex-row items-start gap-3 border-t border-ink/10 pt-3">

            <View className="h-9 w-9 items-center justify-center">
              <AppIcon
                icon={InformationCircleIcon}
                size={18}
                color={colors.ink}
              />
            </View>

            <View className="flex-1">

              <Text className="text-[11.5px] font-medium text-ink/45">
                Delivery instructions
              </Text>

              <Text className="mt-0.5 text-[13.5px] font-medium leading-5 text-ink/70">
                {order.deliveryNote}
              </Text>

            </View>

          </View>
          ) : null}

        </View>

        {/* =================================================
            CALL CUSTOMER
        ================================================== */}

        <Pressable
          onPress={callCustomer}
          disabled={arriving}
          className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-[#F1F2F4]"
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <AppIcon
            icon={Call02Icon}
            size={18}
            color={colors.ink}
          />

          <Text className="text-[14px] font-semibold text-ink">
            Call customer
          </Text>

        </Pressable>

        {/* =================================================
            ARRIVED
        ================================================== */}

        <View className="mt-4">

          <SlideToConfirmButton
            label={
              arriving
                ? 'Confirming…'
                : "Slide — I've arrived"
            }
            successLabel="Arrived"
            onConfirm={arrived}
            disabled={arriving}
          />

        </View>

      </View>

    </View>
  );
}