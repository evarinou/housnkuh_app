/**
 * @file VendorInvoiceDetailPage.tsx
 * @purpose Vendor invoice detail page that displays comprehensive invoice information using the InvoiceDetail component
 * @created 2025-09-09
 * @modified 2025-09-09
 */

import React from 'react';
import VendorLayout from '../../components/vendor/VendorLayout';
import InvoiceDetail from '../../components/vendor/InvoiceDetail';

const VendorInvoiceDetailPage: React.FC = () => {
  return (
    <VendorLayout>
      <div className="max-w-6xl mx-auto">
        <InvoiceDetail />
      </div>
    </VendorLayout>
  );
};

export default VendorInvoiceDetailPage;