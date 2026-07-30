import express from "express";
import {
  getRules,
  upsertRule,
  bulkUpsertRules,
  deleteRule,
  getRulesMeta,
} from "../controllers/groupPricingRule.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/meta", getRulesMeta);
router.get("/", getRules);
router.post("/", upsertRule);
router.post("/bulk", bulkUpsertRules);
router.delete("/:id", deleteRule);

export default router;