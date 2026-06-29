import { Router } from "express";
import { createElection, startElection, endElection } from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth.middleware";

const router = Router();

router.post("/elections", requireAdmin, createElection);
router.post("/elections/:id/start", requireAdmin, startElection);
router.post("/elections/:id/end", requireAdmin, endElection);

export default router;


