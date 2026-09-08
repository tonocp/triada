export const GroupType = {
  NEEDS: 'needs',
  WANTS: 'wants',
  SAVINGS: 'savings',
} as const;

export type GroupType = (typeof GroupType)[keyof typeof GroupType];

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

export function compareGroups(left: GroupType, right: GroupType): number {
  return GROUP_ORDER_INDEX[left] - GROUP_ORDER_INDEX[right];
}
