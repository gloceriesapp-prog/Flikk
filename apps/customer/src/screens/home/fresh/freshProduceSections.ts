import { freshSectionPlacement, type HomeContentSection } from '../content/contracts';
export type FreshProduceMode = 'everyday' | 'village';

export function partitionFreshSections(sections: HomeContentSection[]) {
  const enabled = sections.filter(section => section.enabled && section.kind !== 'footer');
  const placement = (section: HomeContentSection) => freshSectionPlacement(section, sections);
  return {
    intro: enabled.filter(section => placement(section) === 'intro'),
    everyday: enabled.filter(section => ['everyday', 'both'].includes(placement(section))),
    village: enabled.filter(section => ['village', 'both'].includes(placement(section))),
    footer: sections.filter(section => section.enabled && section.kind === 'footer'),
  };
}
