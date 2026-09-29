/**
 * Seeds the canonical Skill catalog + a demo student account + sample jobs.
 * Run: npm run seed
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { Skill, User, StudentProfile, Job } from '../src/models/index.js';
import crypto from 'node:crypto';

const SKILLS = [
  // Languages
  ['java', 'Java', 'language', ['core java', 'java se']],
  ['python', 'Python', 'language', ['python3']],
  ['javascript', 'JavaScript', 'language', ['js', 'es6']],
  ['typescript', 'TypeScript', 'language', ['ts']],
  ['c', 'C', 'language', []],
  ['c++', 'C++', 'language', ['cpp']],
  ['sql', 'SQL', 'language', ['mysql queries']],
  ['html', 'HTML', 'language', ['html5']],
  ['css', 'CSS', 'language', ['css3']],
  // Frameworks / libraries
  ['react', 'React', 'framework', ['react.js', 'reactjs']],
  ['node.js', 'Node.js', 'framework', ['nodejs', 'node']],
  ['express', 'Express', 'framework', ['express.js', 'expressjs']],
  ['spring boot', 'Spring Boot', 'framework', ['springboot', 'spring']],
  ['django', 'Django', 'framework', []],
  ['flask', 'Flask', 'framework', []],
  ['next.js', 'Next.js', 'framework', ['nextjs']],
  ['tailwind css', 'Tailwind CSS', 'framework', ['tailwind', 'tailwindcss']],
  ['bootstrap', 'Bootstrap', 'framework', []],
  // Databases
  ['mongodb', 'MongoDB', 'database', ['mongo', 'mongoose']],
  ['mysql', 'MySQL', 'database', []],
  ['postgresql', 'PostgreSQL', 'database', ['postgres']],
  ['redis', 'Redis', 'database', []],
  ['sqlite', 'SQLite', 'database', []],
  // Tools / cloud
  ['git', 'Git', 'tool', ['github']],
  ['docker', 'Docker', 'tool', ['containers']],
  ['kubernetes', 'Kubernetes', 'cloud', ['k8s']],
  ['aws', 'AWS', 'cloud', ['amazon web services']],
  ['azure', 'Azure', 'cloud', []],
  ['postman', 'Postman', 'tool', []],
  ['linux', 'Linux', 'tool', ['bash', 'shell scripting']],
  // Concepts
  ['data structures', 'Data Structures', 'concept', ['dsa']],
  ['algorithms', 'Algorithms', 'concept', []],
  ['oops', 'OOP', 'concept', ['object oriented programming', 'oop']],
  ['operating systems', 'Operating Systems', 'concept', ['os']],
  ['dbms', 'DBMS', 'concept', ['database management']],
  ['computer networks', 'Computer Networks', 'concept', ['networking', 'cn']],
  ['system design', 'System Design', 'concept', ['hld']],
  ['rest api', 'REST API', 'concept', ['rest', 'restful api', 'restful services']],
  ['graphql', 'GraphQL', 'concept', []],
  ['jwt', 'JWT', 'concept', ['json web token']],
  ['microservices', 'Microservices', 'concept', []],
  ['agile', 'Agile', 'concept', ['scrum']],
  ['unit testing', 'Unit Testing', 'concept', ['jest', 'junit', 'testing']],
  ['problem solving', 'Problem Solving', 'concept', []],
  ['communication', 'Communication', 'soft-skill', []],
  ['teamwork', 'Teamwork', 'soft-skill', []],
];

const SAMPLE_JOBS = [
  {
    title: 'Java Backend Developer (Fresher)',
    company: 'FinServe Technologies',
    role: 'backend developer',
    location: 'Pune',
    type: 'full-time',
    experienceLevel: 'fresher',
    description: `We are looking for a Java Backend Developer to join our payments team.
Responsibilities: build and maintain REST APIs, write unit tests, work with SQL databases.
Requirements: strong Core Java (collections, multithreading basics), Spring Boot, SQL, understanding of OOP and SOLID principles, Git. Familiarity with Redis, Docker and microservices is a plus. Good problem-solving and communication skills required.`,
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'EduScale Startup',
    role: 'full stack developer',
    location: 'Remote',
    type: 'internship',
    experienceLevel: 'intern',
    description: `Join us as a Full Stack intern building our student platform.
You will work with React, Node.js, Express and MongoDB. Requirements: JavaScript/TypeScript, React hooks, REST API design, MongoDB or any NoSQL database, Git. Nice to have: Tailwind CSS, Redis, deployment on AWS or Vercel, basic system design understanding. Must be comfortable with data structures and problem solving.`,
  },
  {
    title: 'Software Engineer — Campus Placement 2026',
    company: 'GlobalTech Solutions',
    role: 'software engineer',
    location: 'Bengaluru',
    type: 'placement',
    experienceLevel: 'fresher',
    description: `Campus hiring for SDE-1. Strong fundamentals in data structures and algorithms required (arrays, trees, graphs, dynamic programming). Proficiency in at least one of Java/C++/Python. Good understanding of DBMS, SQL, operating systems and computer networks. Experience with any web framework (React, Spring Boot, Django) is a bonus. Clear communication and analytical thinking are essential.`,
  },
];

async function seed() {
  await connectDatabase();

  // Skills (upsert by canonical name)
  for (const [name, displayName, category, aliases] of SKILLS) {
    await Skill.updateOne({ name }, { $set: { displayName, category, aliases } }, { upsert: true });
  }
  console.log(`[seed] ${SKILLS.length} skills upserted`);

  // Demo student
  const email = 'demo@careerpilot.dev';
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name: 'Demo Student', email, passwordHash: await User.hashPassword('demo1234') });
    await StudentProfile.create({
      user: user._id,
      headline: 'Final-year IT student targeting backend & full-stack roles',
      graduationYear: 2026,
      education: [{ degree: 'B.Tech', field: 'Information Technology', institution: 'Demo Institute of Technology', startYear: 2022, endYear: 2026, cgpa: 8.2 }],
      targetRoles: ['Java Backend Developer', 'Full Stack Developer'],
      programmingLanguages: [{ name: 'java', proficiency: 4 }, { name: 'javascript', proficiency: 3 }, { name: 'python', proficiency: 2 }],
      frameworks: [{ name: 'spring boot', proficiency: 3 }, { name: 'react', proficiency: 3 }, { name: 'express', proficiency: 2 }],
      databases: [{ name: 'mysql', proficiency: 4 }, { name: 'mongodb', proficiency: 3 }],
      tools: ['git', 'postman', 'linux'],
      projects: [{ title: 'Campus Marketplace', description: 'MERN marketplace for students', techStack: ['react', 'node.js', 'express', 'mongodb'] }],
      links: { github: 'https://github.com/demo', linkedin: '' },
    });
    console.log(`[seed] demo user created — login: ${email} / demo1234`);
  } else {
    console.log('[seed] demo user already exists');
  }

  // Sample jobs
  for (const j of SAMPLE_JOBS) {
    const descriptionHash = crypto.createHash('sha256').update(j.description).digest('hex');
    const exists = await Job.findOne({ descriptionHash });
    if (!exists) {
      await Job.create({ ...j, descriptionHash, postedBy: user._id, source: 'manual' });
    }
  }
  console.log(`[seed] ${SAMPLE_JOBS.length} sample jobs ensured (skill extraction runs when the worker processes them)`);

  await disconnectDatabase();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
