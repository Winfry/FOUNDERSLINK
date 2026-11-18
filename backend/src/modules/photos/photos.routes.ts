import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.js";
import { AppError } from "../../shared/errors.js";
import { MAX_PHOTO_BYTES, photoByToken, removePhoto, setPhoto } from "./photos.service.js";

export const photosRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } });

// multer says LIMIT_FILE_SIZE; she is told in words.
const single = (req: Parameters<ReturnType<typeof upload.single>>[0], res: Parameters<ReturnType<typeof upload.single>>[1], next: (err?: unknown) => void) =>
  upload.single("photo")(req, res, (err?: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(400, "FILE_TOO_LARGE", "The photo is larger than 2 MB"));
    }
    next(err);
  });

photosRouter.put("/me/photo", requireAuth, single, async (req, res) => {
  res.json(await setPhoto(req.user!.id, req.file));
});

photosRouter.delete("/me/photo", requireAuth, async (req, res) => {
  res.json(await removePhoto(req.user!.id));
});

// No token needed: the address itself is the secret, and it is only given
// to people allowed to see her name. Never cached by shared caches.
photosRouter.get("/media/photos/:token", async (req, res) => {
  const token = z.string().regex(/^[\w-]{20,64}$/).parse(req.params.token);
  const photo = await photoByToken(token);
  res.setHeader("Content-Type", photo.mime_type);
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(photo.body);
});
