import express from "express";
import {
    createUmrahCalculator,
    getAllUmrahCalculators,
    getUmrahCalculatorById,
    updateUmrahCalculator,
    deleteUmrahCalculator,
    getUmrahCalculationsByUserId,
    updateUmrahStatusController,
    VisaController,
    viewAllVisasController,
    deleteVisaController,
    viewVisaOnIDController,
    updateVisaController,
    transportRouteRatesController,
    viewTransportRouteRatesByIdController,
    updateTransportRouteRatesController,
    viewTransportRouteRatesController,
    roomController,
    updateRoomGroupController,
    createSector,
    getAllSectors,
    getSectorById,
    addUmrahBookingController,
    dashboardStatsController,
    updateUmrahBookingController,
    deleteUmrahController,
    viewAllUmrahBookingsByIdDController,
    viewAllUmrahBookingController,
} from "../controller/umrahCalculatorController.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// ➕ Create new record
router.post("/addUmrahCalculator", createUmrahCalculator);

// 📥 Get all records
router.get("/getUmrahCalculator", getAllUmrahCalculators);
router.get("/umrahbookings/user/:userId", getUmrahCalculationsByUserId);

// 📥 Get single record
router.get("/getUmrahCalculator/:id", getUmrahCalculatorById);

// ✏️ Update record
router.put("/getUmrahCalculator/:id", updateUmrahCalculator);

// 🗑 Delete record
router.delete("/umrahCalculator/:id", deleteUmrahCalculator);
router.put('/umrahCalculator/:umrahId/status', updateUmrahStatusController);

// visa
router.post("/addVisa", upload.none(), VisaController);
router.get("/viewAllVisas", viewAllVisasController);
router.delete("/deleteVisa/:id", deleteVisaController);
router.get("/viewVisa/:id", viewVisaOnIDController)
router.put("/visa/:id", updateVisaController)

//transportation
router.post("/transport-route-rates", transportRouteRatesController);
router.get("/viewTransportRouteRates", viewTransportRouteRatesController);
router.post("/viewTransportRouteRatesbyId/:id", viewTransportRouteRatesByIdController);
router.put("/update-transport-route-rates/:id", updateTransportRouteRatesController);

// room routes
router.put("/addRooms/:id", roomController);
router.put("/updateRoomGroup/:id", updateRoomGroupController);

// sector
router.post('/sectors', createSector);
router.get('/sectors', getAllSectors);
router.get('/sectors/:id', getSectorById);

// umrah group
router.post("/addUmrahBooking", upload.none(), addUmrahBookingController);
router.get("/viewAllUmrahBookings", viewAllUmrahBookingController);
router.get("/viewAllUmrahBookingsById/:id", viewAllUmrahBookingsByIdDController);
router.delete("/umrahPackage/:id", deleteUmrahController);
router.put("/updateUmrahBooking/:id", updateUmrahBookingController);
router.get("/dashboard-stats", dashboardStatsController);

export default router;
