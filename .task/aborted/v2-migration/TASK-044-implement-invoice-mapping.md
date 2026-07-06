# Task: TASK-044-implement-invoice-mapping
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Mapping service converts Flourio Documents to invoice records
- [ ] All document types handled (invoice, receipt, credit note)
- [ ] Vendor and customer information properly mapped
- [ ] Line items and pricing accurately converted
- [ ] Tax calculations preserved from Flourio
- [ ] All mappings properly tested

## Test Plan
### Unit Tests
- [ ] Test invoice document mapping with complete data
- [ ] Test receipt document mapping
- [ ] Test credit note mapping
- [ ] Test handling of missing optional fields
- [ ] Co-located test file: invoiceMappingService.test.ts

### Integration Tests  
- [ ] Test mapping with real Flourio document data
- [ ] Test mapped invoices save correctly to database
- [ ] Test mapping preserves all critical information

### Manual Testing
- [ ] Create test documents in Flourio with various scenarios
- [ ] Verify mapped invoices display correctly in UI
- [ ] Test edge cases and unusual document formats

## Implementation Details
Implement comprehensive mapping from Flourio Documents to housnkuh invoices:

### Invoice Mapping Service
```typescript
// server/src/services/flourio/invoiceMappingService.ts
export interface MappingResult {
  invoiceData: Partial<IInvoice>;
  warnings: string[];
  errors: string[];
}

export class InvoiceMappingService {
  
  async mapDocumentToInvoice(document: FlourioDocument): Promise<MappingResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      const mappingResult = await this.performMapping(document, warnings, errors);
      
      return {
        invoiceData: mappingResult,
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Mapping failed: ${error.message}`);
      throw new Error(`Failed to map Flourio document ${document.id}: ${error.message}`);
    }
  }

  private async performMapping(
    document: FlourioDocument, 
    warnings: string[], 
    errors: string[]
  ): Promise<Partial<IInvoice>> {
    
    // Determine invoice type
    const invoiceType = this.mapDocumentType(document.type);
    
    // Map vendor/business partner
    const vendor = await this.mapVendor(document.businessPartner, warnings);
    
    // Map customer if exists
    const customer = await this.mapCustomer(document.customer, warnings);
    
    // Map line items
    const lineItems = this.mapLineItems(document.items, warnings);
    
    // Calculate totals
    const totals = this.calculateTotals(document, lineItems);
    
    // Map dates
    const dates = this.mapDates(document);
    
    // Map addresses
    const addresses = this.mapAddresses(document);

    return {
      // Basic information
      invoiceNumber: document.documentNumber,
      flourioDocumentId: document.id,
      type: invoiceType,
      status: this.mapDocumentStatus(document.status),
      
      // Vendor information
      vendorId: vendor?._id,
      vendorInfo: {
        name: vendor?.businessName || document.businessPartner.companyName,
        email: vendor?.email || document.businessPartner.email,
        phone: vendor?.phone || document.businessPartner.phone,
        address: addresses.vendor
      },
      
      // Customer information
      customerId: customer?._id,
      customerInfo: customer ? {
        name: customer.firstName + ' ' + customer.lastName,
        email: customer.email,
        address: addresses.customer
      } : {
        name: document.customer?.name || 'Unknown Customer',
        email: document.customer?.email,
        address: addresses.customer
      },
      
      // Financial information
      items: lineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
      currency: document.currency || 'EUR',
      
      // Dates
      issueDate: dates.issueDate,
      dueDate: dates.dueDate,
      paidDate: dates.paidDate,
      
      // Payment information
      paymentStatus: this.mapPaymentStatus(document.paymentStatus),
      paymentMethod: document.paymentMethod,
      
      // Metadata
      flourioSyncStatus: 'synced',
      flourioLastSyncAt: new Date(),
      createdAt: dates.createdAt,
      updatedAt: new Date()
    };
  }

  private mapDocumentType(flourioType: string): 'invoice' | 'receipt' | 'credit_note' {
    const typeMapping = {
      'invoice': 'invoice' as const,
      'receipt': 'receipt' as const,
      'credit_note': 'credit_note' as const,
      'credit_memo': 'credit_note' as const
    };
    
    return typeMapping[flourioType.toLowerCase()] || 'invoice';
  }

  private async mapVendor(businessPartner: FlourioBusinessPartner, warnings: string[]): Promise<IUser | null> {
    try {
      // Find vendor by Flourio Partner ID
      const vendor = await User.findOne({ 
        flourioPartnerId: businessPartner.id,
        role: 'vendor'
      });
      
      if (!vendor) {
        warnings.push(`Vendor not found for BusinessPartner ${businessPartner.id}`);
        return null;
      }
      
      return vendor;
    } catch (error) {
      warnings.push(`Failed to map vendor: ${error.message}`);
      return null;
    }
  }

  private async mapCustomer(flourioCustomer: FlourioCustomer, warnings: string[]): Promise<IUser | null> {
    if (!flourioCustomer?.email) {
      return null;
    }
    
    try {
      // Try to find existing customer by email
      const customer = await User.findOne({ 
        email: flourioCustomer.email,
        role: 'customer'
      });
      
      return customer;
    } catch (error) {
      warnings.push(`Failed to map customer: ${error.message}`);
      return null;
    }
  }

  private mapLineItems(flourioItems: FlourioDocumentItem[], warnings: string[]): InvoiceItem[] {
    return flourioItems.map(item => {
      try {
        return {
          articleId: item.articleId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          
          // Try to map to local product
          productId: this.findLocalProductId(item.articleId),
          
          // Flourio specific data
          flourioArticleId: item.articleId,
          flourioItemId: item.id
        };
      } catch (error) {
        warnings.push(`Failed to map line item ${item.id}: ${error.message}`);
        // Return basic item data even if mapping fails
        return {
          name: item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          taxRate: item.taxRate || 0,
          taxAmount: item.taxAmount || 0
        };
      }
    });
  }

  private calculateTotals(document: FlourioDocument, lineItems: InvoiceItem[]) {
    // Use Flourio totals if available, otherwise calculate from line items
    if (document.totals) {
      return {
        subtotal: document.totals.subtotal,
        taxAmount: document.totals.taxAmount,
        total: document.totals.total
      };
    }
    
    // Fallback calculation
    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  }

  private mapDates(document: FlourioDocument) {
    return {
      issueDate: new Date(document.issueDate),
      dueDate: document.dueDate ? new Date(document.dueDate) : undefined,
      paidDate: document.paidDate ? new Date(document.paidDate) : undefined,
      createdAt: new Date(document.createdAt)
    };
  }

  private mapAddresses(document: FlourioDocument) {
    return {
      vendor: document.businessPartner.address ? {
        street: document.businessPartner.address.street,
        city: document.businessPartner.address.city,
        postalCode: document.businessPartner.address.postalCode,
        country: document.businessPartner.address.country
      } : undefined,
      
      customer: document.customer?.address ? {
        street: document.customer.address.street,
        city: document.customer.address.city,
        postalCode: document.customer.address.postalCode,
        country: document.customer.address.country
      } : undefined
    };
  }

  private mapDocumentStatus(flourioStatus: string): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
    const statusMapping = {
      'draft': 'draft' as const,
      'sent': 'sent' as const,
      'paid': 'paid' as const,
      'overdue': 'overdue' as const,
      'cancelled': 'cancelled' as const,
      'void': 'cancelled' as const
    };
    
    return statusMapping[flourioStatus.toLowerCase()] || 'draft';
  }

  private mapPaymentStatus(flourioPaymentStatus: string): 'pending' | 'paid' | 'partial' | 'overdue' {
    const paymentMapping = {
      'pending': 'pending' as const,
      'paid': 'paid' as const,
      'partial': 'partial' as const,
      'overdue': 'overdue' as const,
      'unpaid': 'pending' as const
    };
    
    return paymentMapping[flourioPaymentStatus?.toLowerCase()] || 'pending';
  }

  private findLocalProductId(flourioArticleId: string): string | undefined {
    // This would need to be implemented to find local product by Flourio article ID
    // For now, return undefined - could be enhanced later
    return undefined;
  }
}
```

### Data Validation
```typescript
// server/src/services/flourio/mappingValidation.ts
export function validateMappedInvoice(invoiceData: Partial<IInvoice>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!invoiceData.invoiceNumber) {
    errors.push('Invoice number is required');
  }
  
  if (!invoiceData.vendorId && !invoiceData.vendorInfo?.name) {
    errors.push('Vendor information is required');
  }
  
  if (!invoiceData.totalAmount || invoiceData.totalAmount <= 0) {
    errors.push('Total amount must be greater than 0');
  }
  
  if (!invoiceData.issueDate) {
    errors.push('Issue date is required');
  }
  
  // Warnings for missing optional data
  if (!invoiceData.customerId && !invoiceData.customerInfo?.email) {
    warnings.push('No customer information available');
  }
  
  if (!invoiceData.items || invoiceData.items.length === 0) {
    warnings.push('No line items found');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

## Dependencies
- TASK-030-create-typescript-types (Flourio types needed)
- TASK-045-add-sync-status-tracking (sync status needed)

## Definition of Done
- [ ] Mapping service handles all document types
- [ ] Vendor and customer mapping implemented
- [ ] Line items mapped with proper calculations
- [ ] Date and address mapping working
- [ ] Status and payment mapping accurate
- [ ] Validation prevents invalid mappings
- [ ] All unit tests implemented and passing
- [ ] Integration tests with real data
- [ ] Error handling for malformed documents
- [ ] Comprehensive logging for debugging
- [ ] Code review completed (if applicable)