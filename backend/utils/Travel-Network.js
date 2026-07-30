import axios from "axios";

const TNT_API_TOKEN = process.env.TNT_API_TOKEN;
const BASE_URL = process.env.TNT_API_URL;

// Create axios instance with default config
const TravelNetwork = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TNT_API_TOKEN}`,
  },
  timeout: 30000,
});

// Add response interceptor for error handling
TravelNetwork.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("Travel Network API Error:", error.response.data);
      // Preserve the full response data on the error so callers can inspect it
      const enhancedError = new Error(
        error.response.data?.message || "Travel Network API request failed",
      );
      enhancedError.tntResponseData = error.response.data;
      enhancedError.tntStatusCode = error.response.status;
      throw enhancedError;
    } else if (error.request) {
      console.error("Travel Network API No Response:", error.request);
      throw new Error("No response from Travel Network API");
    } else {
      console.error("Travel Network API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

export const getGroupPackagesTNT = async () => {
  try {
    let groupRes = await TravelNetwork.get("/api/available/groups");
    return groupRes?.data?.groups || [];
  } catch (error) {
    console.log("Error fetching groups from travel network", error.message);
  }
};

export const getUmrahPackagesTNT = async () => {
  try {
    // Pehle total pages ka pata karein
    const firstResponse = await TravelNetwork.get("/api/umrah-packages?page=1");

    if (!firstResponse?.data?.packages?.data) {
      return [];
    }

    const pagination = firstResponse.data.packages;
    const totalPages = pagination.last_page || 1;
    const firstPageData = pagination.data || [];

    // Agar sirf ek page hai toh wapas karein
    if (totalPages === 1) {
      return firstPageData;
    }

    // Baqi pages ke liye parallel requests
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        TravelNetwork.get(`/api/umrah-packages?page=${page}`)
          .then((res) => res?.data?.packages?.data || [])
          .catch((err) => {
            console.log(`Error fetching page ${page}:`, err.message);
            return [];
          }),
      );
    }

    // Sab requests ek saath bhejein
    const otherPagesData = await Promise.all(pagePromises);

    // Sab data combine karein
    const allPackages = [firstPageData, ...otherPagesData].flat();

    return allPackages;
  } catch (error) {
    console.log("Error fetching packages from travel network", error.message);
    return [];
  }
};

export const bookGroupTNT = async (data) => {
  try {
    const res = await TravelNetwork.post("/api/create/booking", data);
    return res.data;
  } catch (error) {
    // ─── Fare changed: TNT returns new group_price_detail_id — retry automatically ───
    const tntData = error.tntResponseData;
    if (
      tntData &&
      tntData.error === true &&
      tntData.data?.group_price_detail_id &&
      tntData.data?.new_price !== undefined
    ) {
      console.log(
        `⚠️ TNT fare changed. Old price detail ID: ${data.group_price_detail_id}, New: ${tntData.data.group_price_detail_id} (PKR ${tntData.data.new_price}). Retrying...`,
      );

      // Resend with updated group_price_detail_id
      const retryData = {
        ...data,
        group_price_detail_id: tntData.data.group_price_detail_id,
      };

      try {
        const retryRes = await TravelNetwork.post(
          "/api/create/booking",
          retryData,
        );
        console.log("✅ TNT booking succeeded after fare change retry");
        // Return response with flag so caller can update stored pricing
        return {
          ...retryRes.data,
          _fareChanged: true,
          _newGroupPriceDetailId: tntData.data.group_price_detail_id,
          _newPrice: tntData.data.new_price,
        };
      } catch (retryError) {
        console.log("TNT Book group ticket retry error", retryError.message);
        throw retryError;
      }
    }

    console.log("TNT Book group ticket error", error.message);
    throw error;
  }
};

export const getTNTUser = async () => {
  try {
    const res = await TravelNetwork.get("/api/user");
    return res.data;
  } catch (error) {
    console.log("TNT get user error", error.message);
    throw error;
  }
};

export const bookUmrahTNT = async (data) => {
  try {
    const res = await TravelNetwork.post("/api/store/umrah-bookings", data);
    return res.data;
  } catch (error) {
    console.log("TNT Book umrah ticket error", error.message);
    throw error;
  }
};

export const getUmrahBookingTNT = async (umrahBookingId) => {
  try {
    const res = await TravelNetwork.get(`/api/umrah-bookings/${umrahBookingId}`);
    return res.data;
  } catch (error) {
    console.log("TNT get umrah booking error", error.message);
    throw error;
  }
};
