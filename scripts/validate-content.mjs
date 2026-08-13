import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const walkJson = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJson(full);
    return entry.isFile() && entry.name.endsWith('.json') ? [full] : [];
  });
};
const rel = (file) => path.relative(root, file);
const fail = [];
const add = (message) => fail.push(message);

// strictRequired is disabled because schedule-entry.schema.json declares a conditional
// required "lesson_id" inside allOf/then without redeclaring properties there; Ajv strict
// mode treats that as a style error even though validation semantics are correct.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const lessonSchema = readJson(path.join(root, 'src/schemas/lesson.schema.json'));
const resourceSchema = readJson(path.join(root, 'src/schemas/resource.schema.json'));
const scheduleSchema = readJson(path.join(root, 'src/schemas/schedule-entry.schema.json'));
const settingsSchema = readJson(path.join(root, 'src/schemas/site-settings.schema.json'));
const validateLessonSchema = ajv.compile(lessonSchema);
const validateResourceSchema = ajv.compile(resourceSchema);
const validateScheduleSchema = ajv.compile(scheduleSchema);
const validateSettingsSchema = ajv.compile(settingsSchema);

const canonical = readJson(path.join(root, 'docs/governance/canonical_curriculum_matrix_v0.3.json'));
const canonicalById = new Map(canonical.lessons.map((lesson) => [lesson.lesson_id, lesson]));

const resourceFiles = walkJson(path.join(root, 'src/content/resources'));
const resources = resourceFiles.map((file) => ({ file, value: readJson(file) }));
for (const { file, value } of resources) {
  if (!validateResourceSchema(value)) {
    add(`${rel(file)}: ${ajv.errorsText(validateResourceSchema.errors, { separator: '; ' })}`);
  }
}
const resourceIds = new Set(resources.map(({ value }) => value.resource_id));

const answerValueKeys = ['text', 'boolean', 'items'];
const validateAnswer = (lesson, question) => {
  const expected = {
    multiple_choice: 'text',
    true_false: 'boolean',
    sequence: 'ordered_list',
    scenario: 'text',
    short_answer: 'text',
  }[question.type];
  const answer = question.answer;
  if (answer.kind !== expected) add(`${lesson.lesson_id}: ${question.question_id} expected answer kind ${expected}, got ${answer.kind}`);
  const requiredKey = { text: 'text', boolean: 'boolean', ordered_list: 'items' }[answer.kind];
  if (!(requiredKey in answer)) add(`${lesson.lesson_id}: ${question.question_id} answer kind ${answer.kind} requires ${requiredKey}`);
  const populated = answerValueKeys.filter((key) => key in answer);
  if (populated.length !== 1) add(`${lesson.lesson_id}: ${question.question_id} answer must populate exactly one value field`);
};

const validatePuzzle = (lesson) => {
  const puzzle = lesson.engagement.puzzle;
  const expected = { sequence: 'ordered_list', matching: 'pairs', sort: 'groups', case_grid: 'pairs', word_scramble: 'text' }[puzzle.type];
  if (puzzle.solution.kind !== expected) add(`${lesson.lesson_id}: puzzle ${puzzle.type} expected solution kind ${expected}, got ${puzzle.solution.kind}`);
  const requiredKey = { text: 'text', ordered_list: 'items', pairs: 'pairs', groups: 'groups' }[puzzle.solution.kind];
  if (!(requiredKey in puzzle.solution)) add(`${lesson.lesson_id}: puzzle solution kind ${puzzle.solution.kind} requires ${requiredKey}`);
  if (puzzle.type === 'matching' && (!puzzle.choices || puzzle.choices.length === 0)) add(`${lesson.lesson_id}: matching puzzle requires choices`);
};

