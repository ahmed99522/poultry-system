const { v4: uuidv4 } = require('uuid');

/**
 * توليد رقم طلب مقروء بصيغة: ORD-YYYYMMDD-XXXX
 */
function generateOrderNumber(sequence) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `ORD-${y}${m}${d}-${String(sequence).padStart(4, '0')}`;
}

/**
 * توليد كود فريد لكل طائر: مرتبط برقم الطلب + رقم تسلسلي + جزء عشوائي قصير لمنع التخمين
 */
function generateBirdCode(orderNumber, seqInOrder) {
  const shortRandom = uuidv4().split('-')[0].toUpperCase().slice(0, 4);
  return `${orderNumber}-B${String(seqInOrder).padStart(3, '0')}-${shortRandom}`;
}

/**
 * توليد رقم فاتورة: INV-YYYYMMDD-XXXX
 */
function generateInvoiceNumber(sequence) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `INV-${y}${m}${d}-${String(sequence).padStart(4, '0')}`;
}

module.exports = { generateOrderNumber, generateBirdCode, generateInvoiceNumber };
