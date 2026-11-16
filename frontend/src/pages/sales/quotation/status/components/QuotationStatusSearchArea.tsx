import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import type { PageSearchField } from '../../../../../shared/components/page-search/searchFields';
import type { QuotationStatusSearchValues } from '../types/quotationStatus.types';

type Props = {
  detailFields: PageSearchField[];
  detailValues: QuotationStatusSearchValues;
  appliedDetailValues: QuotationStatusSearchValues;
  defaultValues: QuotationStatusSearchValues;
  onDetailValuesChange: (values: QuotationStatusSearchValues) => void;
  onSearch: (values?: QuotationStatusSearchValues) => void;
  onReset: () => void;
  initialized: boolean;
  loading: boolean;
};

export function QuotationStatusSearchArea({
  detailFields,
  detailValues,
  appliedDetailValues,
  defaultValues,
  onDetailValuesChange,
  onSearch,
  onReset,
  initialized,
  loading,
}: Props) {
  return (
    <PageSearchArea
      onDefaultSearch={() => { if (initialized) onSearch(appliedDetailValues); }}
      detailFields={detailFields}
      detailValues={detailValues}
      appliedDetailValues={appliedDetailValues}
      defaultValues={defaultValues}
      onDetailValuesChange={onDetailValuesChange}
      onDetailSearch={onSearch}
      onDetailReset={(values) => {
        onDetailValuesChange(values);
        onReset();
      }}
      detailLoading={loading || !initialized}
    />
  );
}