const lessonFiles = walkJson(path.join(root, 'src/content/lessons'));
const lessons = lessonFiles.map((file) => ({ file, value: readJson(file) }));
for (const { file, value: lesson } of lessons) {
  if (!validateLessonSchema(lesson)) {
    add(`${rel(file)}: ${ajv.errorsText(validateLessonSchema.errors, { separator: '; ' })}`);
    continue;
  }
  const canonicalLesson = canonicalById.get(lesson.lesson_id);
  if (!canonicalLesson) {
    add(`${lesson.lesson_id}: absent from canonical curriculum matrix`);
  } else {
    const comparisons = [
      ['segment', lesson.curriculum.segment, canonicalLesson.segment],
      ['age_range', lesson.curriculum.age_range, canonicalLesson.age_range],
      ['cycle_id', lesson.curriculum.cycle_id, canonicalLesson.cycle_id],
      ['cycle_name', lesson.curriculum.cycle_name, canonicalLesson.cycle_name],
      ['sequence', lesson.curriculum.sequence, canonicalLesson.sequence],
      ['unit_type', lesson.curriculum.unit_type, canonicalLesson.unit_type],
      ['title', lesson.curriculum.title, canonicalLesson.title],
    ];
    for (const [field, actual, expected] of comparisons) {
      if (actual !== expected) add(`${lesson.lesson_id}: curriculum.${field} mismatch (${JSON.stringify(actual)} != ${JSON.stringify(expected)})`);
    }
  }

  for (const claim of lesson.core.claims) {
    if (['framework_position', 'disputed'].includes(claim.classification) && !claim.interpretive_hinge) {
      add(`${lesson.lesson_id}: ${claim.claim_id} ${claim.classification} claim requires interpretive_hinge`);
    }
    if (['framework_position', 'strong_inference', 'disputed'].includes(claim.classification) && !claim.prohibited_overstatement) {
      add(`${lesson.lesson_id}: ${claim.claim_id} ${claim.classification} claim requires prohibited_overstatement`);
    }
  }

  const questions = new Set([
    ...lesson.teacher.discussion_questions.map((q) => q.question_id).filter(Boolean),
    ...lesson.teacher.preparation.likely_questions.map((q) => q.question_id).filter(Boolean),
  ]);
  const activities = new Set(lesson.teacher.activities.map((activity) => activity.activity_id));
  const profileMinutes = { essential: 25, standard: 35, extended: 45 };
  for (const [name, expected] of Object.entries(profileMinutes)) {
    const profile = lesson.teacher.delivery_profiles[name];
    const total = profile.outline.reduce((sum, step) => sum + step.minutes, 0);
    if (profile.duration_minutes !== expected || total !== expected) add(`${lesson.lesson_id}: ${name} profile must total ${expected} minutes`);
    for (const step of profile.outline) {
      for (const ref of step.question_refs || []) if (!questions.has(ref)) add(`${lesson.lesson_id}: unresolved question ref ${ref}`);
      for (const ref of step.activity_refs || []) if (!activities.has(ref)) add(`${lesson.lesson_id}: unresolved activity ref ${ref}`);
      for (const ref of step.resource_refs || []) if (!resourceIds.has(ref)) add(`${lesson.lesson_id}: unresolved resource ref ${ref}`);
    }
  }

  const flow = lesson.family.flow;
  const order = flow.map((step) => step.type);
  const expectedOrder = ['connect', 'read', 'understand', 'play', 'respond'];
  if (JSON.stringify(order) !== JSON.stringify(expectedOrder)) add(`${lesson.lesson_id}: family flow order is invalid`);
  if (flow.reduce((sum, step) => sum + step.duration_minutes, 0) !== 15 || lesson.family.duration_minutes !== 15) add(`${lesson.lesson_id}: family flow must total 15 minutes`);

  for (const question of lesson.engagement.quiz) validateAnswer(lesson, question);
  validatePuzzle(lesson);

  const refs = new Set([
    ...(lesson.teacher.printable_refs || []),
    ...lesson.engagement.printables.map((item) => item.resource_id),
  ]);
  for (const resourceId of refs) if (!resourceIds.has(resourceId)) add(`${lesson.lesson_id}: unresolved printable ${resourceId}`);

  if (['approved', 'scheduled', 'published'].includes(lesson.status)) {
    const state = lesson.editorial.review_state;
    for (const area of ['exegetical', 'developmental', 'pastoral', 'copy']) {
      const allowed = area === 'pastoral' ? ['approved', 'not_required', 'deferred_owner_managed'] : ['approved', 'not_required'];
      if (!allowed.includes(state[area])) add(`${lesson.lesson_id}: ${lesson.status} requires completed ${area} review`);
    }
  }
}

const lessonById = new Map(lessons.map(({ value }) => [value.lesson_id, value]));
const scheduleFiles = walkJson(path.join(root, 'src/content/schedule'));
const scheduleKeys = new Set();
for (const file of scheduleFiles) {
  const entry = readJson(file);
  if (!validateScheduleSchema(entry)) add(`${rel(file)}: ${ajv.errorsText(validateScheduleSchema.errors, { separator: '; ' })}`);
  const uniqueKey = `${entry.date}:${entry.segment}`;
  if (scheduleKeys.has(uniqueKey)) add(`${rel(file)}: duplicate schedule key ${uniqueKey}`);
  scheduleKeys.add(uniqueKey);
  if (entry.entry_type === 'lesson') {
    const lesson = lessonById.get(entry.lesson_id);
    if (!lesson) add(`${rel(file)}: lesson ${entry.lesson_id} is not present in runtime content`);
    if (entry.status === 'approved' && lesson && !['approved', 'scheduled', 'published'].includes(lesson.status)) {
      add(`${rel(file)}: approved schedule cannot reference lesson status ${lesson.status}`);
    }
  }
}

const settingsFile = path.join(root, 'src/content/settings/site.json');
if (!fs.existsSync(settingsFile)) add('src/content/settings/site.json is missing');
else {
  const settings = readJson(settingsFile);
  if (!validateSettingsSchema(settings)) add(`${rel(settingsFile)}: ${ajv.errorsText(validateSettingsSchema.errors, { separator: '; ' })}`);
}

// Term settings (ADR-013): school terms drive the auto-generated schedule.
const termSchema = readJson(path.join(root, 'src/schemas/term-settings.schema.json'));
const validateTermSchema = ajv.compile(termSchema);
const termsFile = path.join(root, 'src/content/settings/terms.json');
if (!fs.existsSync(termsFile)) add('src/content/settings/terms.json is missing');
else {
  const terms = readJson(termsFile);
  if (!validateTermSchema(terms)) {
    add(`${rel(termsFile)}: ${ajv.errorsText(validateTermSchema.errors, { separator: '; ' })}`);
  } else {
    const seenTermIds = new Set();
    const sorted = [...terms.terms].sort((a, b) => a.start.localeCompare(b.start));
    for (const term of terms.terms) {
      if (term.start >= term.end) add(`terms.json: ${term.term_id} start must be before end`);
      if (seenTermIds.has(term.term_id)) add(`terms.json: duplicate term_id ${term.term_id}`);
      seenTermIds.add(term.term_id);
    }
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start <= sorted[i - 1].end) {
        add(`terms.json: ${sorted[i].term_id} overlaps ${sorted[i - 1].term_id}`);
      }
    }
  }
}

if (fail.length > 0) {
  console.error(`Content validation failed with ${fail.length} error(s):`);
  for (const error of fail) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Content validation passed: ${lessons.length} lessons, ${resources.length} resources, ${scheduleFiles.length} schedule entries.`);
