export const defaultCourses = [
  {
    uuid: 'course_html_foundations_001',
    code: 'html-foundations',
    title: 'HTML & Modern Web Foundations',
    description: 'Learn semantic HTML, web accessibility, document structures, forms, and progressive web basics.',
    author: 'Master Instructor',
    coverImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    theme: 'forest',
    position: 1,
    status: 'active',
    subjects: [
      {
        uuid: 'subj_html_elements_001',
        title: 'Document Anatomy & Semantic Tags',
        description: 'Understand the DOM, meta tags, and semantic structure tags.',
        position: 1,
        lessons: [
          {
            uuid: 'lesson_html_intro_001',
            title: 'Welcome to NEOT & Semantic HTML',
            author: 'Master Instructor',
            position: 1,
            content: `# Welcome to NEOT LMS

Learning today allows you to own tomorrow. In this lesson, we explore semantic HTML.

## Why Semantic HTML Matters
Semantic elements clearly describe their meaning to both the browser and the developer.
- \`<header>\`: Container for introductory content or navigational links.
- \`<nav>\`: Section of navigation links.
- \`<main>\`: Dominant content of the document.
- \`<article>\`: Self-contained composition in a document.
- \`<section>\`: Standalone section of functionality.
- \`<footer>\`: Footer for its nearest sectioning content.

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>NEOT Learning Portal</title>
  </head>
  <body>
    <header><h1>NEOT LMS</h1></header>
    <main>
      <article>
        <h2>Study Management</h2>
        <p>Master your learning hierarchy with courses, subjects, and lessons.</p>
      </article>
    </main>
  </body>
</html>
\`\`\`

Review the key elements above before taking the quiz!`,
            questions: [
              {
                uuid: 'q_html_001',
                askedBy: 'student@neot.in',
                questionText: 'When should I use <article> versus <section>?',
                answers: [
                  {
                    uuid: 'ans_html_001',
                    answeredBy: 'master@neot.in',
                    answerText: 'Use <article> for independently distributable content like a blog post or news item. Use <section> for thematic grouping of content with a heading.',
                    accepted: true,
                  },
                ],
              },
            ],
          },
          {
            uuid: 'lesson_html_forms_002',
            title: 'Accessible Web Forms & Input Validation',
            author: 'Master Instructor',
            position: 2,
            content: `# Accessible Web Forms

Forms connect users with web applications. Designing them for accessibility ensures every student can participate effortlessly.

## Key Rules
1. Always link \`<label for="id">\` to its matching \`<input id="id">\`.
2. Use native validation attributes: \`required\`, \`min\`, \`max\`, \`pattern\`.
3. Provide descriptive help text with \`aria-describedby\`.
4. Group related fields using \`<fieldset>\` and \`<legend>\`.`,
            questions: [],
          },
        ],
      },
    ],
    tests: [
      {
        uuid: 'test_html_001',
        title: 'HTML Foundations Knowledge Check',
        instructions: 'Test your understanding of semantic HTML tags and form accessibility. 60% required to pass.',
        passPercentage: 60,
        questions: [
          {
            uuid: 'quiz_q_html_001',
            prompt: 'Which HTML element represents the dominant content of the document body?',
            options: ['<section>', '<main>', '<article>', '<content>'],
            correctOption: '<main>',
            points: 10,
            position: 1,
          },
          {
            uuid: 'quiz_q_html_002',
            prompt: 'How should a label be linked to its corresponding input field?',
            options: [
              'Using the label "for" attribute matching the input "id"',
              'Using matching "class" names',
              'By putting them in the same div',
              'HTML does it automatically without attributes'
            ],
            correctOption: 'Using the label "for" attribute matching the input "id"',
            points: 10,
            position: 2,
          },
          {
            uuid: 'quiz_q_html_003',
            prompt: 'Which tag should be used to group related fields in a form?',
            options: ['<div>', '<group>', '<fieldset>', '<card>'],
            correctOption: '<fieldset>',
            points: 10,
            position: 3,
          },
        ],
      },
    ],
    classes: [
      {
        uuid: 'class_web_morning_001',
        title: 'Morning Web Cohort A',
        masterEmail: 'master@neot.in',
        scheduleText: 'Mon, Wed, Fri - 09:30 AM to 11:00 AM IST',
        status: 'active',
      },
    ],
  },
  {
    uuid: 'course_ddd_os_002',
    code: 'codexsun-study-management',
    title: 'Domain-Driven Design in CODEXSUN OS',
    description: 'Explore bounded contexts, aggregates, entities, repositories, and ports in modular application design.',
    author: 'Principal Architect',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    theme: 'ocean',
    position: 2,
    status: 'active',
    subjects: [
      {
        uuid: 'subj_ddd_core_001',
        title: 'Core DDD Patterns & Layers',
        description: 'Domain, Application, Infrastructure, and Interface boundaries.',
        position: 1,
        lessons: [
          {
            uuid: 'lesson_ddd_layers_001',
            title: 'Understanding the 4-Layer DDD Pattern',
            author: 'Principal Architect',
            position: 1,
            content: `# The 4-Layer Domain-Driven Architecture

In CODEXSUN OS, apps like Q Cafe and NEOT follow clean layer separation:

1. **Domain Layer**:
   - Entities, Aggregates, Value Objects, Domain Events.
   - Zero external framework dependencies. Pure business logic.
2. **Application Layer**:
   - Use cases and orchestration services.
   - Input/Output ports (interfaces for repositories, event bus, and external clients).
3. **Infrastructure Layer**:
   - SQLite \`DatabaseSync\` persistence, cloud clients, event dispatchers, migrations.
4. **Interface / Presentation Layer**:
   - REST API routers, request validation, React web client, mobile viewports.`,
            questions: [],
          },
        ],
      },
    ],
    tests: [
      {
        uuid: 'test_ddd_001',
        title: 'Domain-Driven Design Review',
        instructions: 'Verify your understanding of domain aggregates and repository boundaries.',
        passPercentage: 70,
        questions: [
          {
            uuid: 'quiz_q_ddd_001',
            prompt: 'Where should pure business rules and invariants reside in a DDD system?',
            options: ['In the HTTP Router', 'In the Domain Layer', 'In the SQLite Database Triggers', 'In the UI Component'],
            correctOption: 'In the Domain Layer',
            points: 10,
            position: 1,
          },
        ],
      },
    ],
    classes: [
      {
        uuid: 'class_ddd_evening_001',
        title: 'Software Craftsmanship Masterclass',
        masterEmail: 'architect@codexsun.com',
        scheduleText: 'Tue, Thu - 06:00 PM to 07:30 PM IST',
        status: 'active',
      },
    ],
  },
];
