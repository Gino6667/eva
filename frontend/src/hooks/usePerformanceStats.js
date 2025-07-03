import { useCallback, useMemo } from 'react';

/**
 * @param {Object[]} designers 設計師陣列
 * @param {Object[]} transactions 交易紀錄
 * @param {Object[]} products 產品陣列
 * @param {Object[]} services 服務陣列
 * @returns {Object} 統計方法與結果
 * @example
 *   // 只統計區間內資料
 *   getServiceStatsByType(designerId, dateStr => dateStr >= startDate && dateStr <= endDate)
 *   getProductStats(designerId, dateStr => dateStr >= startDate && dateStr <= endDate)
 */
export default function usePerformanceStats({ designers = [], transactions = [], products = [], services = [] }) {
  // 取得服務名稱
  const getServiceName = useCallback(() => services.find(s => s.id == id)?.name || '未知服務', [services]);
  // 取得產品名稱
  const getProductName = useCallback(() => products.find(p => p.id == id)?.name || '未知產品', [products]);

  // 取得設計師服務明細
  const getServiceDetails = useCallback((designerId, filterFn) => {
    return transactions.filter(t =>
      t.type === 'income' &&
      t.designerId == designerId &&
      (
        t.category === 'service' ||
        t.category === '服務' ||
        t.category === '服務收入' ||
        (t.category !== 'product' && t.category !== '產品' && t.category !== 'product-sale')
      )
    ).filter(t => (typeof filterFn === 'function' ? filterFn(t.date) : true))
    .map(t => ({
      date: t.date,
      name: t.serviceId ? getServiceName(t.serviceId) : (t.description || ''),
      amount: t.amount,
      serviceId: t.serviceId
    }));
  }, [transactions]);

  // 依服務類別分組
  const getServiceStatsByType = useCallback((designerId, filterFn) => {
    const details = getServiceDetails(designerId, filterFn);
    const stats = {};
    details.forEach(d => {
      if (!stats[d.name]) stats[d.name] = { count: 0, total: 0, serviceId: d.serviceId };
      stats[d.name].count++;
      stats[d.name].total += Number(d.amount);
    });
    return stats;
  }, [getServiceDetails]);

  // 取得產品銷售明細
  const getProductDetails = useCallback((designerId, filterFn) => {
    return transactions.filter(t => t.category==='product' && t.designerId==designerId)
      .filter(t => (typeof filterFn === 'function' ? filterFn(t.date) : true))
      .map(t => ({
        date: t.date,
        name: t.productId ? getProductName(t.productId) : (t.description ? t.description.replace(/產品銷售：|（設計師：.*?）/g, '') : ''),
        amount: t.amount
      }));
  }, [transactions]);

  // 產品銷售統計
  const getProductStats = useCallback(() => {
    const details = getProductDetails(designerId, filterFn);
    return {
      count: details.length,
      total: details.reduce((sum, t) => sum + Number(t.amount), 0),
      kinds: [...new Set(details.map(t=>t.name))].length
    };
  }, [getProductDetails]);

  // 總表：所有設計師的服務與產品統計
  const summary = useMemo(() => designers.map(designer => {
    const serviceStats = getServiceStatsByType(designer.id);
    const finishedServiceCount = Object.values(serviceStats).reduce((sum,s)=>sum+s.count,0);
    const finishedServiceAmount = Object.values(serviceStats).reduce((sum,s)=>sum+s.total,0);
    const productStats = getProductStats();
    return {
      designerId: designer.id,
      designerName: designer.name,
      finishedServiceCount,
      finishedServiceAmount,
      productKinds: productStats.kinds,
      productTotal: productStats.total
    };
  }), [designers, transactions, products, services]);

  const productStats = useMemo(() => getProductStats(), [getProductStats]);
  const serviceStats = useMemo(() => getServiceStatsByType(), [getServiceStatsByType]);

  return {
    getServiceDetails,
    getServiceStatsByType,
    getProductDetails,
    getProductStats,
    summary
  };
} 