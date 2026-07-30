// ============================================
// AL-HAIDER HELPER FUNCTIONS
// ============================================

import axios from "axios";

const ALI_HAIDER_API_TOKEN = process.env.ALI_HAIDER_API_TOKEN;
const BASE_URL = process.env.ALI_HAIDER_API_URL;

// Create axios instance with default config
const AlHaiderAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ALI_HAIDER_API_TOKEN}`,
  },
  timeout: 30000,
});

// Add response interceptor for error handling
AlHaiderAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("AlHaiderAPI API Error:", error.response.data);
      throw new Error(
        error.response.data.message || "AlHaiderAPI API request failed",
      );
    } else if (error.request) {
      console.error("AlHaiderAPI API No Response:", error.request);
      throw new Error("No response from AlHaiderAPI API");
    } else {
      console.error("AlHaiderAPI API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

/**
 * Format booking data for AlHaider API
 */
export const formatBookingForAlHaider = ({
  groupId,
  agencyInfo,
  passengers,
  pricing,
}) => {
  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Get title for AlHaider
  const getTitle = (type, existingTitle) => {
    if (existingTitle) {
      const upperTitle = existingTitle.toUpperCase();
      const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];
      if (validTitles.includes(upperTitle)) {
        return upperTitle;
      }
    }

    const titleMap = {
      Adult: "MR",
      Child: "CHD",
      Infant: "INF",
    };
    return titleMap[type] || "MR";
  };

  // Get passenger type for API
  const getPassengerType = (type) => {
    const typeMap = {
      Adult: "Adult",
      Child: "Child",
      Infant: "Infant",
    };
    return typeMap[type] || "Adult";
  };

  return {
    group_id: Number(groupId),
    agency_info: {
      group_id: Number(groupId),
      agent_name:
        agencyInfo.agentName || agencyInfo.name || agencyInfo.agent_name || "",
      agency_name:
        agencyInfo.agencyName ||
        agencyInfo.companyName ||
        agencyInfo.agency_name ||
        "",
      email: agencyInfo.email || "",
      mobile: agencyInfo.mobile || agencyInfo.phone || "",
      adults: agencyInfo.adults || pricing?.adults || 0,
      child: agencyInfo.child || pricing?.children || 0,
      infant: agencyInfo.infant || pricing?.infants || 0,
      agent_notes: agencyInfo.notes || agencyInfo.agentNotes || null,
    },
    booking_details: passengers.map((p) => {
      const type = getPassengerType(p.type);
      return {
        type: type,
        surname: p.surName || p.surname || "",
        given_name: p.givenName || p.firstName || "",
        title: getTitle(type, p.title),
        passport_no: p.passport || p.passportNo || "",
        dob: formatDate(p.dateOfBirth),
        doe: formatDate(p.passportExpiry),
      };
    }),
  };
};

/**
 * Book a group on AlHaider API - FIXED: Accepts the complete formatted data
 */
export const bookGroup = async (formattedData) => {
  try {
    // Validate required fields
    if (!formattedData.group_id) {
      throw new Error("Group ID is required");
    }
    if (!formattedData.agency_info) {
      throw new Error("Agency information is required");
    }
    if (
      !formattedData.booking_details ||
      !Array.isArray(formattedData.booking_details) ||
      formattedData.booking_details.length === 0
    ) {
      throw new Error("At least one passenger is required");
    }

    // Validate each passenger has required fields
    const requiredPassengerFields = [
      "type",
      "surname",
      "given_name",
      "title",
      "passport_no",
      "dob",
      "doe",
    ];
    formattedData.booking_details.forEach((passenger, index) => {
      const missingFields = requiredPassengerFields.filter(
        (field) => !passenger[field],
      );
      if (missingFields.length > 0) {
        throw new Error(
          `Passenger ${index + 1} is missing required fields: ${missingFields.join(", ")}`,
        );
      }
    });


    const response = await AlHaiderAPI.post(
      "/api/create/booking",
      formattedData,
    );

    return response.data;
  } catch (error) {
    console.error("❌ Failed to create booking on Alhaider:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
};
