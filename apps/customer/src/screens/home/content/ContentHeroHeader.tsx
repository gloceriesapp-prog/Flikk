import { Text, View } from 'react-native';
import { ContentImage } from './ContentImage';
import type { HomeContentSection } from './contracts';

export function ContentHeroHeader({ section }: { section: HomeContentSection }) {
  const titleStyle = 'text-[26px] font-bold leading-[32px] tracking-[-0.8px] text-[#34452A]';
  const usesOriginalArtwork = section.id === 'coconut-oil' || section.id === 'home-grown-nearby';

  if (usesOriginalArtwork) {
    return (
      <>
        <View className="relative mb-2 min-h-[128px] items-end">
          <ContentImage section={section} side={section.id === 'home-grown-nearby'} />
          <Text accessibilityRole="header" numberOfLines={3} adjustsFontSizeToFit
            minimumFontScale={0.75}
            className={`absolute left-0 right-0 top-0 z-10 px-6 pt-5 ${titleStyle}`}>
            {section.title}
          </Text>
        </View>
        {section.subtitle ? <Text className="mb-4 px-5 text-[13px] text-ink/60">{section.subtitle}</Text> : null}
      </>
    );
  }

  if (!section.title && !section.subtitle && !section.imageUrl) return null;

  return (
    <View className="mb-2 min-h-[128px] flex-row items-center">
      <View className="flex-1 gap-2 py-5 pl-6 pr-2">
        {section.title ? <Text accessibilityRole="header" className={titleStyle}>{section.title}</Text> : null}
        {section.subtitle ? <Text className="text-[13px] text-ink/60">{section.subtitle}</Text> : null}
      </View>
      <ContentImage section={section} side />
    </View>
  );
}
