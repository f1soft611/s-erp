export type F1GridMergeInfo = {
  isStart: boolean;
  span: number;
};

export function getGridMergeInfo<T extends object>(
  rows: T[],
  field: keyof T,
): F1GridMergeInfo[] {
  return rows.map((row, index) => {
    if (index > 0 && Object.is(rows[index - 1][field], row[field])) {
      return { isStart: false, span: 0 };
    }

    let span = 1;
    while (
      index + span < rows.length &&
      Object.is(rows[index + span][field], row[field])
    ) {
      span += 1;
    }

    return { isStart: true, span };
  });
}
