/**
 * Debug utility to check what's happening with the InvoiceDashboard
 */

export const debugInvoiceDashboard = () => {
  console.log('🔍 InvoiceDashboard Debug Check');
  console.log('='.repeat(50));

  // Check localStorage
  const token = localStorage.getItem('token');
  console.log('📦 Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');

  // Check axios defaults
  console.log('📡 Axios default headers:');
  console.log('  Authorization:', window.axios?.defaults?.headers?.common?.['Authorization'] || 'NOT SET');
  console.log('  x-auth-token:', window.axios?.defaults?.headers?.common?.['x-auth-token'] || 'NOT SET');

  // Test direct API call
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  console.log('🌐 API URL:', apiUrl);

  console.log('\n📊 Testing /api/admin/invoices/stats...');
  fetch(`${apiUrl}/admin/invoices/stats`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'x-auth-token': token || '',
      'Content-Type': 'application/json'
    }
  })
  .then(r => {
    console.log('  Response status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('  ✅ Stats data received:', data);
  })
  .catch(err => {
    console.log('  ❌ Stats error:', err);
  });

  console.log('\n💰 Testing /api/invoices...');
  fetch(`${apiUrl}/invoices`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'x-auth-token': token || '',
      'Content-Type': 'application/json'
    }
  })
  .then(r => {
    console.log('  Response status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('  ✅ Invoices data received:', data);
  })
  .catch(err => {
    console.log('  ❌ Invoices error:', err);
  });

  console.log('\n📝 Next steps:');
  console.log('1. Check if token exists in localStorage');
  console.log('2. Check network tab for actual requests');
  console.log('3. Look for any console errors');
  console.log('='.repeat(50));
};

// Auto-run on import for debugging
if (window.location.pathname === '/admin/invoice-dashboard') {
  setTimeout(() => {
    console.log('🚨 Running InvoiceDashboard debug in 2 seconds...');
    debugInvoiceDashboard();
  }, 2000);
}