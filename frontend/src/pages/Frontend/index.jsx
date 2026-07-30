import { useEffect, useState } from "react";
import {
  Route,
  Routes,
  Navigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import Header from "../../components/Header";
import Home from "./Home";
import Login from "../Auth/Login";
import AllGroups from "./AllGroups";
import BookingForm from "../../components/BookingForm";
import Bank from "./Bank";
import Footer from "../../components/Footer";
import NoPage from "../../components/NoPage";
import Register from "../Auth/Register";
import ForgotPassword from "../Auth/ForgotPassword";
import Payment from "./Payment";
import DashboardLayout from "../../components/Dashboard/DashboardLayout";
import Dashboard from "./Dashboard";
import Ledger from "./Ledger";
import ChangePassword from "../../components/ChangePassword/ChnagePassword";
import TeamContactList from "./Dashboard/TeamContactList";
import Profile from "../../components/Profile/Profile";
import MyBookings from "../MyBookings";
import BookingDetail from "../BookingDetail";
// import { groupTypes } from "../../data/groupTypes";
import { getUserProfile } from "../../api/profileApi";
import DetailPage from "./AllGroups/DetailPage";
import UmrahPackageBooking from "./UmrahPackagebooking/UmrahPackageBooking";
import UmrahBooking from "./UmrahPackagebooking/UmrahPackageBooking";
import AllGroupsPackages from "./AllGroups/AllGroups";
import UmrahBookingPage from "./UmrahBookingPage";
import UmrahRecords from "./UmrahQueires/UmrahQueries";
import UmrahPackageCalculator from "./UmrahCalculator";
import MyUmrahCalculator from "./MyUmrahCalculator/MyUmrahCalculator";
import UmrahCalculatorDetail from "./UmrahCalculatorDetail/UmrahCalculator";

export const groupTypes = [
  {
    label: "All Groups",
    value: "",
    path: "groups",
    ownGroupType: "",
  },
  // {
  //   label: "Umrah Packages",
  //   value: "Umrah Packages",
  //   path: "all-groups",
  //   ownGroupType: "Umrah Groups",
  // },
  {
    label: "Umrah Groups (Only Seats)",
    value: "UMRAH GROUP",
    path: "groups?group_type=UMRAH GROUP",
    ownGroupType: "Umrah Groups",
  },
  {
    label: "UAE (United Arab Emirates)",
    value: "UAE ONE WAY GROUP",
    path: "groups?group_type=UAE ONE WAY GROUP",
    ownGroupType: "UAE Groups",
  },
  {
    label: "KSA (Saudia Arabia) one way",
    value: "ONE WAY GROUP",
    path: "groups?group_type=ONE WAY GROUP",
    ownGroupType: "KSA Groups",
  },
  {
    label: "Kuwait (KWI)",
    value: "OMAN ONE WAY GROUP",
    path: "groups?group_type=OMAN ONE WAY GROUP",
    ownGroupType: "Mascat Groups",
  },
];

export default function Frontend() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await getUserProfile();
        const userData = response.data;

        if (userData) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUser(null);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogin = (userData) => {
    console.log("Login handler called with:", userData);
    setUser(userData);
  };

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("frontend_token");
    localStorage.removeItem("frontend_user");
    window.location.href = "/";
    setUser(null);
  };

  const normalizeParams = (str) => {
    return decodeURIComponent(str.replace(/\+/g, " "));
  };

  const handleGroupTypeChange = (groupType) => {
    if (groupType) {
      setSearchParams({ group_type: groupType });
    } else {
      setSearchParams({});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes with Header and Footer */}
      <Route
        path="/"
        element={
          <>
            <Header user={user} handleLogout={handleLogout} />
            <Home user={user} onLogin={handleLogin} />
            <Footer user={user} />
          </>
        }
      />
      <Route
        path="/home"
        element={
          <>
            <Header user={user} handleLogout={handleLogout} />
            <Home user={user} onLogin={handleLogin} />
            <Footer user={user} />
          </>
        }
      />
      <Route
        path="/auth/register"
        element={
          !user ? (
            <>
              <Header user={user} handleLogout={handleLogout} />
              <Register />
              <Footer user={user} />
            </>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/auth/login"
        element={
          !user ? (
            <>
              <Header user={user} handleLogout={handleLogout} />
              <Login onLogin={handleLogin} />
              <Footer user={user} />
            </>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/auth/forgot-password"
        element={
          <>
            <ForgotPassword />
          </>
        }
      />

      {/* Original Routes with Header and Footer - Protected */}
      <Route
        path="/all-groups"
        element={
          user ? (
            <>
              <Header user={user} handleLogout={handleLogout} />
              <div className="bg-gray-50">
                <div className="w-full min-h-screen mx-auto pt-22 px-3 sm:px-8 md:px-12">
                  <AllGroups
                    user={user}
                    headerType="frontend"
                    header={
                      <div>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">
                          Search Groups
                        </h1>
                        {/* <p className="text-sm sm:text-base text-gray-600">
                          Browse and book available flight groups
                        </p> */}
                      </div>
                    }
                    searchParams={searchParams}
                  />
                </div>
              </div>
              <Footer user={user} />
            </>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/banks"
        element={
          user ? (
            <>
              <Header user={user} handleLogout={handleLogout} />
              <Bank />
              <Footer user={user} />
            </>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/payment"
        element={
          user ? (
            <>
              <Header user={user} handleLogout={handleLogout} />
              <Payment />
              <Footer user={user} />
            </>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Dashboard Routes - Protected */}
      <Route
        path="/dashboard"
        element={
          user ? (
            <DashboardLayout user={user} handleLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="all-groups"
          element={
            <AllGroups
              user={user}
              headerType="dashboard"
              // header={
              //   <div className="flex flex-wrap gap-1 sm:gap-2">
              //     {groupTypes.map((type) => (
              //       <Link
              //         to={`/dashboard/${type.path}`}
              //         key={type.value}
              //         onClick={() => handleGroupTypeChange(type.value)}
              //         className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              //           (normalizeParams(searchParams.toString()) || "") ===
              //           normalizeParams(type.path.split("?")[1] || "")
              //             ? "bg-blue-600 text-white"
              //             : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              //         }`}
              //       >
              //         {type.label}
              //       </Link>
              //     ))}
              //   </div>
              // }
              searchParams={searchParams}
            />
          }
        />
        {/* Umrah Calculator */}
        <Route
          path="umrah-calculator"
          element={
            <>
              {/* <Header user={user} /> */}
              <UmrahPackageCalculator user={user} />
              {/* <Footer /> */}
            </>
          }
        />
        <Route
          path="my-umrah-calculator"
          element={<MyUmrahCalculator user={user} />}
        />
        <Route
          path="my-umrah-calculator-detail/:id"
          element={<UmrahCalculatorDetail />}
        />
        <Route
          path="my-umrah-calculator-q"
          element={<UmrahRecords user={user} />}
        />
        <Route path="booking" element={<BookingForm user={user} />} />
        <Route path="banks" element={<Bank />} />
        <Route
          path="groups"
          element={
            <AllGroupsPackages
              user={user}
              headerType="dashboard"
              header={
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {groupTypes.map((type) => (
                    <Link
                      to={`/dashboard/${type.path}`}
                      key={type.value}
                      onClick={() => handleGroupTypeChange(type.value)}
                      className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                        (normalizeParams(searchParams.toString()) || "") ===
                        normalizeParams(type.path.split("?")[1] || "")
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {type.label}
                    </Link>
                  ))}
                </div>
              }
              searchParams={searchParams}
            />
          }
        />
        <Route path="umrah-pkg-booking" element={<UmrahPackageBooking />} />
        <Route path="umrah-booking" element={<UmrahBooking />} />
        <Route path="payment" element={<Payment />} />
        <Route path="book-umrah" element={<UmrahBookingPage user={user} />} />
        <Route path="pkg-detail" element={<DetailPage user={user} />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="my-bookings" element={<MyBookings />} />
        <Route path="booking-detail/:id" element={<BookingDetail />} />
        <Route path="edit-booking/:id" element={<BookingForm />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="profile" element={<Profile />} />
        <Route path="team-contacts" element={<TeamContactList />} />
      </Route>

      {/* Profile Route - Standalone Protected */}
      <Route
        path="/profile"
        element={
          user ? (
            <>
              <Header user={user} handleLogout={handleLogout} />
              <Profile />
              <Footer user={user} />
            </>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* 404 Page */}
      <Route
        path="*"
        element={
          <>
            <Header user={user} handleLogout={handleLogout} />
            <NoPage />
            <Footer user={user} />
          </>
        }
      />
    </Routes>
  );
}
