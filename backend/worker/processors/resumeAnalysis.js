import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { Resume, AIAnalysis } from '../../src/models/index.js';
import { aiService } from '../../src/ai/aiService.js';
import { emit, EVENTS } from '../../src/events/bus.js';
import { StudentProfile } from '../../src/models/index.js';

// pdf-parse is CJS with an ESM-hostile debug branch; createRequire keeps module.parent defined.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function extractResumeText(resume) {
  if (resume.extractedText) return resume.extractedText;
  const buffer = await fs.readFile(resume.storedPath);
  let text = '';
  if (resume.mimeType === 'application/pdf' || resume.storedPath.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } else {
    text = buffer.toString('utf8');
  }
  resume.extractedText = text;
  resume.textHash = crypto.createHash('sha256').update(text).digest('hex');
  await resume.save();
  return text;
}

/**
 * Processor: resume-analysis
 * Payload: { userId, resumeId, analysisId }
 * Pipeline: extract text → dedupe by hash → LLM analyze → persist structured
 * result in AIAnalysis → mark resume complete → emit domain event.
 */
export async function processResumeAnalysis(job) {
  const { userId, resumeId, analysisId } = job.data;
  const analysis = await AIAnalysis.findById(analysisId);
  const resume = await Resume.findById(resumeId);
  if (!analysis || !resume) throw new Error('resume or analysis record missing');

  analysis.status = 'processing';
  analysis.startedAt = new Date();
  analysis.attempts += 1;
  await analysis.save();
  await Resume.updateOne({ _id: resumeId }, { 'analysis.status': 'processing' });

  try {
    const text = await extractResumeText(resume);

    // Dedup: identical resume text already analyzed for this user → reuse result.
    let result;
    const prior = await AIAnalysis.findOne({
      user: userId,
      type: 'resume-analysis',
      status: 'completed',
      _id: { $ne: analysisId },
    }).sort({ createdAt: -1 });
    const priorResume = prior?.input?.resume ? await Resume.findById(prior.input.resume).select('textHash') : null;
    if (prior && priorResume && priorResume.textHash && priorResume.textHash === resume.textHash) {
      result = { ...prior.result, reusedFrom: String(prior._id) };
    } else {
      const profile = await StudentProfile.findOne({ user: userId }).lean();
      const profileSummary = profile
        ? `Target roles: ${(profile.targetRoles || []).join(', ')}. Graduation: ${profile.graduationYear || 'n/a'}. Projects: ${(profile.projects || []).map((p) => p.title).join(', ')}`
        : '';
      result = await aiService.analyzeResume(text, profileSummary);
    }

    analysis.status = 'completed';
    analysis.result = result;
    analysis.completedAt = new Date();
    await analysis.save();

    await Resume.updateOne(
      { _id: resumeId },
      { 'analysis.status': 'completed', 'analysis.analysis': analysisId, 'analysis.completedAt': new Date(), 'analysis.error': null }
    );

    emit(EVENTS.ANALYSIS_COMPLETED, { userId, analysisType: 'resume-analysis', analysisId });
    return { analysisId };
  } catch (err) {
    await markFailed(analysis, resumeId, err);
    throw err; // rethrow so BullMQ applies retry/backoff policy
  }
}

async function markFailed(analysis, resumeId, err) {
  // Only mark terminally failed when BullMQ has exhausted attempts.
  if (analysis.attempts >= 3) {
    analysis.status = 'failed';
    analysis.error = err.message;
    await analysis.save();
    await Resume.updateOne({ _id: resumeId }, { 'analysis.status': 'failed', 'analysis.error': err.message });
    emit(EVENTS.ANALYSIS_FAILED, { userId: analysis.user, analysisType: 'resume-analysis', analysisId: analysis._id, error: err.message });
  }
}
