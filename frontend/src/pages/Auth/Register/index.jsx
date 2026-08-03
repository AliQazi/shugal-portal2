import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import countryCodes from "../../../data/countryCodes.json"; // adjust path
import Select from "react-select";
import Header from "../../../components/Header";
import CommonSections from "../../../components/CommonSections";
import bg from "../../../assets/images/bahrain.webp";
import { theme } from "../../../theme/theme";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "",
    address: "",
    city: "",
    role: "Agency",
    companyName: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Auto-generate a secure password since the form omits password fields
    const generatedPassword = Math.random().toString(36).slice(-10) + "A1!";

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: generatedPassword,
        plainPassword: generatedPassword,
        companyName: formData.companyName.trim(),
        phone: `${formData.countryCode || ""}${formData.phone.trim()}`.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        role: "Agency",
      };

      const res = await axiosInstance.post("/auth/register", payload);

      if (res.status === 201) {
        toast.success("Registration successful! Please login.");
        navigate("/");
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || "Registration failed");
      } else {
        toast.error("Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const options = countryCodes.map((c) => ({
    value: `+${c.code}`,
    label: `${String.fromCodePoint(
      ...[...c.iso].map((ch) => 127397 + ch.charCodeAt()),
    )} ${c.country} (+${c.code})`,
  }));

  const primaryColor = theme?.colors?.primary || "#1a417a";

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 46,
      height: 46,
      backgroundColor: "#ffffff",
      borderColor: state.isFocused ? primaryColor : "#e5e7eb",
      borderRadius: "0.5rem",
      fontSize: "14px",
      boxShadow: "none",
      "&:hover": {
        borderColor: state.isFocused ? primaryColor : "#d1d5db",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 12px",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: 44,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 50,
      fontSize: "14px",
    }),
  };

  // Find selected value
  const selectedOption = options.find(
    (opt) => opt.value === formData.countryCode,
  );

  return (
    <>
      <Header />

      {/* Structural Minimalist Split-Screen Framework */}
      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans pt-20">
        {/* --- LEFT SIDE: Sticky Brand Info & Fixed Image Scrim Panel --- */}
        <div className="w-full lg:w-5/12 relative min-h-80 lg:min-h-0 overflow-hidden flex flex-col justify-between p-8 md:p-16 text-white">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ backgroundImage: `url(${bg})` }}
          />
          <div className="absolute inset-0 bg-neutral-900/70" />

          <div className="relative z-10 space-y-3">
            <span className="text-[10px] uppercase tracking-widest text-orange-400 font-bold bg-white/10 px-2.5 py-1 rounded">
              B2B Portal Access
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight pt-2">
              Expand Your Agency <br />
              With Abid Air Travel & Tours.
            </h2>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/20 max-w-sm">
            <p className="text-white/80 text-xs leading-relaxed font-medium">
              Gain direct access to inventory, exclusive global flight
              structures, and high-success visa automation tools built
              specifically for travel agents.
            </p>
          </div>
        </div>

        {/* --- RIGHT SIDE: Focused Clean Form Container --- */}
        <div
          className="w-full lg:w-7/12 p-8 md:p-16 flex flex-col justify-center items-center"
          style={{ backgroundColor: theme?.colors?.lightBg || "#f8fafc" }}
        >
          <div className="w-full max-w-xl bg-white rounded-xl border border-neutral-100 shadow-sm p-6 md:p-10 flex flex-col gap-6">
            <div className="space-y-1">
              <h1
                className="text-2xl font-black tracking-tight"
                style={{ color: theme?.colors?.primary || "#1a417a" }}
              >
                Create Agent Account
              </h1>
              <p className="text-xs font-medium text-gray-400">
                Already registered?{" "}
                <Link
                  to="/auth/login"
                  className="font-bold hover:underline"
                  style={{ color: theme?.colors?.accent || "#f15a24" }}
                >
                  Log in to portal
                </Link>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              className="space-y-4"
            >
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                    Agency Details
                  </label>
                  <input
                    autoComplete="organization"
                    type="text"
                    name="companyName"
                    placeholder="Agency Name"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                      Contact Agent
                    </label>
                    <input
                      autoComplete="name"
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                      Email Address
                    </label>
                    <input
                      autoComplete="email"
                      type="email"
                      name="email"
                      placeholder="name@agency.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                    Phone Number
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      options={options}
                      value={selectedOption}
                      onChange={(selected) =>
                        handleChange({
                          target: {
                            name: "countryCode",
                            value: selected?.value || "",
                          },
                        })
                      }
                      className="w-full"
                      classNamePrefix="country-select"
                      placeholder="Select Code"
                      styles={selectStyles}
                      isSearchable
                    />
                    <input
                      type="text"
                      name="phone"
                      placeholder="Cell Number"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                      Office Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      placeholder="Street, Suite Info"
                      autoComplete="street-address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      placeholder="City Name"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all duration-150 text-white shadow-sm mt-4 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: loading
                    ? undefined
                    : theme?.colors?.primary || "#1a417a",
                }}
              >
                {loading ? "Creating Account..." : "Register Partner Agency"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <CommonSections />
    </>
  );
};

export default Register;
