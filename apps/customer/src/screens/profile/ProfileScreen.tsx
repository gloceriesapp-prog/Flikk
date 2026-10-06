import {
  useEffect,
  useState,
  type ComponentProps,
} from 'react';

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CreditCardIcon,
  CustomerService01Icon,
  InformationCircleIcon,
  Location05Icon,
  LockIcon,
  Logout03Icon,
  Notification03Icon,
  Share08Icon,
  StarIcon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons';

import { StatusBar } from 'expo-status-bar';

import {
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppIcon } from '../../components/AppIcon';
import { BrandFooter } from '../../components/BrandFooter';

import { useAuthStore } from '../../store/useAuthStore';

import { AccountDetailsCard } from './components/AccountDetailsCard';
import { ProfileActionsBento } from './components/ProfileActionsBento';
import { RateUsModal } from './components/RateUsModal';

import { useProfile } from './useProfile';

import type { AppStackParamList } from '../../navigation/types';

type Props =
  NativeStackScreenProps<
    AppStackParamList,
    'Profile'
  >;

type ProfileIcon =
  ComponentProps<typeof AppIcon>['icon'];

interface MenuRowProps {
  icon: ProfileIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  trailingText?: string;
  selector?: boolean;
  showChevron?: boolean;
  showDivider?: boolean;
}

