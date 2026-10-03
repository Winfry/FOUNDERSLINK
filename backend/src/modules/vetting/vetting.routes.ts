import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  fileForAdmin,
  MAX_BYTES,
  purgeExpired,
  removeDocument,
  reviewDocument,
  reviewSchema,
  uploadDocument,
  uploadSchema,
} from "./documents.js";
import {
  applicationSchema,
  decide,
  decisionSchema,
  getApplication,
  getApplicationForReview,
  getQueue,
  listAdminActions,
  listRechecks,
  reasonSchema,
  recheck,
  recheckSchema,
  saveApplication,
  setSuspended,
  submitApplication,
} from "./vetting.service.js";

export const vettingRouter = Router();

const id = (value: unknown) => z.uuid().parse(value);

// The applicant's side.

vettingRouter.get("/vetting/application", requireAuth, async (req, res) => {
  res.json(await getApplication(req.user!.id));
});

vettingRouter.patch("/vetting/application", requireAuth, async (req, res) => {
  res.json(await saveApplication(req.user!.id, applicationSchema.parse(req.body)));
});

vettingRouter.post("/vetting/application/submit", requireAuth, async (req, res) => {
  res.json(await submitApplication(req.user!.id));
});

// One file per request, held in memory just long enough to check and save it.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

vettingRouter.post("/vetting/application/documents", requireAuth, upload.single("file"), async (req, res) => {
  res.status(201).json(await uploadDocument(req.user!.id, req.file, uploadSchema.parse(req.body)));
});

vettingRouter.delete("/vetting/application/documents/:id", requireAuth, async (req, res) => {
  res.json(await removeDocument(req.user!.id, id(req.params.id)));
});

// The admin's side. Every route below needs the admin role.

const isAdmin = requireRole("admin");

vettingRouter.get("/admin/vetting/queue", requireAuth, isAdmin, async (_req, res) => {
  res.json(await getQueue());
});

// Before "/admin/vetting/:id", which would read "rechecks" as an id.
vettingRouter.get("/admin/vetting/rechecks", requireAuth, isAdmin, async (_req, res) => {
  res.json(await listRechecks());
});

vettingRouter.post("/admin/vetting/:id/recheck", requireAuth, isAdmin, async (req, res) => {
  res.json(await recheck(req.user!.id, id(req.params.id), recheckSchema.parse(req.body)));
});

vettingRouter.get("/admin/vetting/:id", requireAuth, isAdmin, async (req, res) => {
  res.json(await getApplicationForReview(id(req.params.id)));
});

vettingRouter.post("/admin/vetting/:id/decision", requireAuth, isAdmin, async (req, res) => {
  res.json(await decide(req.user!.id, id(req.params.id), decisionSchema.parse(req.body)));
});

vettingRouter.post("/admin/users/:id/suspend", requireAuth, isAdmin, async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  res.json(await setSuspended(req.user!.id, id(req.params.id), true, reason));
});

vettingRouter.post("/admin/users/:id/reinstate", requireAuth, isAdmin, async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  res.json(await setSuspended(req.user!.id, id(req.params.id), false, reason));
});

vettingRouter.get("/admin/actions", requireAuth, isAdmin, async (_req, res) => {
  res.json(await listAdminActions());
});

// Only an admin can open an uploaded file.
vettingRouter.get("/admin/vetting/documents/:id/file", requireAuth, isAdmin, async (req, res) => {
  const file = await fileForAdmin(id(req.params.id));
  res.setHeader("Content-Type", file.mime_type);
  // Sent as a download, and the browser is told not to guess its type.
  res.setHeader("Content-Disposition", `attachment; filename="${file.file_name.replace(/[^\w. -]/g, "_")}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(file.path);
});

vettingRouter.patch("/admin/vetting/documents/:id", requireAuth, isAdmin, async (req, res) => {
  res.json(await reviewDocument(req.user!.id, id(req.params.id), reviewSchema.parse(req.body)));
});

// The clean-up also runs on a timer. This lets an admin run it now.
vettingRouter.post("/admin/jobs/purge-documents", requireAuth, isAdmin, async (_req, res) => {
  res.json(await purgeExpired());
});
