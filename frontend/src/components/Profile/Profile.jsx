import { useState, useEffect } from "react";
import { getUserProfile, updateUserProfile } from "../../api/profileApi";
import TopBar from "../TopBar/TopBar";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    city: "",
    country: "",
    consultant: "",
    address: "",
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile();

      if (response.success) {
        const userData = response.data;
        setUser(userData);
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          companyName: userData.companyName || "",
          city: userData.city || "",
          country: userData.country || "",
          consultant: userData.consultant || "",
          address: userData.address || "",
        });
        if (userData.logo) {
          setLogoPreview(userData.logo);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to fetch profile");
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.email || !formData.phone) {
      setError("Please fill in all required fields (Name, Email, Phone)");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const updateData = { ...formData };

      // If there's a logo file, convert to base64 and include
      if (logoFile) {
        updateData.logo = logoPreview;
      }

      const response = await updateUserProfile(updateData);

      if (response.success) {
        setSuccess("Profile updated successfully!");

        // Update localStorage with new data
        const storedUser = localStorage.getItem("frontend_user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const updatedUser = { ...parsedUser, ...response.data };
          localStorage.setItem("frontend_user", JSON.stringify(updatedUser));
        }

        // Refresh profile data
        fetchUserProfile();

        // Clear success message after 3 seconds
        // setTimeout(() => setSuccess(""), 3000);
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Failed to update profile");
      console.error("Error updating profile:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar title={"My Profile"} />
      <div className="w-full min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-6">
          {/* Profile Form */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
            <div className="px-6 py-4 bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] border-b border-gray-200">
              <h2 className="text-lg font-bold text-white">
                Update Your Profile
              </h2>
            </div>

            <div className="px-6 py-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      User Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your name"
                      required
                      readOnly
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                      readOnly
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="consultant"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      Contact Person Name
                    </label>
                    <input
                      type="text"
                      id="consultant"
                      name="consultant"
                      value={formData.consultant}
                      onChange={handleInputChange}
                      placeholder="Enter contact person name"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      Phone No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      required
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="city"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="country"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="Enter country"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      Address. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="address"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter address"
                      required
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <label
                    htmlFor="logo"
                    className="block text-sm font-bold text-gray-900 mb-3"
                  >
                    Upload New Logo
                  </label>
                  {logoPreview && (
                    <div className="mb-4 flex justify-center">
                      <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Accepted formats: JPG, PNG, GIF. Max size: 5MB
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={updating}
                    className={`px-10 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transform transition-all duration-300 ${
                      updating
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white hover:from-[#2d5a8f] hover:to-[#1e3a5f] hover:scale-105 hover:shadow-2xl active:scale-95"
                    }`}
                  >
                    {updating ? (
                      <>
                        <svg
                          className="animate-spin w-5 h-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Update Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
