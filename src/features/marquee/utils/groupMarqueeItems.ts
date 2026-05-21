import { MarqueeItem } from '@/shared/types';

export interface MarqueeGroups {
  index: MarqueeItem[];
  fx: MarqueeItem[];
  energy: MarqueeItem[];
  metals: MarqueeItem[];
  agricultural: MarqueeItem[];
  transport: MarqueeItem[];
}

export const groupMarqueeItems = (items: MarqueeItem[]): MarqueeGroups => ({
  index:        items.filter(i => i.type === 'index'),
  fx:           items.filter(i => i.type === 'fx'),
  energy:       items.filter(i => i.type === 'energy'),
  metals:       items.filter(i => i.type === 'metals'),
  agricultural: items.filter(i => i.type === 'agricultural'),
  transport:    items.filter(i => i.type === 'transport'),
});
