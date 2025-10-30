import React, { forwardRef } from 'react';
import { PaymentMethod } from '../../types';

interface ReceiptProps {
  transaction: any; // Could use Transaction for strict typing
  onClose?: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ transaction, onClose }, ref) => {
  if (!transaction) return null;

  return (
    <div ref={ref} className="receipt-popup bg-white p-6 rounded shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2 text-center">Greep Market</h2>
      <div className="mb-2 text-xs text-center">Sales Receipt</div>
      <div className="mb-4 text-sm">
        <div><b>Cashier:</b> {transaction.cashier_id}</div>
        <div><b>Store:</b> {transaction.store_id}</div>
        <div><b>Date:</b> {new Date(transaction.created_at).toLocaleString('tr-TR')}</div>
        {transaction.customer_id && <div><b>Customer:</b> {transaction.customer_id}</div>}
        {transaction.payment_methods && transaction.payment_methods.length > 0 && (
          <div><b>Payment Method(s):</b> {transaction.payment_methods.map((pm: PaymentMethod) => pm.type).join(', ')}</div>
        )}
      </div>

      <div className="border-t border-b py-2 mb-2 text-xs">
        <div className="font-semibold">Products</div>
        <table className="w-full text-xs mt-1">
          <thead>
            <tr className="text-left">
              <th>Qty</th>
              <th>Item</th>
              <th className="text-right">Unit</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {transaction.items?.map((item: any, i: number) => (
              <tr key={i}>
                <td>{item.quantity}</td>
                <td>{item.product_name || item.product_id}</td>
                <td className="text-right">{formatPrice(item.unit_price)}</td>
                <td className="text-right">{formatPrice(item.unit_price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-2 flex justify-between text-sm">
        <span>Subtotal:</span> <span>{formatPrice(transaction.subtotal || 0)}</span>
      </div>
      {transaction.discount_amount ? (
        <div className="mb-2 flex justify-between text-sm">
          <span>Discount:</span> <span>-{formatPrice(transaction.discount_amount)}</span>
        </div>
      ) : null}
      {transaction.delivery_fee ? (
        <div className="mb-2 flex justify-between text-sm">
          <span>Shipping:</span> <span>{formatPrice(transaction.delivery_fee)}</span>
        </div>
      ) : null}
      <div className="mb-2 flex justify-between text-base font-bold border-t pt-2">
        <span>Total:</span> <span>{formatPrice(transaction.total_amount || 0)}</span>
      </div>
      {transaction.notes && <div className="text-xs mt-2 text-gray-600 italic">Note: {transaction.notes}</div>}
      <div className="mt-4 flex justify-center gap-3">
        <button
          className="bg-blue-600 text-white py-1 px-3 text-xs rounded"
          onClick={() => {
            window.print();
          }}
        >
          Print
        </button>
        {onClose && (
          <button className="border px-3 py-1 text-xs rounded" onClick={onClose}>Close</button>
        )}
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

export default Receipt;
