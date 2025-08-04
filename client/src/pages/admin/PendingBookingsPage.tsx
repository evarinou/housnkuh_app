import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MietfachAssignmentModal from './MietfachAssignmentModal';

interface MietfachAssignment {
  mietfachId: string;
  adjustedPrice: number;
  priceChangeReason?: string;
}

interface User {
  _id: string;
  kontakt: {
    email: string;
    name: string;
  };
  pendingBooking?: {
    packageData: any;
    createdAt: string;
    status: string;
    comments?: string;
  };
  createdAt: string;
}

const PendingBookingsPage: React.FC = () => {
  const [pendingBookings, setPendingBookings] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchPendingBookings();
  }, []);

  const fetchPendingBookings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await axios.get(`${apiUrl}/admin/pending-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // The backend returns { success, count, pendingBookings }
      const bookingsData = response.data.success && Array.isArray(response.data.pendingBookings) 
        ? response.data.pendingBookings 
        : [];
      setPendingBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
      setPendingBookings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (user: User) => {
    setSelectedUser(user);
    setShowAssignmentModal(true);
  };

  const handleMietfachAssignment = async (
    assignments: MietfachAssignment[], 
    scheduledStartDate: Date, 
    additionalData?: {
      zusatzleistungen?: any;
      totalPrice?: number;
    }
  ) => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const assignedMietfaecher = assignments.map(a => a.mietfachId);
      
      const response = await axios.post(`${apiUrl}/admin/pending-bookings/confirm/${selectedUser._id}`, {
        assignedMietfaecher,
        scheduledStartDate: scheduledStartDate.toISOString(),
        priceAdjustments: assignments.reduce((acc, assignment) => {
          acc[assignment.mietfachId] = assignment.adjustedPrice;
          return acc;
        }, {} as Record<string, number>),
        // Include Zusatzleistungen data for backend processing
        zusatzleistungenData: additionalData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setShowAssignmentModal(false);
        setSelectedUser(null);
        fetchPendingBookings();
        alert('Buchung erfolgreich bestätigt, Vertrag erstellt und E-Mail gesendet!');
      } else {
        throw new Error(response.data.message || 'Unbekannter Fehler');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      
      let errorMessage = 'Fehler beim Bestätigen der Buchung';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Fehler an Modal weiterleiten statt alert
      throw new Error(errorMessage);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      await axios.post(`${apiUrl}/admin/pending-bookings/reject/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchPendingBookings();
      alert('Buchungsanfrage abgelehnt!');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Fehler beim Ablehnen der Buchung');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Lade ausstehende Buchungen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ausstehende Buchungsanfragen</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie Package Builder Anfragen</p>
      </div>
        
      {!Array.isArray(pendingBookings) || pendingBookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Keine ausstehenden Buchungsanfragen</p>
        </div>
      ) : (
        <div className="grid gap-6">
            {pendingBookings.map((user) => (
              <div key={user._id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{user.kontakt.name || user.kontakt.email}</h3>
                    <p className="text-gray-600">{user.kontakt.email}</p>
                    <p className="text-sm text-gray-500">
                      Angefragt am: {new Date(user.pendingBooking?.createdAt || user.createdAt).toLocaleDateString('de-DE')}
                    </p>
                    {user.pendingBooking?.packageData?.bookingType === 'additional' && (
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Zusätzliche Buchung
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(user)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      Bestätigen
                    </button>
                    <button
                      onClick={() => handleReject(user._id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
                
                {user.pendingBooking && user.pendingBooking.packageData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Buchungsdetails:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Provisionsmodell:</strong> {user.pendingBooking.packageData.selectedProvisionType || 'N/A'}
                      </div>
                      <div>
                        <strong>Mietdauer:</strong> {user.pendingBooking.packageData.rentalDuration} Monate
                      </div>
                      <div className="md:col-span-2">
                        <strong>Preisaufschlüsselung:</strong>
                        <div className="text-sm text-gray-600 mt-1">
                          {user.pendingBooking.packageData.totalCost?.packageCosts && (
                            <div>Grundpreis: {user.pendingBooking.packageData.totalCost.packageCosts.toFixed(2)}€/Monat</div>
                          )}
                          {user.pendingBooking.packageData.totalCost?.zusatzleistungenCosts > 0 && (
                            <div>Zusatzleistungen: +{user.pendingBooking.packageData.totalCost.zusatzleistungenCosts.toFixed(2)}€/Monat</div>
                          )}
                          {user.pendingBooking.packageData.totalCost?.discountAmount > 0 && (
                            <div className="text-green-600">
                              Rabatt ({(user.pendingBooking.packageData.totalCost.discount * 100).toFixed(0)}%): 
                              -{user.pendingBooking.packageData.totalCost.discountAmount.toFixed(2)}€/Monat
                            </div>
                          )}
                          <div className="font-semibold border-t pt-1 mt-1">
                            Gesamt: {user.pendingBooking.packageData.totalCost?.monthly?.toFixed(2) || 'N/A'}€/Monat
                          </div>
                        </div>
                      </div>
                      <div>
                        <strong>Provision:</strong> {user.pendingBooking.packageData.totalCost?.provision || 'N/A'}%
                      </div>
                      
                      {user.pendingBooking.packageData.selectedPackages && user.pendingBooking.packageData.selectedPackages.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Gewählte Pakete:</strong>
                          <div className="mt-1">
                            {Object.entries(user.pendingBooking.packageData.packageCounts || {}).map(([packageId, count]) => {
                              const numCount = Number(count);
                              if (numCount > 0) {
                                const packageOption = user.pendingBooking?.packageData?.packageOptions?.find((p: any) => p.id === packageId);
                                return (
                                  <div key={packageId} className="text-sm text-gray-600">
                                    {numCount}x {packageOption?.name || packageId} ({packageOption?.price || 'N/A'}€/Monat)
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {user.pendingBooking.packageData.selectedAddons && user.pendingBooking.packageData.selectedAddons.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Zusatzoptionen:</strong> {user.pendingBooking.packageData.selectedAddons.join(', ')}
                        </div>
                      )}
                      
                      {user.pendingBooking.packageData.zusatzleistungen && (
                        user.pendingBooking.packageData.zusatzleistungen.lagerservice || 
                        user.pendingBooking.packageData.zusatzleistungen.versandservice
                      ) && (
                        <div className="md:col-span-2">
                          <strong>Zusatzleistungen:</strong>
                          <div className="text-sm text-gray-600 mt-1">
                            {user.pendingBooking.packageData.zusatzleistungen.lagerservice && (
                              <div>✓ Lagerservice (+20€/Monat)</div>
                            )}
                            {user.pendingBooking.packageData.zusatzleistungen.versandservice && (
                              <div>✓ Versandservice (+5€/Monat)</div>
                            )}
                            {user.pendingBooking.packageData.selectedProvisionType !== 'premium' && (
                              <div className="text-red-600 text-xs mt-1">
                                ⚠️ Zusatzleistungen nur mit Premium-Modell verfügbar
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Vendor Comments Section */}
                    {user.pendingBooking.comments && (
                      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                          Anmerkungen des Direktvermarkters:
                        </h4>
                        <div className="text-sm text-blue-800 whitespace-pre-wrap">
                          {user.pendingBooking.comments}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Mietfach Assignment Modal */}
      {selectedUser && (
        <MietfachAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedUser(null);
          }}
          onConfirm={handleMietfachAssignment}
          user={selectedUser}
        />
      )}
    </div>
  );
};

export default PendingBookingsPage;