import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { Resume, AIAnalysis } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getQueue, QUEUES } from '../queue/queues.js';
import { getPagination, buildPageMeta } from '../utils/pagination.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'resumes');
const MAX_SIZE_MB = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${req.user._id}-${Date.now()}-${safe}`);
  },
});

export const resumeUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf', 'text/plain'].includes(file.mimetype) ||
      /\.(pdf|txt)$/i.test(file.originalname);
    cb(ok ? null : ApiError.badRequest('Only PDF or TXT resumes are accepted'), ok);
  },
});

export const resumeService = {
  ensureUploadDir: () => fs.mkdir(UPLOAD_DIR, { recursive: true }),

  /**
   * Upload flow (the queue showcase):
   *  1. Store file + Resume doc (status: queued)
   *  2. Create AIAnalysis record (the frontend's polling handle)
   *  3. Enqueue resume-analysis job → return immediately (HTTP 202 Accepted)
   * The worker extracts text, calls the LLM, persists the result, and fires
   * a notification event. The API never blocks on the LLM.
   */
  async upload(userId, file) {
    if (!file) throw ApiError.badRequest('Resume file is required');

    const previousPrimary = await Resume.findOne({ user: userId, isPrimary: true });
    const resume = await Resume.create({
      user: userId,
      filename: file.originalname,
      storedPath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      analysis: { status: 'queued', queuedAt: new Date() },
      isPrimary: true,
    });
    if (previousPrimary) {
      await Resume.updateOne({ _id: previousPrimary._id }, { isPrimary: false });
    }

    const analysis = await AIAnalysis.create({
      user: userId,
      type: 'resume-analysis',
      status: 'queued',
      input: { resume: resume._id },
    });

    await Resume.updateOne({ _id: resume._id }, { 'analysis.analysis': analysis._id });
    await getQueue(QUEUES.resumeAnalysis).add('analyze', {
      userId: String(userId),
      resumeId: String(resume._id),
      analysisId: String(analysis._id),
    });

    return { resume, analysisId: analysis._id, status: 'queued' };
  },

  async list(userId, query) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 10 });
    const [items, total] = await Promise.all([
      Resume.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('-extractedText').lean(),
      Resume.countDocuments({ user: userId }),
    ]);
    return { items, meta: buildPageMeta(total, page, limit) };
  },

  async delete(userId, id) {
    const resume = await Resume.findOneAndDelete({ _id: id, user: userId });
    if (!resume) throw ApiError.notFound('Resume not found');
    await fs.unlink(resume.storedPath).catch(() => {}); // best-effort file cleanup
  },
};
