import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ChangePassword from "./pages/AuthPages/ChangePassword";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ManageUserPasswords from "./pages/AuthPages/ManageUserPasswords";
import NotFound from "./pages/OtherPage/NotFound";
import TeamContactAdminPage from "./pages/TeamContactAdminPage";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import TestEmail from "./pages/TestEmail";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./context/PrivateRoute";
import RegisteredAgencies from "./pages/RegisteredAgencies";
import AgentDetail from "./pages/AgentDetail";
import AddBank from "./pages/AddBank";
import Sector from "./pages/Sector";
import Airline from "./pages/Airline";
import GroupTicketing from "./pages/GroupTicketing";
import GroupTicketingForm from "./pages/GroupTicketingForm";
import LocalGroupsByCategory from "./pages/LocalGroupsByCategory";
import ViewPaymentVoucher from "./pages/ViewPaymentVoucher";
import EditPaymentVoucher from "./pages/EditPaymentVoucher";
import ViewAccounts from "./pages/ViewAccounts";
import Ledger from "./pages/Ledger";
import AllBookings from "./pages/AllBookings";
import BookingDetail from "./pages/BookingDetail";
import SpecialOffers from "./pages/SpecialOffers/SpecialOffers";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ManageSectors from "./pages/ManageSectors/ManageSectors";
import ApiGroups from "./pages/ApiGroups/ApiGroups";
import UmrahPackagesBooking from "./pages/UmrahPackages/UmrahPackagesBooking";
import UmrahPackage from "./pages/UmrahPackage";
import UpdateUmrahPackage from "./pages/UpdateUmrahPackage";
import ManageUmrahPackage from "./pages/ManageUmrahPackage";
import Hotel from "./pages/Hotel";
import RateVolumes from "./pages/RateVolumes";
import Transport from "./pages/Transport";
import VisaManagement from "./pages/VisaManagement";
import ManageSubUsers from "./pages/ManageSubUsers";
import CreateEditSubUser from "./pages/CreateEditSubUser";
import GlobalSettings from "./pages/GlobalSettings";
import ActivityLogs from "./pages/ActivityLogs";
import Visa from "./pages/addVisa/visa";
import TransportRouteRates from "./pages/transfersRouteRates/TransportRouteRates";
import UpdatetransportRouteRates from "./pages/transfersRouteRates/UpdatetransportRouteRates";
import UpdateVisa from "./pages/updateVisas/updateVisa";
import UmrahRecords from "./pages/UmrahCalculator/UmrahCalculator";
import ManageUmrahQueries from "./pages/manageUmrahPackagesQueries/UmrahPackageQuery";
import ManageUmrahQueriesN from "./pages/manageUmrahPackagesQueries/UmrahPackageQueryN";
import UmrahBookingDetail from "./pages/UmrahBookingDetail/UmrahBookingDetail";
import XOReport from "./pages/XOReport";
import UpcomingDueDates from "./pages/UpcomingDueDates";
import GroupPassengerList from "./pages/GroupPassengerList";

export default function App() {
  return (
    <>
      <AuthProvider>
        <Router basename="/admin-portal/">
          <ScrollToTop />
          <Routes>
            <Route element={<PrivateRoute />}>
              {/* Dashboard Layout */}
              <Route element={<AppLayout />}>
                <Route index path="/" element={<Home />} />

                {/* Others Page */}
                <Route path="/profile" element={<UserProfiles />} />
                <Route path="/umrah-pkg-bookings" element={<UmrahPackagesBooking />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/blank" element={<Blank />} />
                <Route path="/registered-agencies" element={<RegisteredAgencies />} />
                <Route path="/registered-agencies/:id" element={<AgentDetail />} />
                <Route path="/add-bank" element={<AddBank />} />
                <Route path="/sector" element={<Sector />} />
                <Route path="/create-package" element={<UmrahPackage />} />
                <Route path="/create-package/:copyId" element={<UmrahPackage />} />
                <Route path="/manage-package" element={<ManageUmrahPackage />} />
                <Route path="/update-umrah-package/:id" element={<UpdateUmrahPackage />} />
                <Route path="/airline" element={<Airline />} />
                <Route path="/all-bookings" element={<AllBookings />} />
                <Route path="/booking-detail/:id" element={<BookingDetail />} />
                <Route path="/xo-report" element={<XOReport />} />
                <Route path="/upcoming-due-dates" element={<UpcomingDueDates />} />
                <Route path="/group-ticketing" element={<GroupTicketing />} />
                <Route path="/group-ticketing/create" element={<GroupTicketingForm />} />
                <Route path="/group-ticketing/create/:copyId" element={<GroupTicketingForm />} />
                <Route path="/group-ticketing/edit/:id" element={<GroupTicketingForm />} />
                <Route path="/group-passenger-list/:groupId" element={<GroupPassengerList />} />
                <Route path="/local-groups" element={<LocalGroupsByCategory />} />
                <Route path="/view-payment-voucher" element={<ViewPaymentVoucher />} />
                <Route path="/view-payment-voucher/edit/:id" element={<EditPaymentVoucher />} />
                <Route path="/special-offers" element={<SpecialOffers />} />
                <Route path="/manage-sectors" element={<ManageSectors />} />
                <Route path="/api-groups" element={<ApiGroups />} />
                <Route path="/view-accounts" element={<ViewAccounts />} />
                <Route path="/ledger/:id" element={<Ledger />} />

                <Route path="/hotel" element={<Hotel />} />
                <Route path="/rate-volumes" element={<RateVolumes />} />
                <Route path="/transport" element={<Transport />} />
                <Route path="/visaManagement" element={<VisaManagement />} />
                <Route path="/manage-sub-users" element={<ManageSubUsers />} />
                <Route path="/create-sub-user" element={<CreateEditSubUser />} />
                <Route path="/edit-sub-user/:id" element={<CreateEditSubUser />} />

                {/* Password Management */}
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/manage-user-passwords" element={<ManageUserPasswords />} />
                <Route path="/test-email" element={<TestEmail />} />

                {/* Umrah Calculators */}
                <Route path="/add-visa" element={<Visa />} />
                <Route path="/transport-route-rates" element={<TransportRouteRates />} />
                <Route path="/transport-route-rates/:id" element={<UpdatetransportRouteRates />} />
                <Route path="/update-ummrah-visa/:id" element={<UpdateVisa />} />
                <Route path="/umrah-calculator" element={<UmrahRecords />} />
                <Route path="/umrah-package-queries" element={<ManageUmrahQueries />} />
                <Route path="/umrah-booking-queries" element={<ManageUmrahQueriesN />} />
                <Route path="/umrah-booking-detail/:id" element={<UmrahBookingDetail />} />

                {/* Forms */}
                <Route path="/form-elements" element={<FormElements />} />

                {/* Tables */}
                <Route path="/basic-tables" element={<BasicTables />} />

                {/* Ui Elements */}
                <Route path="/team-contacts" element={<TeamContactAdminPage />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/avatars" element={<Avatars />} />
                <Route path="/badge" element={<Badges />} />
                <Route path="/buttons" element={<Buttons />} />
                <Route path="/images" element={<Images />} />
                <Route path="/videos" element={<Videos />} />

                {/* Charts */}
                <Route path="/line-chart" element={<LineChart />} />
                <Route path="/bar-chart" element={<BarChart />} />

                {/* Global Settings */}
                <Route path="/global-settings" element={<GlobalSettings />} />

                {/* Activity Logs */}
                <Route path="/activity-logs" element={<ActivityLogs />} />
              </Route>
            </Route>

            {/* Auth Layout */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 99999 }}
      />
    </>
  );
}
