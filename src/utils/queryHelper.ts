const rangeQueryHelper = async (field: string, min: number, max: number) => {
  const budgetCondition: any = {};

  if (min !== undefined && min !== null) {
    budgetCondition[field] = { ...budgetCondition[field], $gte: min };
  }

  if (max !== undefined && max !== null) {
    budgetCondition[field] = { ...budgetCondition[field], $lte: max };
  }

  return budgetCondition;
};

export const QueryHelper = { rangeQueryHelper };
