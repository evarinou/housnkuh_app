// Utility to clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('vendorToken');
  localStorage.removeItem('vendorUser');
  console.log('All auth data cleared');
};