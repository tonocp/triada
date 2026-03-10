export const GroupType = {
  NEEDS: 'needs',
  WANTS: 'wants',
  SAVINGS: 'savings',
} as const;

export type GroupType = (typeof GroupType)[keyof typeof GroupType];

export const GROUP_PERCENTAGES: Record<GroupType, number> = {
  needs: 50,
  wants: 30,
  savings: 20,
};

export const GROUP_ORDER: readonly GroupType[] = [
  GroupType.NEEDS,
  GroupType.WANTS,
  GroupType.SAVINGS,
];

const GROUP_ORDER_INDEX: Record<GroupType, number> = {
  needs: 0,
  wants: 1,
  savings: 2,
};

export const GROUP_ICONS: Record<GroupType, string> = {
  needs: 'pi pi-home',
  wants: 'pi pi-shopping-bag',
  savings: 'pi pi-wallet',
};

export function compareGroups(left: GroupType, right: GroupType): number {
  return GROUP_ORDER_INDEX[left] - GROUP_ORDER_INDEX[right];
}
