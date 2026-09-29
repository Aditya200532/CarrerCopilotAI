import { Job, StudentProfile, AIAnalysis, Resume, DSAProblem } from '../../src/models/index.js';
import { aiService } from '../../src/ai/aiService.js';
import { compareSkillSets, dedupeSkills } from '../../src/utils/skills.js';
import { emit, EVENTS } from '../../src/events/bus.js';
import { computeDsaWeakAreas } from '../../src/services/dsaService.js';

/**
 * Processor: skill-gap
 * Payload: { userId, jobId, analysisId }
 *
 * The comparison itself is DETERMINISTIC set arithmetic (explainable, no AI
 * magic). The LLM only adds prioritized guidance on top of that transparent
 * base — this is the "show the work, don't output a mystery score" design.
 */
export async function processSkillGap(job) {
  const { userId, jobId, analysisId } = job.data;
  const analysis = await AIAnalysis.findById(analysisId);
  const target = await Job.findById(jobId);
  if (!analysis || !target) throw new Error('analysis or job record missing');

  analysis.status = 'processing';
  analysis.startedAt = new Date();
  analysis.attempts += 1;
  await analysis.save();

  try {
    const profile = await StudentProfile.findOne({ user: userId });

    // Student skill set = profile skills ∪ skills extracted from latest resume analysis.
    const studentSkills = dedupeSkills(profile ? profile.allSkillNames() : []);
    const latestResumeAnalysis = await AIAnalysis.findOne({
      user: userId, type: 'resume-analysis', status: 'completed',
    }).sort({ completedAt: -1 });
    if (latestResumeAnalysis?.result?.skills) {
      studentSkills.push(...dedupeSkills(latestResumeAnalysis.result.skills));
    }

    const weakAreas = await computeDsaWeakAreas(userId);
    const comparison = compareSkillSets(studentSkills, target.requiredSkills, target.niceToHaveSkills);

    const advice = await aiService.adviseOnSkillGap({
      matched: comparison.matched,
      missing: comparison.missing,
      role: target.role || target.title,
      dsaSummary: weakAreas.length ? `weak topics: ${weakAreas.join(', ')}` : 'no DSA data recorded yet',
    });

    analysis.status = 'completed';
    analysis.result = {
      job: { id: target._id, title: target.title, company: target.company, role: target.role },
      studentSkills: dedupeSkills(studentSkills),
      comparison, // matched / missing / bonus — fully transparent
      advice,
      dsaWeakAreas: weakAreas,
    };
    analysis.completedAt = new Date();
    await analysis.save();

    emit(EVENTS.ANALYSIS_COMPLETED, {
      userId, analysisType: 'skill-gap', analysisId, jobTitle: target.title,
    });
    return { analysisId };
  } catch (err) {
    if (analysis.attempts >= 3) {
      analysis.status = 'failed';
      analysis.error = err.message;
      await analysis.save();
      emit(EVENTS.ANALYSIS_FAILED, { userId, analysisType: 'skill-gap', analysisId, error: err.message });
    }
    throw err;
  }
}

/**
 * Processor: roadmap
 * Payload: { userId, jobId, analysisId, weeksAvailable }
 * Generates a PreparationPlan + ordered PreparationTasks; archives the user's
 * previous active plan so the dashboard always shows exactly one.
 */
export async function processRoadmap(job) {
  const { userId, jobId, analysisId, weeksAvailable = 6 } = job.data;
  const analysis = await AIAnalysis.findById(analysisId);
  if (!analysis) throw new Error('analysis record missing');

  analysis.status = 'processing';
  analysis.startedAt = new Date();
  analysis.attempts += 1;
  await analysis.save();

  try {
    const { PreparationPlan, PreparationTask } = await import('../../src/models/index.js');
    const profile = await StudentProfile.findOne({ user: userId });
    const target = jobId ? await Job.findById(jobId) : null;

    const studentSkills = dedupeSkills(profile ? profile.allSkillNames() : []);
    let missing = target ? target.requiredSkills.filter((s) => !studentSkills.includes(s)) : [];
    if (!target) {
      // No target job: build from target roles + latest skill-gap analysis if present.
      const latestGap = await AIAnalysis.findOne({ user: userId, type: 'skill-gap', status: 'completed' }).sort({ completedAt: -1 });
      missing = latestGap?.result?.comparison?.missing || [];
    }

    const weakAreas = await computeDsaWeakAreas(userId);
    const role = target ? (target.role || target.title) : (profile?.targetRoles?.[0] || 'Software Engineer');

    const plan = await aiService.generateRoadmap({
      role,
      missing,
      matched: target ? target.requiredSkills.filter((s) => studentSkills.includes(s)) : studentSkills.slice(0, 10),
      dsaWeakAreas: weakAreas,
      weeksAvailable,
    });

    // Archive previous active plan, create the new one.
    await PreparationPlan.updateMany({ user: userId, status: 'active' }, { status: 'archived' });
    const created = await PreparationPlan.create({
      user: userId,
      job: target?._id,
      title: plan.title,
      targetRole: role,
      generatedFrom: analysisId,
      overview: plan.overview,
      targetDate: plan.targetDate ? new Date(plan.targetDate) : undefined,
      status: 'active',
    });

    const tasks = (plan.tasks || []).map((t, i) => ({
      plan: created._id,
      user: userId,
      title: t.title,
      description: t.description,
      category: t.category,
      topic: t.topic,
      priority: t.priority,
      estimatedHours: t.estimatedHours,
      order: t.order ?? i,
      dueDate: weekToDate(t.weekNumber),
    }));
    await PreparationTask.insertMany(tasks);

    analysis.status = 'completed';
    analysis.result = { planId: String(created._id), taskCount: tasks.length, source: plan.source };
    analysis.completedAt = new Date();
    await analysis.save();

    emit(EVENTS.PLAN_GENERATED, { userId, planId: String(created._id), jobTitle: target?.title });
    return { planId: String(created._id) };
  } catch (err) {
    if (analysis.attempts >= 3) {
      analysis.status = 'failed';
      analysis.error = err.message;
      await analysis.save();
      emit(EVENTS.ANALYSIS_FAILED, { userId, analysisType: 'roadmap', analysisId, error: err.message });
    }
    throw err;
  }
}

function weekToDate(weekNumber) {
  if (!weekNumber) return undefined;
  return new Date(Date.now() + Number(weekNumber) * 7 * 24 * 3600 * 1000);
}
