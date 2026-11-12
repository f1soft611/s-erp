export const deliveryPermissions = { read: true, create: true, update: true, delete: true, excel: true };
export const deliveryMenuResponse = {
  user: { userId: 'delivery-browser-test', name: 'Synthetic Tester', roles: ['TEST'], departmentName: 'Test' },
  menus: [{
    menuId: 900, parentMenuId: null, name: '영업관리', path: '/sales', icon: 'ShoppingCart',
    children: [{
      menuId: 901, parentMenuId: 900, name: '납품관리', path: '/sales/delivery',
      children: [
        { menuId: 902, parentMenuId: 901, name: '납품등록', path: '/sales/delivery/delivery-create', permissions: deliveryPermissions },
        { menuId: 903, parentMenuId: 901, name: '납품현황', path: '/sales/delivery/delivery-status',
          permissions: { read: true, create: false, update: false, delete: false, excel: true } },
      ],
    }],
  }],
};
const planDetail = (salesOrderId, salesOrderDetailId, orderNo, lineNo, materialId, materialCode, materialName) => ({
  salesOrderId, salesOrderDetailId, orderNo, orderDt: '2026-11-04', customerId: 10,
  customerCode: 'C10', customerName: '검증 거래처', deliveryPlace: '검증 창고',
  deliveryMethod: '택배', lineNo, materialId, materialCode, materialName, unit: 'EA',
  orderQty: 10, shippedQty: 0, unitPrice: 100, planDt: '2026-11-08', remainingPlanQty: 10,
});
export const deliveryPlanSourceRows = [
  planDetail(7, 70, 'SO-TEST-7', 1, 20, 'M20', '검증 품목 1'),
  planDetail(7, 71, 'SO-TEST-7', 2, 21, 'M21', '검증 품목 2'),
  planDetail(8, 80, 'SO-TEST-8', 1, 30, 'M30', '검증 품목 3'),
];
const planItemDetails = [
  {
    ...deliveryPlanSourceRows[0], salesDeliveryPlanDetailId: 90, salesDeliveryPlanId: 9,
    plannedQty: 10, deliveredQty: 0, remainingQty: 10,
  },
  {
    ...deliveryPlanSourceRows[2], salesDeliveryPlanDetailId: 92, salesDeliveryPlanId: 9,
    plannedQty: 10, deliveredQty: 0, remainingQty: 10,
  },
];
export const deliveryPlanItem = {
  salesDeliveryPlanId: 9, tenantId: 71, planNo: 'DP-TEST-9', createdBy: 'delivery-browser-test',
  details: planItemDetails,
};
export const deliveryPlanStatusRows = planItemDetails.map((detail) => ({
  ...detail, planNo: deliveryPlanItem.planNo,
}));
export const deliverySourceRows = [
  {
    ...planDetail(7, 70, 'SO-TEST-7', 1, 20, 'M20', '검증 품목 1'),
    salesDeliveryPlanDetailId: 700, planNo: 'DP-TEST-1', planDt: '2026-11-08',
    plannedQty: 10, deliveredQty: 4, remainingQty: 6,
  },
  {
    ...planDetail(7, 71, 'SO-TEST-7', 2, 21, 'M21', '검증 품목 2'),
    salesDeliveryPlanDetailId: 701, planNo: 'DP-TEST-1', planDt: '2026-11-08',
    plannedQty: 10, deliveredQty: 0, remainingQty: 10,
  },
  {
    ...planDetail(8, 80, 'SO-TEST-8', 1, 30, 'M30', '검증 품목 3'),
    salesDeliveryPlanDetailId: 800, planNo: 'DP-TEST-2', planDt: '2026-11-09',
    plannedQty: 10, deliveredQty: 0, remainingQty: 10,
  },
];
export const deliveryBrowserItem = {
  salesDeliveryId: 1, deliveryNo: 'SD-20261104-0001', deliveryDt: '2026-11-04', deliveryType: 'DIRECT',
  customerId: 10, customerCode: 'C10', customerName: '검증 거래처', salesOrderId: null, orderNo: null,
  deliveryPlace: '검증 창고', deliveryMethod: '택배', remark: 'Synthetic document', totalAmt: 220,
  createdBy: 'another-synthetic-user', writer: false,
  details: [{
    salesDeliveryDetailId: 11, lineNo: 1, materialId: 20, materialCode: 'M20', materialName: '검증 품목',
    unit: 'EA', salesOrderDetailId: null, deliveryQty: 2, unitPrice: 100, supplyAmt: 200, vatAmt: 20, totalAmt: 220,
  }],
};

