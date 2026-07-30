import React, { useState } from "react";
import { X, Plus, Trash2, User, Phone, Mail, FileText } from "lucide-react";
import { theme } from "../theme/theme";
import { createUmrahBooking } from "../api/umrahBookingApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const UmrahBookingForm = ({
  isOpen,
  onClose,
  packageData,
  selectedRoom,
  pricePerPerson,
  user,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    contactPerson: {
      name: "",
      phone: "",
      email: "",
      whatsapp: "",
      cnic: "",
      address: "",
    },
    passengers: [
      {
        type: "Adult",
        title: "Mr",
        givenName: "",
        surName: "",
        passport: "",
        dateOfBirth: "",
        passportExpiry: "",
        passportIssue: "",
        nationality: "Pakistan",
        cnicNumber: "",
      },
    ],
    specialRequests: "",
  });

  const handleContactChange = (field, value) => {
    setFormData({
      ...formData,
      contactPerson: {
        ...formData.contactPerson,
        [field]: value,
      },
    });
  };

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = [...formData.passengers];
    updatedPassengers[index][field] = value;
    setFormData({ ...formData, passengers: updatedPassengers });
  };

  const addPassenger = () => {
    setFormData({
      ...formData,
      passengers: [
        ...formData.passengers,
        {
          type: "Adult",
          title: "Mr",
          givenName: "",
          surName: "",
          passport: "",
          dateOfBirth: "",
          passportExpiry: "",
          passportIssue: "",
          nationality: "Pakistan",
          cnicNumber: "",
        },
      ],
    });
  };

  const removePassenger = (index) => {
    if (formData.passengers.length > 1) {
      const updatedPassengers = formData.passengers.filter(
        (_, i) => i !== index,
      );
      setFormData({ ...formData, passengers: updatedPassengers });
    }
  };

  const calculateTotalPrice = () => {
    return pricePerPerson * formData.passengers.length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingPayload = {
        packageId:
          packageData._id ||
          packageData.id ||
          packageData.voucher_id ||
          "PKG-" + Date.now(),
        packageName:
          packageData.packageName ||
          packageData.title ||
          packageData.name ||
          "Umrah Package",
        packageSource: packageData.packageSource || "local-db", // Track package source
        user: user || "Guest",
        contactPerson: formData.contactPerson,
        passengers: formData.passengers,
        roomType: selectedRoom,
        pricing: {
          pricePerPerson: pricePerPerson,
          currency: "PKR",
        },
        flightDetails: {
          departure: {
            date: packageData.details?.[0]?.depDate,
            from: packageData.details?.[0]?.sectorFrom,
            to: packageData.details?.[0]?.sectorTo,
            flightNumber: packageData.details?.[0]?.flightNo,
          },
          return: packageData.returnFlight
            ? {
                date: packageData.returnDate,
                flightNumber: packageData.returnFlight,
              }
            : undefined,
        },
        specialRequests: formData.specialRequests,
        // overallStatus will default to "Pending" from model
      };

      const response = await createUmrahBooking(bookingPayload);

      if (response.success) {
        toast.success(
          "Booking submitted successfully! Booking Number: " +
            response.data.bookingNumber,
        );
        onClose();
        // Reset form
        setFormData({
          contactPerson: {
            name: "",
            phone: "",
            email: "",
            whatsapp: "",
            cnic: "",
            address: "",
          },
          passengers: [
            {
              type: "Adult",
              title: "Mr",
              givenName: "",
              surName: "",
              passport: "",
              dateOfBirth: "",
              passportExpiry: "",
              passportIssue: "",
              nationality: "Pakistan",
              cnicNumber: "",
            },
          ],
          specialRequests: "",
        });
        setCurrentStep(1);
        setTimeout(() => {
          navigate("/dashboard/umrah-booking");
        }, 1000);
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(
        "Failed to submit booking: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "25px 30px",
            background: theme.colors.ublGradient,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              Book Umrah Package
            </h2>
            <p
              style={{ margin: "5px 0 0 0", opacity: 0.9, fontSize: "0.9rem" }}
            >
              {packageData?.packageName ||
                packageData?.title ||
                packageData?.name}{" "}
              - {selectedRoom} Room
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: "flex",
            padding: "20px 30px",
            borderBottom: "1px solid #e2e8f0",
            gap: "20px",
          }}
        >
          <StepButton
            number={1}
            label="Contact Info"
            isActive={currentStep === 1}
            onClick={() => setCurrentStep(1)}
          />
          <StepButton
            number={2}
            label="Passenger Details"
            isActive={currentStep === 2}
            onClick={() => setCurrentStep(2)}
          />
          <StepButton
            number={3}
            label="Review & Submit"
            isActive={currentStep === 3}
            onClick={() => setCurrentStep(3)}
          />
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "30px" }}>
            {/* Step 1: Contact Person */}
            {currentStep === 1 && (
              <div>
                <h3
                  style={{
                    marginBottom: "20px",
                    fontSize: "1.2rem",
                    color: "#2d3748",
                  }}
                >
                  <User
                    size={20}
                    style={{ verticalAlign: "middle", marginRight: "8px" }}
                  />
                  Contact Person Details
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson.name}
                      onChange={(e) =>
                        handleContactChange("name", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.contactPerson.phone}
                      onChange={(e) =>
                        handleContactChange("phone", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="+92 300 1234567"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.contactPerson.email}
                      onChange={(e) =>
                        handleContactChange("email", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp Number</label>
                    <input
                      type="tel"
                      value={formData.contactPerson.whatsapp}
                      onChange={(e) =>
                        handleContactChange("whatsapp", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="+92 300 1234567"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>CNIC Number</label>
                    <input
                      type="text"
                      value={formData.contactPerson.cnic}
                      onChange={(e) =>
                        handleContactChange("cnic", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="12345-1234567-1"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input
                      type="text"
                      value={formData.contactPerson.address}
                      onChange={(e) =>
                        handleContactChange("address", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="Full address"
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "30px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={primaryButtonStyle}
                  >
                    Next: Passenger Details →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Passenger Details */}
            {currentStep === 2 && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h3
                    style={{ margin: 0, fontSize: "1.2rem", color: "#2d3748" }}
                  >
                    <FileText
                      size={20}
                      style={{ verticalAlign: "middle", marginRight: "8px" }}
                    />
                    Passenger Details ({formData.passengers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addPassenger}
                    style={addButtonStyle}
                  >
                    <Plus size={16} /> Add Passenger
                  </button>
                </div>

                {formData.passengers.map((passenger, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "25px",
                      padding: "20px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h4
                        style={{ margin: 0, color: "#2d3748", fontWeight: 600 }}
                      >
                        Passenger {index + 1}
                      </h4>
                      {formData.passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePassenger(index)}
                          style={deleteButtonStyle}
                        >
                          <Trash2 size={16} /> Remove
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 2fr 2fr",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Type *</label>
                        <select
                          required
                          value={passenger.type}
                          onChange={(e) =>
                            handlePassengerChange(index, "type", e.target.value)
                          }
                          style={inputStyle}
                        >
                          <option value="Adult">Adult</option>
                          <option value="Child">Child</option>
                          <option value="Infant">Infant</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Title *</label>
                        <select
                          required
                          value={passenger.title}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "title",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Ms">Ms</option>
                          <option value="Miss">Miss</option>
                          <option value="Dr">Dr</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Given Name *</label>
                        <input
                          type="text"
                          required
                          value={passenger.givenName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "givenName",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Surname *</label>
                        <input
                          type="text"
                          required
                          value={passenger.surName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "surName",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Passport Number *</label>
                        <input
                          type="text"
                          required
                          value={passenger.passport}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "passport",
                              e.target.value.toUpperCase(),
                            )
                          }
                          style={inputStyle}
                          placeholder="AA1234567"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Date of Birth *</label>
                        <input
                          type="date"
                          required
                          value={passenger.dateOfBirth}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "dateOfBirth",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Nationality *</label>
                        <input
                          type="text"
                          required
                          value={passenger.nationality}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "nationality",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                          placeholder="Pakistan"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Passport Expiry *</label>
                        <input
                          type="date"
                          required
                          value={passenger.passportExpiry}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "passportExpiry",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Passport Issue</label>
                        <input
                          type="date"
                          value={passenger.passportIssue}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "passportIssue",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>CNIC Number</label>
                        <input
                          type="text"
                          value={passenger.cnicNumber}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "cnicNumber",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                          placeholder="12345-1234567-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    style={secondaryButtonStyle}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    style={primaryButtonStyle}
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div>
                <h3
                  style={{
                    marginBottom: "20px",
                    fontSize: "1.2rem",
                    color: "#2d3748",
                  }}
                >
                  Review Your Booking
                </h3>

                <div style={reviewCardStyle}>
                  <h4 style={reviewHeadingStyle}>Package Details</h4>
                  <div style={reviewRowStyle}>
                    <span>Package:</span>
                    <strong>
                      {packageData?.packageName ||
                        packageData?.title ||
                        packageData?.name}
                    </strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Room Type:</span>
                    <strong style={{ textTransform: "capitalize" }}>
                      {selectedRoom}
                    </strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Price Per Person:</span>
                    <strong>PKR {pricePerPerson?.toLocaleString()}</strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Total Passengers:</span>
                    <strong>{formData.passengers.length}</strong>
                  </div>
                  <div
                    style={{
                      ...reviewRowStyle,
                      borderTop: "2px solid #e2e8f0",
                      paddingTop: "12px",
                      marginTop: "12px",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                      Total Amount:
                    </span>
                    <strong
                      style={{
                        fontSize: "1.3rem",
                        color: theme.colors.success,
                      }}
                    >
                      PKR {calculateTotalPrice().toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div style={reviewCardStyle}>
                  <h4 style={reviewHeadingStyle}>Contact Person</h4>
                  <div style={reviewRowStyle}>
                    <span>Name:</span>
                    <strong>{formData.contactPerson.name}</strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Phone:</span>
                    <strong>{formData.contactPerson.phone}</strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Email:</span>
                    <strong>{formData.contactPerson.email}</strong>
                  </div>
                </div>

                <div style={reviewCardStyle}>
                  <h4 style={reviewHeadingStyle}>Passengers</h4>
                  {formData.passengers.map((pax, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <strong>
                        {idx + 1}. {pax.title}. {pax.givenName} {pax.surName}
                      </strong>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#718096",
                          marginTop: "5px",
                        }}
                      >
                        {pax.type} | Passport: {pax.passport} | DOB:{" "}
                        {pax.dateOfBirth}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label style={labelStyle}>Special Requests (Optional)</label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialRequests: e.target.value,
                      })
                    }
                    style={{
                      ...inputStyle,
                      minHeight: "80px",
                      resize: "vertical",
                    }}
                    placeholder="Any special requests or notes..."
                  />
                </div>

                <div
                  style={{
                    marginTop: "30px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={secondaryButtonStyle}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...primaryButtonStyle,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Submitting..." : "Confirm Booking ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-components
const StepButton = ({ number, label, isActive, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      opacity: isActive ? 1 : 0.5,
    }}
  >
    <div
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: isActive ? theme.colors.ublGradient : "#cbd5e0",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
      }}
    >
      {number}
    </div>
    <span
      style={{
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "#2d3748" : "#718096",
      }}
    >
      {label}
    </span>
  </div>
);

// Styles
const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#4a5568",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e0",
  borderRadius: "8px",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "12px 30px",
  background: theme.colors.ublGradient,
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const secondaryButtonStyle = {
  padding: "12px 30px",
  background: "white",
  color: "#2d3748",
  border: "2px solid #e2e8f0",
  borderRadius: "10px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const addButtonStyle = {
  padding: "10px 20px",
  background: "#48bb78",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "0.9rem",
};

const deleteButtonStyle = {
  padding: "8px 16px",
  background: "#f56565",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "0.85rem",
};

const reviewCardStyle = {
  padding: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  marginBottom: "20px",
  background: "#fff",
};

const reviewHeadingStyle = {
  margin: "0 0 15px 0",
  fontSize: "1rem",
  fontWeight: 700,
  color: "#2d3748",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "10px",
};

const reviewRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  fontSize: "0.9rem",
  color: "#4a5568",
};

export default UmrahBookingForm;
