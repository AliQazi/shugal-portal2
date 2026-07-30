import axiosInstance from "./axios";

// Get user profile
export const getUserProfile = async () => {
  try {
    const response = await axiosInstance.get("/auth/profile");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    const response = await axiosInstance.put("/auth/profile", profileData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Upload logo (if using cloudinary or file upload)
export const uploadLogo = async (file) => {
  try {
    const formData = new FormData();
    formData.append("logo", file);
    
    const response = await axiosInstance.post("/upload/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
