import express from "express";
import { fetchZIPUmrahPkgs } from "../controllers/umrahPkg.controller.js";
import {
  getAllAccounts,
  getSubhead1,
  getSubhead2,
  getChartheads,
  getCategorizedAccounts,
  getAccountById,
  getAccountByName,
  getSubhead1ById,
  getSubhead2ById,
  getSubhead1ByName,
  getSubhead2ByName,
  getAccountsBySubhead2Id,
  getSubhead2BySubhead1Id,
  getConsultants,
  getVouchers,
} from "../controllers/zipAccounts.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/umrahPackages", fetchZIPUmrahPkgs);

router.get("/chartheads", protect, getChartheads);

router.get("/subhead1", protect, getSubhead1);
router.get("/subhead1/:id", protect, getSubhead1ById);
router.get("/subhead1/byName/:name", protect, getSubhead1ByName);

router.get("/subhead2", protect, getSubhead2);
router.get("/subhead2/:id", protect, getSubhead2ById);
router.get("/subhead2/byName/:name", protect, getSubhead2ByName);
router.get(
  "/subhead2/bySubhead1Id/:subhead1Id",
  protect,
  getSubhead2BySubhead1Id,
);

router.get("/accounts", protect, getAllAccounts);
router.get("/accounts/categorized", protect, getCategorizedAccounts);
router.get("/accounts/:id", protect, getAccountById);
router.get("/accounts/byName/:name", protect, getAccountByName);
router.get(
  "/accounts/bySubhead2Id/:subhead2Id",
  protect,
  getAccountsBySubhead2Id,
);
router.get("/consultants", protect, getConsultants);
router.get("/vouchers", protect, getVouchers);

export default router;
