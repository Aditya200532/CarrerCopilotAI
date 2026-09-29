import { Job } from '../../src/models/index.js';
import { aiService } from '../../src/ai/aiService.js';

/**
 * Processor: job-extraction
 * Payload: { jobId }
 * Runs when a JD is pasted. aiService caches by JD-text hash, so the same
 * description pasted twice (by anyone) costs one LLM call.
 */
export async function processJobExtraction(job) {
  const { jobId } = job.data;
  const target = await Job.findById(jobId);
  if (!target) throw new Error('job record missing');

  const extracted = await aiService.extractJobSkills(target.description);

  target.requiredSkills = extracted.requiredSkills;
  target.niceToHaveSkills = extracted.niceToHaveSkills;
  if (extracted.responsibilities?.length) target.responsibilities = extracted.responsibilities;
  if (extracted.role && !target.role) target.role = extracted.role;
  if (extracted.experienceLevel) target.experienceLevel = extracted.experienceLevel;
  target.skillsExtractedByAI = extracted.source === 'llm';
  await target.save();

  return { jobId, source: extracted.source, cached: extracted.cached };
}
