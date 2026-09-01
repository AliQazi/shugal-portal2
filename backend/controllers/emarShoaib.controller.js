import axios from "axios";

const base_url = "https://abidairtravels.com/admins/api";

const token = "";

const API = axios.create({
  baseURL: base_url,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Token ${token}`,
  },
  timeout: 30000,
});

// Response Interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("Emmar Shoaib API Error:", error.response.data);
      throw new Error(
        error.response.data?.message || "Emmar Shoaib API request failed",
      );
    } else if (error.request) {
      console.error("Emmar Shoaib API No Response:", error.request);
      throw new Error("No response from Emmar Shoaib API");
    } else {
      console.error("Emmar Shoaib API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

/**
 * GET ALL GROUPS
 * GET /groups
 */
export const fetchGroups = async (req, res) => {
  try {
    const { type = "UMRAH GROUP" } = req.query;

    const response = await API.get("/groups", {
      params: {
        type,
        token,
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET GROUP DETAILS
 * GET /group-details
 */
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    const response = await API.get("/group-details", {
      params: {
        group_id: groupId,
        token,
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching group details:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * CREATE BOOKING
 * POST /booking
 */
export const createBooking = async (req, res) => {
  try {
    const payload = {
      token,
      ...req.body,
    };

    const response = await API.post("/booking", payload);

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET BOOKING DETAILS
 * GET /get-booking
 */
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const response = await API.get("/get-booking", {
      params: {
        booking_id: bookingId,
        token,
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching booking details:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
