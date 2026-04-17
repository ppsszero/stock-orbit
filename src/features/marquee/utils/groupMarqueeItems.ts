import { MarqueeItem } from '@/shared/types';

export interface MarqueeGroups {
  index: MarqueeItem[];
  fx: MarqueeItem[];
  metals: MarqueeItem[];
  energy: MarqueeItem[];
}

export const groupMarqueeItems = (items: MarqueeItem[]): MarqueeGroups => ({
  index: items.filter(i => i.type === 'index'),
  fx: items.filter(i => i.type === 'fx'),
  metals: items.filter(i => i.type === 'metals'),
  energy: items.filter(i => i.type === 'energy'),
});
