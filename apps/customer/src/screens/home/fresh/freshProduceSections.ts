import { freshSectionPlacement, type HomeContentSection } from '../content/contracts';
// The Fresh choices: Vegetables (key 'everyday'), Fruits, Village Fresh.
export type FreshProduceMode = 'everyday' | 'fruits' | 'village';

// Each enabled section goes above the choices (intro), under one choice, or
// under every choice ('both', named before the third choice existed).
export function partitionFreshSections(sections: HomeContentSection[]) {
  const enabled = sections.filter(section => section.enabled && section.kind !== 'footer');
  const placement = (section: HomeContentSection) => freshSectionPlacement(section, sections);
  const under = (mode: FreshProduceMode) => enabled.filter(section => [mode, 'both'].includes(placement(section)));
  return {
    intro: enabled.filter(section => placement(section) === 'intro'),
    everyday: under('everyday'),
    fruits: under('fruits'),
    village: under('village'),
    footer: sections.filter(section => section.enabled && section.kind === 'footer'),
  };
}

export const FRESH_EMPTY_COPY: Record<FreshProduceMode, string> = {
  everyday: 'Vegetables will appear here when available nearby.',
  fruits: 'Fruits will appear here when available nearby.',
  village: 'Village-grown produce will appear here when available nearby.',
};
