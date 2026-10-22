import {
  useEffect,
  useState,
  type ComponentType,
} from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

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
import {
  IconlyAddUser,
  IconlyArrowLeft,
  IconlyArrowRight,
  IconlyHeadphone,
  IconlyIncognito,
  IconlyInfoSquare,
  IconlyLogout,
  IconlyNotification,
  IconlyPinMap,
  IconlySend,
  IconlyStar,
  IconlyWallet,
  type IconlyIconProps,
} from '../../components/icons/iconly';

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
  ComponentType<IconlyIconProps>;

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
  icon: Icon,
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
          <Icon size={20} color="#555555" />
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
            <IconlyArrowRight size={16} color="#777777" />
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
        <Pressable accessibilityRole="button" accessibilityLabel="Go back"
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
          <IconlyArrowLeft size={22} color="#1C1C1C" />
        </Pressable>

        <Text
          className="
            flex-1
            text-center
            text-[20px]
            font-bold
            tracking-[-0.3px]
            text-[#1C1C1C]
          "
        >
          My Account
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
            icon={IconlyPinMap}
            label="Address Book"
            onPress={() =>
              navigation.navigate(
                'AddressList',
              )
            }
          />

          <MenuRow
            icon={IconlyWallet}
            label="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethod', { selectedMethod: null, source: 'profile' })}
          />

          <MenuRow
            icon={IconlyNotification}
            label="Notifications"
            showDivider={false}
            onPress={() => navigation.navigate('Notifications')}
          />
        </SectionCard>

        {/* GLOCERIES + SUPPORT */}
        <SectionCard title="Gloceries & support">
          <MenuRow
            icon={IconlySend}
            label="Share Gloceries"
            onPress={handleShare}
          />

          <MenuRow
            icon={IconlyAddUser}
            label="Invite Friends"
            onPress={() =>
              navigation.navigate(
                'Referral',
              )
            }
          />

          <MenuRow
            icon={IconlyStar}
            label="Rate Gloceries"
            onPress={() =>
              setIsRateModalOpen(
                true,
              )
            }
          />

          <MenuRow
            icon={IconlyHeadphone}
            label="Help & Support"
            onPress={() => navigation.navigate('Support')}
          />

          <MenuRow
            icon={IconlyIncognito}
            label="Account Privacy"
            onPress={() => navigation.navigate('AccountPrivacy')}
          />

          <MenuRow
            icon={IconlyInfoSquare}
            label="About Gloceries"
            onPress={() => navigation.navigate('AboutGloceries')}
          />

          {/* LOGOUT — SAME CARD, SAME NEUTRAL STYLE */}
          <MenuRow
            icon={IconlyLogout}
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