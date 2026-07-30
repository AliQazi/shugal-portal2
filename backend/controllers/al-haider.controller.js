import axios from "axios";

export const fetchNormalisedAlHaiderGroups = async (req, res) => {
  try {
    const token = process.env.ALI_HAIDER_API_TOKEN;

    const response = await axios.get(
      `${process.env.ALI_HAIDER_API_URL}api/available/groups?type=0&airline_id=0`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.data || !response.data.groups) {
      console.warn("Al-Haider API returned unexpected structure:", response.data);
      return [];
    }

    const normalizedGroups = response.data.groups.map((group) => {
      // ✅ FIX: Use available_no_of_pax from group level
      const totalSeats = parseInt(group.available_no_of_pax) || 0;

      // Normalize details - keep original data
      const normalizedDetails = group.details?.map((detail) => ({
        sr: parseInt(detail.sr) || 0,
        flight_no: detail.flight_no || "",
        dep_date: detail.flight_date || group.dept_date || "",
        dept_time: detail.dept_time || "",
        origin: detail.origin || "",
        destination: detail.destination || "",
        arv_date: group.arv_date || null,
        arv_time: detail.arv_time || "",
        baggage: detail.baggage || group.baggage || "",
        meal: group.meal || "",
        bookedSeats: 0,
      })) || [];

      // Get airline name from airline object
      const airlineName = group.airline?.airline_name || "";
      const shortName = group.airline?.short_name || "";

      return {
        id: group.id || `alhaider_${Date.now()}_${Math.random()}`,
        source: "al-haider",
        isOwnGroup: false,
        
        sector: group.sector || "",
        sectorKey: group.sector || "",
        type: group.type || "",
        
        // ✅ Use the available_no_of_pax from group
        available_no_of_pax: totalSeats,
        showSeat: true, // Show seats for Al-Haider groups
        _totalOriginalSeats: totalSeats,
        _onHoldSeats: 0,
        _activeBookings: 0,
        
        price: parseFloat(group.price) || 0,
        childPrice: 0,
        infantPrice: 0,
        
        pnr: group.pnr || "",
        
        dept_date: group.dept_date || null,
        arv_date: group.arv_date || null,
        
        details: normalizedDetails,
        
        airline: {
          id: group.airline_id || null,
          airline_name: airlineName,
          short_name: shortName || airlineName.substring(0, 2),
          logo_url: group.airline?.logo_url || null,
        },
        
        user: null,
        bookedSeats: 0,
      };
    });
    
    // If called as API endpoint
    if (res) {
      return res.status(200).json({
        success: true,
        data: normalizedGroups,
        count: normalizedGroups.length,
      });
    }
    
    return normalizedGroups;
    
  } catch (error) {
    console.error("AL-HAIDER API ERROR:", error.message || error);
    
    if (res) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch Al-Haider groups",
      });
    }
    
    throw new Error(`Al-Haider fetch failed: ${error.message}`);
  }
};

export const getAirlines = async (req, res) => {
  try {
    // Get auth token from environment
    const token = process.env.ALI_HAIDER_API_TOKEN;
    const response = await axios.get(
      `${process.env.ALI_HAIDER_API_URL}api/available/airlines`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("AL-HAIDER API ERROR:", error.message || error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
