import { Fragment, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { IconlyRefreshLeft, IconlyBike } from '../icons/ProductServiceIcons';
import { IconlyHeadphone } from '../icons/iconly';
import { IconlyClose } from '../icons/IconlyClose';
import { useDeliveryEstimateMinutes } from '../../api/deliverySettings';
import { useCopy } from '../../api/appConfig';

const SERVICES = [
  { id: 'refund', heading: '6 Hours', label: 'Refund*', Icon: IconlyRefreshLeft },
  { id: 'delivery', heading: 'Fast', label: 'Delivery', Icon: IconlyBike },
  { id: 'support', heading: '24/7', label: 'Support', Icon: IconlyHeadphone },
] as const;
type Service = typeof SERVICES[number]['id'];

export function ProductServiceHighlights() {
  const [open, setOpen] = useState<Service | null>(null);
  const minutes = useDeliveryEstimateMinutes();
  const supportHours = useCopy('support.hours.text');
  const details = {
    refund: { title: '6-hour refund requests', message: 'Received a damaged, spoiled or wrong item? Report it from Help on your order within 6 hours of delivery for a refund review. Approved refunds follow your payment provider’s processing time.' },
    delivery: { title: 'Fast delivery', message: `The current delivery estimate is ${minutes} minutes. Your checkout shows the estimate for your selected location. Pre-orders follow the delivery slot you choose.` },
    support: { title: '24/7 support requests', message: `You can send a request from Help on your order at any time.${supportHours ? ` Our team’s response hours: ${supportHours}` : ' Our team will respond as soon as available.'}` },
  };
  const detail = open ? details[open] : null;

  return <>
    <View className="flex-row items-center rounded-3xl bg-white py-2.5">
      {SERVICES.map(({ id, heading, label, Icon }, index) => <Fragment key={id}>
        {index > 0 && <View className="h-12 w-px bg-[#F0F0F3]" />}
        <Pressable accessibilityRole="button" accessibilityLabel={`${heading} ${label.replace('*', '')}, read details`}
          onPress={() => setOpen(id)} className="flex-1 items-center gap-1 px-1 py-0.5 active:opacity-60">
          <Icon size={27} color="#444444" />
          <View className="mt-1 items-center">
            <Text className="text-[14px] font-bold leading-[18px] text-[#676970]">{heading}</Text>
            <Text className="text-[13px] font-medium leading-[18px] text-[#8B8D94]">{label}</Text>
          </View>
        </Pressable>
      </Fragment>)}
    </View>
    <Modal visible={detail != null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(null)}>
      <Pressable accessibilityLabel="Close details" onPress={() => setOpen(null)} className="flex-1 items-center justify-center bg-black/40 px-8">
        <Pressable onPress={() => {}} className="w-full rounded-3xl bg-white p-6">
          <Text accessibilityRole="header" className="pr-8 text-[17px] font-semibold text-ink">{detail?.title}</Text>
          <Text className="mt-2 text-[14px] leading-[21px] text-ink/70">{detail?.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(null)} hitSlop={10} className="absolute right-4 top-4 h-8 w-8 items-center justify-center">
            <IconlyClose size={22} color="#101C10" />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
