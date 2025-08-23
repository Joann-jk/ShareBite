import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { useNavigate } from "react-router-dom";

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [acceptedDeliveries, setAcceptedDeliveries] = useState([]);
  const [pickedUpDeliveries, setPickedUpDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);

  // Fetch deliveries by status
  useEffect(() => {
    async function fetchAllDeliveries() {
      // TODO: Add volunteer_id field to donations table
      // Available deliveries - claimed donations without volunteer assigned
      const { data: availableData, error: availableError } = await supabase
        .from("donations")
        .select(`
          *, 
          donor:donor_id(name, address),
          recipient:recipient_id(name, address)
        `)
        .eq("status", "claimed")
        .is("volunteer_id", null); // TODO: Replace with proper volunteer_id field
      
      if (availableError) console.error("Available fetch error:", availableError);
      setAvailableDeliveries(availableData || []);

      // My accepted deliveries
      if (user?.id) {
        const { data: acceptedData, error: acceptedError } = await supabase
          .from("donations")
          .select(`
            *, 
            donor:donor_id(name, address),
            recipient:recipient_id(name, address)
          `)
          .eq("status", "accepted")
          .eq("volunteer_id", user.id); // TODO: Update schema to use volunteer_id
        
        if (acceptedError) console.error("Accepted fetch error:", acceptedError);
        setAcceptedDeliveries(acceptedData || []);

        // My picked up deliveries
        const { data: pickedData, error: pickedError } = await supabase
          .from("donations")
          .select(`
            *, 
            donor:donor_id(name, address),
            recipient:recipient_id(name, address)
          `)
          .eq("status", "picked")
          .eq("volunteer_id", user.id); // TODO: Update schema to use volunteer_id
        
        if (pickedError) console.error("Picked fetch error:", pickedError);
        setPickedUpDeliveries(pickedData || []);

        // My completed deliveries
        const { data: deliveredData, error: deliveredError } = await supabase
          .from("donations")
          .select(`
            *, 
            donor:donor_id(name, address),
            recipient:recipient_id(name, address)
          `)
          .eq("status", "delivered")
          .eq("volunteer_id", user.id); // TODO: Update schema to use volunteer_id
        
        if (deliveredError) console.error("Delivered fetch error:", deliveredError);
        setCompletedDeliveries(deliveredData || []);
      }
    }
    fetchAllDeliveries();
  }, [user]);

  // Real-time sync for all status changes
  useEffect(() => {
    const channel = supabase
      .channel("donations-realtime-volunteer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations" },
        async (payload) => {
          const newDonation = payload.new;
          
          // TODO: Optimize these queries - consider using joins or caching
          // Fetch donor and recipient details for real-time updates
          let donorData = null;
          let recipientData = null;
          
          if (newDonation.donor_id) {
            const { data } = await supabase
              .from("users")
              .select("name, address")
              .eq("id", newDonation.donor_id)
              .single();
            donorData = data;
          }

          if (newDonation.recipient_id) { // TODO: Update to use recipient_id instead of organisation_id
            const { data } = await supabase
              .from("users")
              .select("name, address")
              .eq("id", newDonation.recipient_id)
              .single();
            recipientData = data;
          }

          const donationWithDetails = {
            ...newDonation,
            donor: donorData,
            recipient: recipientData // TODO: Update field name from organisation to recipient
          };

          // Handle available deliveries (claimed status, no volunteer assigned)
          if (newDonation.status === "claimed" && !newDonation.volunteer_id) { // TODO: Use volunteer_id field
            setAvailableDeliveries((prev) => {
              const filtered = prev.filter((d) => d.id !== newDonation.id);
              return [donationWithDetails, ...filtered];
            });
          } else {
            setAvailableDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
          }

          // Handle volunteer's deliveries
          if (user?.id && newDonation.volunteer_id === user.id) { // TODO: Use volunteer_id field
            if (newDonation.status === "accepted") {
              setAcceptedDeliveries((prev) => {
                const filtered = prev.filter((d) => d.id !== newDonation.id);
                return [donationWithDetails, ...filtered];
              });
              setPickedUpDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
              setCompletedDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
            } else if (newDonation.status === "picked") {
              setPickedUpDeliveries((prev) => {
                const filtered = prev.filter((d) => d.id !== newDonation.id);
                return [donationWithDetails, ...filtered];
              });
              setAcceptedDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
              setCompletedDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
            } else if (newDonation.status === "delivered") {
              setCompletedDeliveries((prev) => {
                const filtered = prev.filter((d) => d.id !== newDonation.id);
                return [donationWithDetails, ...filtered];
              });
              setAcceptedDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
              setPickedUpDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
            } else {
              // Remove from all volunteer lists if status changed to something else
              setAcceptedDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
              setPickedUpDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
              setCompletedDeliveries((prev) => prev.filter((d) => d.id !== newDonation.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Accept a delivery - assign volunteer to the donation
  async function handleAccept(donationId) {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from("donations")
      .update({ 
        status: "accepted", 
        volunteer_id: user.id, // TODO: Add volunteer_id field to donations table
        updated_at: new Date().toISOString()
      })
      .eq("id", donationId)
      .eq("status", "claimed") // Prevent race conditions
      .is("volunteer_id", null); // Ensure no volunteer assigned yet
    
    if (error) {
      alert("Error accepting delivery: " + error.message);
      console.error("Accept error:", error);
    }
  }

  // Mark as picked up
  async function handlePickup(donationId) {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from("donations")
      .update({ 
        status: "picked",
        updated_at: new Date().toISOString()
      })
      .eq("id", donationId)
      .eq("volunteer_id", user.id) // TODO: Use volunteer_id field
      .eq("status", "accepted"); // Ensure correct status transition
    
    if (error) {
      alert("Error marking as picked up: " + error.message);
      console.error("Pickup error:", error);
    }
  }

  // Mark as delivered
  async function handleDelivered(donationId) {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from("donations")
      .update({ 
        status: "delivered",
        delivered_at: new Date().toISOString(), // TODO: Add delivered_at timestamp field
        updated_at: new Date().toISOString()
      })
      .eq("id", donationId)
      .eq("volunteer_id", user.id) // TODO: Use volunteer_id field
      .eq("status", "picked"); // Ensure correct status transition
    
    if (error) {
      alert("Error marking as delivered: " + error.message);
      console.error("Delivery error:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-yellow-400">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 border-b border-yellow-400/30 backdrop-blur-sm bg-black/50">
        <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          ShareBite
        </div>
        <div className="space-x-8 text-lg">
          <button className="hover:text-white transition-colors duration-300 hover:scale-105 transform">
            Dashboard
          </button>
          <button className="hover:text-white transition-colors duration-300 hover:scale-105 transform">
            Profile
          </button>
          <button className="hover:text-white transition-colors duration-300 hover:scale-105 transform">
            Settings
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="text-center py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
            Volunteer Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Making a difference, one delivery at a time. Connect food donors with those in need.
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates</span>
            </div>
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Live tracking</span>
            </div>
          </div>
        </div>
      </header>

      {/* Available Deliveries Section */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Available Deliveries
              </h2>
              <div className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-full">
                {availableDeliveries.length} opportunities
              </div>
            </div>
            
            {availableDeliveries.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📦</span>
                </div>
                <p className="text-xl text-gray-400 mb-2">No deliveries available right now</p>
                <p className="text-gray-500">Check back soon for new opportunities!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableDeliveries.map((d) => (
                  <div key={d.id} className="group bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:border-yellow-400/50 transition-all duration-300 hover:shadow-lg hover:scale-105 transform">
                    <div className="mb-4">
                      <h3 className="font-bold text-2xl text-yellow-300 mb-2">{d.food_type}</h3>
                      <div className="flex items-center space-x-2 text-gray-300 mb-2">
                        <span className="text-lg font-semibold">{d.quantity}</span>
                        <span className="text-sm bg-gray-700 px-2 py-1 rounded">{d.quantity_unit}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-gray-300">
                          Expires: {new Date(d.expiry).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-gray-300">From: {d.donor?.name || "Loading..."}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-gray-300">To: {d.recipient?.name || "Loading..."}</span>
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-2">
                        📍 {d.donor?.address || "Address loading..."}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-block px-3 py-1 bg-orange-600/20 border border-orange-600 text-orange-300 text-xs rounded-full font-medium">
                        Ready for Pickup
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleAccept(d.id)}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 px-6 rounded-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Accept Delivery
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* My Deliveries Section */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              My Delivery Pipeline
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Accepted Deliveries */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300">📋 Accepted</h3>
                  <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded-full">
                    {acceptedDeliveries.length}
                  </span>
                </div>
                
                {acceptedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-gray-400">No accepted deliveries</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {acceptedDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-3 space-y-1">
                          <div>⏰ Expires: {new Date(d.expiry).toLocaleDateString()}</div>
                          <div>📦 From: {d.donor?.name || "Loading..."}</div>
                          <div>🏠 To: {d.recipient?.name || "Loading..."}</div>
                        </div>
                        <button
                          onClick={() => handlePickup(d.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 text-sm font-medium"
                        >
                          Mark as Picked Up
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Picked Up Deliveries */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300">🚚 In Transit</h3>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    {pickedUpDeliveries.length}
                  </span>
                </div>
                
                {pickedUpDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🚚</div>
                    <p className="text-gray-400">No deliveries in transit</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {pickedUpDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-3 space-y-1">
                          <div>⏰ Expires: {new Date(d.expiry).toLocaleDateString()}</div>
                          <div>📦 From: {d.donor?.name || "Loading..."}</div>
                          <div>🏠 To: {d.recipient?.name || "Loading..."}</div>
                        </div>
                        <button
                          onClick={() => handleDelivered(d.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 text-sm font-medium"
                        >
                          Mark as Delivered
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Deliveries */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300">✅ Completed</h3>
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                    {completedDeliveries.length}
                  </span>
                </div>
                
                {completedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-gray-400">No completed deliveries yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {completedDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-2 space-y-1">
                          <div>✅ Delivered: {new Date(d.updated_at || d.created_at).toLocaleDateString()}</div>
                          <div>🔄 {d.donor?.name || "Unknown"} → {d.recipient?.name || "Unknown"}</div>
                        </div>
                        <div className="text-xs bg-green-600/20 border border-green-600 text-green-300 px-2 py-1 rounded text-center font-medium">
                          Successfully Delivered
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Section */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black px-12 py-4 text-xl rounded-full font-extrabold shadow-2xl hover:from-yellow-500 hover:via-orange-600 hover:to-yellow-500 transition-all duration-300 transform hover:scale-110 hover:shadow-3xl"
          >
            🔄 Refresh Deliveries
          </button>
          <p className="text-gray-400 text-sm mt-4">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </section>
    </div>
  );
}