function MenuRow({
  icon,
  label,
  onPress,
  disabled = false,
  trailingText,
  selector = false,
  showChevron = true,
  showDivider = true,
}: MenuRowProps) {
  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className={`
          flex-row
          items-center
          px-4
          py-3
          active:bg-[#FAFAFA]
          ${disabled
            ? 'opacity-50'
            : ''
          }
        `}
      >
        {/* ICON */}
        <View
          className="
            h-10
            w-10
            items-center
            justify-center
            rounded-[14px]
            bg-[#F5F5F5]
          "
        >
          <AppIcon
            icon={icon}
            size={18}
            color="#555555"
            strokeWidth={1.8}
          />
        </View>

        {/* LABEL */}
        <Text
          className="
            ml-3.5
            flex-1
            text-[14.5px]
            font-semibold
            text-[#1C1C1C]
          "
        >
          {label}
        </Text>

        {/* TRAILING VALUE */}
        {trailingText ? (
          <View
            className="
              flex-row
              items-center
              gap-1.5
              rounded-full
              bg-[#F5F5F5]
              px-3
              py-1.5
            "
          >
            <Text
              className="
                text-[11.5px]
                font-semibold
                text-black/50
              "
            >
              {trailingText}
            </Text>

            {selector && (
              <AppIcon
                icon={ArrowDown01Icon}
                size={12}
                color="#888888"
                strokeWidth={2}
              />
            )}
          </View>
        ) : showChevron ? (
          <View
            className="
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-[#F7F7F7]
            "
          >
            <AppIcon
              icon={ArrowRight01Icon}
              size={14}
              color="#777777"
              strokeWidth={2}
            />
          </View>
        ) : null}
      </Pressable>

      {showDivider && (
        <View
          className="
            ml-[68px]
            h-px
            bg-black/[0.05]
          "
        />
      )}
    </>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="
        overflow-hidden
        rounded-[26px]
        border
        border-[#EAEAEA]
        bg-white
      "
    >
      {/* TITLE INSIDE CARD */}
      <View
        className="
          px-4
          pb-2
          pt-4
        "
      >
        <Text
          className="
            text-[16px]
            font-semibold
            tracking-[-0.2px]
            text-[#1C1C1C]
          "
        >
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

export function ProfileScreen({
  navigation,
}: Props) {
  const accessToken =
    useAuthStore(
      (state) => state.accessToken,
    );

  const exitGuestMode =
    useAuthStore(
      (state) => state.exitGuestMode,
    );

  const clearSession =
    useAuthStore(
      (state) => state.clear,
    );

  const {
    data: profile,
  } = useProfile();

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false);

  const [
    isRateModalOpen,
    setIsRateModalOpen,
  ] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try { await clearSession(); }
    catch { /* RootNavigator displays the persistent sign-out retry gate. */ }
    finally { setIsLoggingOut(false); }
  }

  function handleShare() {
    Share.share({
      message:
        'Ordering from local stores near you, delivered fast — check out Gloceries.',
    });
  }

  useEffect(() => {
    if (!accessToken) {
      exitGuestMode();
    }
  }, [
    accessToken,
    exitGuestMode,
  ]);

  if (!accessToken) {
    return null;
  }

  return (
    <View
      className="
        flex-1
        bg-[#F4F4F4]
        pt-safe
      "
    >
      <StatusBar style="dark" />

      {/* HEADER */}
      <View
        className="
          flex-row
          items-center
          px-5
          pb-3
          pt-2
        "
      >
        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          hitSlop={12}
          className="
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-white
            active:scale-95
          "
        >
          <AppIcon
            icon={ArrowLeft01Icon}
            size={20}
            color="#1C1C1C"
            strokeWidth={2}
          />
        </Pressable>

        <Text
          className="
            flex-1
            text-center
            text-[18px]
            font-bold
            tracking-[-0.3px]
            text-[#1C1C1C]
          "
        >
         Your profile
        </Text>

        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="
          gap-4
          px-5
          pb-16
          pt-2
        "
      >
        {/* ACCOUNT */}
        {profile && (
          <View
            className="
      overflow-hidden
      rounded-[26px]
      border
      border-[#EAEAEA]
      bg-white
    "
          >
            <AccountDetailsCard profile={profile} />
          </View>
        )}

        {/* QUICK ACCESS — NO HEADING */}
        <ProfileActionsBento
          onMyOrders={() =>
            navigation.navigate(
              'Purchase',
            )
          }
          onWishlist={() =>
            navigation.navigate(
              'Wishlist',
            )
          }
          onSupport={() => navigation.navigate('Support')}
          onRefunds={() => navigation.navigate('MyRefunds')}
        />

        {/* PREFERENCES */}
        <SectionCard title="Preferences">
          <MenuRow
            icon={Location05Icon}
            label="Address Book"
            onPress={() =>
              navigation.navigate(
                'AddressList',
              )
            }
          />

          <MenuRow
            icon={CreditCardIcon}
            label="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethod', { selectedMethod: null, source: 'profile' })}
          />

          <MenuRow
            icon={Notification03Icon}
            label="Notifications"
            showDivider={false}
            onPress={() => navigation.navigate('Notifications')}
          />
        </SectionCard>

        {/* GLOCERIES + SUPPORT */}
        <SectionCard title="Gloceries & support">
          <MenuRow
            icon={Share08Icon}
            label="Share Gloceries"
            onPress={handleShare}
          />

          <MenuRow
            icon={UserAdd01Icon}
            label="Invite Friends"
            onPress={() =>
              navigation.navigate(
                'Referral',
              )
            }
          />

          <MenuRow
            icon={StarIcon}
            label="Rate Gloceries"
            onPress={() =>
              setIsRateModalOpen(
                true,
              )
            }
          />

          <MenuRow
            icon={CustomerService01Icon}
            label="Help & Support"
            onPress={() => navigation.navigate('Support')}
          />

          <MenuRow
            icon={LockIcon}
            label="Account Privacy"
            onPress={() => navigation.navigate('AccountPrivacy')}
          />

          <MenuRow
            icon={InformationCircleIcon}
            label="About Gloceries"
            onPress={() => navigation.navigate('AboutGloceries')}
          />

          {/* LOGOUT — SAME CARD, SAME NEUTRAL STYLE */}
          <MenuRow
            icon={Logout03Icon}
            label={
              isLoggingOut
                ? 'Logging out…'
                : 'Log out'
            }
            onPress={handleLogout}
            disabled={isLoggingOut}
            showChevron={false}
            showDivider={false}
          />
        </SectionCard>

        <BrandFooter variant="compact" />
      </ScrollView>

      {/* RATE US */}
      <RateUsModal
        visible={isRateModalOpen}
        onClose={() =>
          setIsRateModalOpen(
            false,
          )
        }
      />


    </View>
  );
}