// Install before navigating. No server is started; only synthetic /api/v1 requests are fulfilled.
export async function installSalesDeliveryBrowserMocks(page) {
  const documents = new Map([[1, structuredClone(deliveryBrowserItem)]]);
  const requests = [];
  let nextId = 2;
  await page.addInitScript(() => {
    localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'SYNTHETIC', userId: 'delivery-browser-test', accessToken: 'synthetic-token',
      refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }));
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const reply = (result, status = 200) => route.fulfill({
      status, headers, contentType: 'application/json', body: JSON.stringify({ resultCode: 200, resultMessage: 'OK', result }),
    });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    requests.push({ path: url.pathname, method, query: Object.fromEntries(url.searchParams), body: request.postDataJSON() });
    if (url.pathname === '/api/v1/menus/my') return reply(deliveryMenuResponse);
    if (url.pathname === '/api/v1/system/modules') return reply({ resultList: [{
      moduleId: 900, moduleCode: 'SALES', moduleName: '영업관리', moduleUrl: '/sales', iconName: 'ShoppingCart', useAt: 'Y',
    }] });
    if (url.pathname === '/api/v1/menus/favorites') return reply({ item: { folders: [], favorites: [] } });
    if (url.pathname === '/api/v1/co/master/customers') return reply({ resultList: [{
      customerId: 10, customerCode: 'C10', customerName: '검증 거래처', useAt: 'Y',
    }] });
    if (url.pathname === '/api/v1/co/master/materials') return reply({ resultList: [{
      materialId: 20, materialCode: 'M20', materialName: '검증 품목', unit: 'EA', useAt: 'Y',
    }] });
    const planBase = '/api/v1/sales/delivery-plans';
    if (url.pathname === `${planBase}/source-orders`) return reply({ items: deliveryPlanSourceRows });
    if (url.pathname === `${planBase}/status`) return reply({ items: deliveryPlanStatusRows });
    if (url.pathname === planBase && method === 'POST') return reply({ item: deliveryPlanItem }, 201);
    if (url.pathname === `${planBase}/9`) return reply({ item: deliveryPlanItem });
    const base = '/api/v1/sales/deliveries';
    if (url.pathname === `${base}/source-orders`) return reply({ items: deliverySourceRows });
    if (url.pathname === `${base}/status`) {
      const items = [...documents.values()].filter((item) =>
        item.deliveryDt >= url.searchParams.get('deliveryDtFrom') && item.deliveryDt <= url.searchParams.get('deliveryDtTo'),
      ).flatMap((item) => item.details.map((detail) => {
        const { details: _details, ...header } = item;
        return { ...header, ...detail };
      }));
      return reply({ items });
    }
    if (url.pathname === base && method === 'POST' || url.pathname.startsWith(`${base}/`) && method === 'PUT') {
      const payload = request.postDataJSON();
      const id = method === 'POST' ? nextId++ : Number(url.pathname.split('/').at(-1));
      const details = payload.details.map((row, index) => {
        const supplyAmt = Math.round(row.deliveryQty * row.unitPrice * 100) / 100;
        const vatAmt = row.vatAmt ?? Math.round(supplyAmt * 10) / 100;
        return { ...row, salesDeliveryDetailId: id * 10 + index + 1, lineNo: index + 1,
          materialCode: 'M20', materialName: '검증 품목', unit: 'EA', supplyAmt, vatAmt,
          totalAmt: Math.round((supplyAmt + vatAmt) * 100) / 100 };
      });
      const item = { ...deliveryBrowserItem, ...payload, salesDeliveryId: id,
        deliveryNo: `SD-${payload.deliveryDt.replaceAll('-', '')}-${String(id).padStart(4, '0')}`,
        orderNo: payload.deliveryType === 'ORDER' ? 'SO-TEST-7' : null,
        totalAmt: details.reduce((sum, row) => sum + row.totalAmt, 0), details };
      documents.set(id, item);
      return reply({ item }, method === 'POST' ? 201 : 200);
    }
    if (url.pathname.startsWith(`${base}/`)) {
      const id = Number(url.pathname.split('/').at(-1));
      if (method === 'DELETE') { documents.delete(id); return reply({}); }
      if (documents.has(id)) return reply({ item: documents.get(id) });
      return route.fulfill({ status: 404, headers, contentType: 'application/json',
        body: JSON.stringify({ resultCode: 404, resultMessage: 'Synthetic document not found' }) });
    }
    return reply({ items: [], resultList: [], item: null, count: 0, unreadCount: 0, folders: [], favorites: [] });
  });
  return { documents, requests };
}
