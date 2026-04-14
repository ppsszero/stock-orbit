import { MarqueeItem } from '@/shared/types';

export interface MarqueeGroups {
  index: MarqueeItem[];
  fx: MarqueeItem[];
  commodity: MarqueeItem[];
}

export const groupMarqueeItems = (items: MarqueeItem[]): MarqueeGroups => ({
  index: items.filter(i => i.type === 'index'),
  fx: items.filter(i => i.type === 'fx'),
  commodity: items.filter(i => i.type === 'commodity'),
});
