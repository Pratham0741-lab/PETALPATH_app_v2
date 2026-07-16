const fs = require('fs');
const path = require('path');

const dir = __dirname;
const part1 = fs.readFileSync(path.join(dir, 'part1.yaml'), 'utf-8');
const outPath = path.join(dir, 'openapi.yaml');

// Path map: url -> { method -> block }
const pm = {};

function add(method, url, block) {
  const key = url.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  if (!pm[key]) pm[key] = {};
  pm[key][method] = block;
}

function esc(v) { return JSON.stringify(v); }

function emitPathMethods(url, methods) {
  let out = `  ${url}:\n`;
  for (const [method, block] of Object.entries(methods)) {
    out += `    ${method}:\n`;
    if (block.tags) out += `      tags: [${block.tags.join(', ')}]\n`;
    if (block.summary) out += `      summary: ${esc(block.summary)}\n`;
    if (block.operationId) out += `      operationId: ${block.operationId}\n`;
    if (block.security) out += `      security:\n        - bearerAuth: []\n`;
    if (block.parameters) {
      out += '      parameters:\n';
      for (const p of block.parameters) {
        out += `        - name: ${p.name}\n          in: ${p.in}\n          required: ${!!p.required}\n          schema:\n            type: ${p.schema.type}\n`;
        if (p.schema.format) out += `            format: ${p.schema.format}\n`;
        if (p.schema.enum) out += `            enum: [${p.schema.enum.join(', ')}]\n`;
        if (p.description) out += `          description: ${esc(p.description)}\n`;
        if (p.schema.default !== undefined) out += `          default: ${p.schema.default}\n`;
      }
    }
    if (block.requestBody) {
      const rb = block.requestBody;
      out += `      requestBody:\n        required: ${!!rb.required}\n        content:\n          application/json:\n            schema:\n`;
      out += dumpS(rb.schema || { type: 'object', properties: {} }, '              ');
    }
    if (block.responses) {
      out += '      responses:\n';
      for (const [code, resp] of Object.entries(block.responses)) {
        out += `        '${code}':\n`;
        if (resp.$ref) {
          out += `          $ref: ${esc(resp.$ref)}\n`;
        } else {
          if (resp.description) out += `          description: ${esc(resp.description)}\n`;
          if (resp.content) {
            out += `          content:\n            application/json:\n              schema:\n`;
            out += dumpS(resp.content['application/json'].schema, '                ');
          }
        }
      }
    }
  }
  return out;
}

function dumpS(s, ind) {
  if (!s) return `${ind}type: object\n`;
  if (s.$ref) return `${ind}$ref: ${esc(s.$ref)}\n`;
  if (s.allOf) {
    let out = `${ind}allOf:\n`;
    for (const item of s.allOf) {
      out += `${ind}  -\n`;
      out += dumpS(item, `${ind}    `);
    }
    return out;
  }
  if (s.type === 'array') {
    let out = `${ind}type: array\n`;
    if (s.items) {
      out += `${ind}items:\n`;
      out += dumpS(s.items, `${ind}  `);
    }
    return out;
  }
  if (s.type === 'object' || !s.type) {
    let out = `${ind}type: object\n`;
    if (s.description) out += `${ind}description: ${esc(s.description)}\n`;
    if (s.properties) {
      out += `${ind}properties:\n`;
      for (const [k, v] of Object.entries(s.properties)) {
        out += `${ind}  ${k}:\n`;
        if (v.$ref) {
          out += `${ind}    $ref: ${esc(v.$ref)}\n`;
        } else if (v.type === 'array') {
          out += `${ind}    type: array\n`;
          if (v.items) {
            out += `${ind}    items:\n`;
            out += dumpS(v.items, `${ind}      `);
          }
        } else if (v.type === 'object' || !v.type) {
          out += `${ind}    type: object\n`;
          if (v.description) out += `${ind}    description: ${esc(v.description)}\n`;
          if (v.properties) {
            out += `${ind}    properties:\n`;
            for (const [k2, v2] of Object.entries(v.properties)) {
              out += `${ind}      ${k2}:\n`;
              for (const [k3, v3] of Object.entries(v2)) {
                if (typeof v3 === 'object') {
                  out += `${ind}        ${k3}: ${JSON.stringify(v3, null, 2).split('\n').map((l,i) => i === 0 ? l : `${ind}          ${l}`).join('\n')}\n`;
                } else {
                  out += `${ind}        ${k3}: ${JSON.stringify(v3)}\n`;
                }
              }
            }
          }
          if (v.required) {
            out += `${ind}    required:\n`;
            for (const r of v.required) out += `${ind}      - ${esc(r)}\n`;
          }
        } else {
          out += `${ind}    type: ${v.type}\n`;
          if (v.description) out += `${ind}    description: ${esc(v.description)}\n`;
          if (v.format) out += `${ind}    format: ${v.format}\n`;
          if (v.enum) out += `${ind}    enum: [${v.enum.join(', ')}]\n`;
        }
      }
    }
    if (s.required) {
      out += `${ind}required:\n`;
      for (const r of s.required) out += `${ind}  - ${esc(r)}\n`;
    }
    return out;
  }
  return `${ind}type: ${s.type}\n`;
}

const R = (name) => ({ $ref: `#/components/responses/${name}` });
const DR = (s, desc) => ({
  description: desc || 'Success',
  content: { 'application/json': { schema: { allOf: [ { $ref: '#/components/schemas/ApiResponse' }, { type: 'object', properties: { data: typeof s === 'string' ? { $ref: `#/components/schemas/${s}` } : s } } ] } } }
});
const DAR = (s, desc) => ({
  description: desc || 'Success',
  content: { 'application/json': { schema: { allOf: [ { $ref: '#/components/schemas/ApiResponse' }, { type: 'object', properties: { data: { type: 'array', items: typeof s === 'string' ? { $ref: `#/components/schemas/${s}` } : s } } } ] } } }
});
const B = (required, props) => ({ required: true, schema: { type: 'object', required, properties: props } });
const BO = (props) => ({ required: false, schema: { type: 'object', properties: props } });
const PP = (name, type, fmt, desc) => ({ name, in: 'path', required: true, schema: { type, format: fmt }, description: desc });
const QP = (name, type, desc, def) => ({ name, in: 'query', required: false, schema: { type, default: def } });
const QPR = (name, type, desc) => ({ name, in: 'query', required: true, schema: { type } });

// ===== All route definitions =====

// --- Authentication ---
add('post', '/auth/google', { tags: ['Authentication'], summary: 'Google Sign-In', operationId: 'authGoogleSignIn', requestBody: B(['idToken'], { idToken: { type: 'string', description: 'Google identity token' } }), responses: { '200': R('AuthSuccess'), '400': R('BadRequest'), '500': R('InternalError') } });
add('post', '/auth/register', { tags: ['Authentication'], summary: 'Register a new user', operationId: 'authRegister', requestBody: B(['email', 'password', 'name'], { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '409': R('Conflict') } });
add('post', '/auth/login', { tags: ['Authentication'], summary: 'Login with email and password', operationId: 'authLogin', requestBody: B(['email', 'password'], { email: { type: 'string', format: 'email' }, password: { type: 'string' } }), responses: { '200': R('AuthSuccess'), '401': R('Unauthorized') } });
add('post', '/auth/logout', { tags: ['Authentication'], summary: 'Logout', operationId: 'authLogout', security: true, responses: { '200': R('Success'), '401': R('Unauthorized') } });
add('post', '/auth/refresh', { tags: ['Authentication'], summary: 'Refresh access token', operationId: 'authRefresh', requestBody: B(['refreshToken'], { refreshToken: { type: 'string' } }), responses: { '200': R('AuthSuccess'), '401': R('Unauthorized') } });
add('post', '/auth/forgot-password', { tags: ['Authentication'], summary: 'Send password reset email', operationId: 'authForgotPassword', requestBody: B(['email'], { email: { type: 'string', format: 'email' } }), responses: { '200': R('Success'), '400': R('BadRequest') } });
add('post', '/auth/reset-password', { tags: ['Authentication'], summary: 'Reset password with token', operationId: 'authResetPassword', requestBody: B(['token', 'password'], { token: { type: 'string' }, password: { type: 'string', minLength: 8 } }), responses: { '200': R('Success'), '400': R('BadRequest') } });
add('get', '/auth/me', { tags: ['Authentication'], summary: 'Get current user', operationId: 'authGetMe', security: true, responses: { '200': DR('User', 'Current user data'), '401': R('Unauthorized') } });
add('post', '/auth/select-child', { tags: ['Authentication'], summary: 'Select active child', operationId: 'authSelectChild', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden') } });

// --- Users ---
add('get', '/users', { tags: ['Users'], summary: 'List all users', operationId: 'usersList', responses: { '200': DAR('User', 'Array of users'), '500': R('InternalError') } });
add('post', '/users', { tags: ['Users'], summary: 'Create a new user', operationId: 'usersCreate', requestBody: B(['email', 'password', 'name'], { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' }, role: { type: 'string', enum: ['PARENT', 'ADMIN'] } }), responses: { '201': R('Created'), '400': R('BadRequest'), '409': R('Conflict') } });
add('get', '/users/{id}', { tags: ['Users'], summary: 'Get user by ID', operationId: 'usersGetById', parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('User', 'User object'), '404': R('NotFound') } });
add('put', '/users/{id}', { tags: ['Users'], summary: 'Update user', operationId: 'usersUpdate', parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 } }), responses: { '200': R('Success'), '400': R('BadRequest'), '404': R('NotFound') } });
add('delete', '/users/{id}', { tags: ['Users'], summary: 'Delete user', operationId: 'usersDelete', parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '404': R('NotFound') } });

// --- Children ---
add('get', '/children', { tags: ['Children'], summary: 'List children', operationId: 'childrenList', security: true, responses: { '200': DAR('Child', 'Array of children'), '401': R('Unauthorized') } });
add('post', '/children', { tags: ['Children'], summary: 'Create child profile', operationId: 'childrenCreate', security: true, requestBody: B(['name'], { name: { type: 'string' }, dateOfBirth: { type: 'string', format: 'date' }, avatar: { type: 'string' }, grade: { type: 'string' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/children/{id}', { tags: ['Children'], summary: 'Get child by ID', operationId: 'childrenGetById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Child', 'Child object'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('put', '/children/{id}', { tags: ['Children'], summary: 'Update child profile', operationId: 'childrenUpdate', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, dateOfBirth: { type: 'string', format: 'date' }, avatar: { type: 'string' }, grade: { type: 'string' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('delete', '/children/{id}', { tags: ['Children'], summary: 'Delete child profile', operationId: 'childrenDelete', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Categories ---
add('get', '/categories', { tags: ['Categories'], summary: 'List all categories', operationId: 'categoriesList', responses: { '200': DAR('Category', 'Array of categories') } });
add('post', '/categories', { tags: ['Categories'], summary: 'Create category', operationId: 'categoriesCreate', requestBody: B(['name'], { name: { type: 'string' }, description: { type: 'string' }, icon: { type: 'string' }, order: { type: 'integer' } }), responses: { '201': R('Created'), '400': R('BadRequest') } });
add('get', '/categories/{id}', { tags: ['Categories'], summary: 'Get category by ID', operationId: 'categoriesGetById', parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Category', 'Category object'), '404': R('NotFound') } });
add('put', '/categories/{id}', { tags: ['Categories'], summary: 'Update category', operationId: 'categoriesUpdate', parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, description: { type: 'string' }, icon: { type: 'string' }, order: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '404': R('NotFound') } });
add('delete', '/categories/{id}', { tags: ['Categories'], summary: 'Delete category', operationId: 'categoriesDelete', parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '404': R('NotFound') } });

// --- Modules ---
add('get', '/modules', { tags: ['Modules'], summary: 'List all modules', operationId: 'modulesList', responses: { '200': DAR('Module', 'Array of modules') } });
add('post', '/modules', { tags: ['Modules'], summary: 'Create module', operationId: 'modulesCreate', requestBody: B(['name', 'categoryId'], { name: { type: 'string' }, description: { type: 'string' }, categoryId: { type: 'string', format: 'uuid' }, order: { type: 'integer' } }), responses: { '201': R('Created'), '400': R('BadRequest') } });
add('get', '/modules/{id}', { tags: ['Modules'], summary: 'Get module by ID', operationId: 'modulesGetById', parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Module', 'Module object'), '404': R('NotFound') } });
add('put', '/modules/{id}', { tags: ['Modules'], summary: 'Update module', operationId: 'modulesUpdate', parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, description: { type: 'string' }, categoryId: { type: 'string', format: 'uuid' }, order: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '404': R('NotFound') } });
add('delete', '/modules/{id}', { tags: ['Modules'], summary: 'Delete module', operationId: 'modulesDelete', parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '404': R('NotFound') } });

// --- Lessons ---
add('get', '/lessons', { tags: ['Lessons'], summary: 'List all lessons', operationId: 'lessonsList', responses: { '200': DAR('Lesson', 'Array of lessons') } });
add('post', '/lessons', { tags: ['Lessons'], summary: 'Create lesson', operationId: 'lessonsCreate', requestBody: B(['name', 'moduleId'], { name: { type: 'string' }, description: { type: 'string' }, moduleId: { type: 'string', format: 'uuid' }, order: { type: 'integer' }, content: { type: 'object', description: 'Lesson content data' } }), responses: { '201': R('Created'), '400': R('BadRequest') } });
add('get', '/lessons/{id}', { tags: ['Lessons'], summary: 'Get lesson by ID', operationId: 'lessonsGetById', parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Lesson', 'Lesson object'), '404': R('NotFound') } });
add('put', '/lessons/{id}', { tags: ['Lessons'], summary: 'Update lesson', operationId: 'lessonsUpdate', parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, description: { type: 'string' }, moduleId: { type: 'string', format: 'uuid' }, order: { type: 'integer' }, content: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '404': R('NotFound') } });
add('delete', '/lessons/{id}', { tags: ['Lessons'], summary: 'Delete lesson', operationId: 'lessonsDelete', parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '404': R('NotFound') } });

// --- Activities ---
add('get', '/activities', { tags: ['Activities'], summary: 'List all activities', operationId: 'activitiesList', responses: { '200': DAR('Activity', 'Array of activities') } });
add('post', '/activities', { tags: ['Activities'], summary: 'Create activity', operationId: 'activitiesCreate', requestBody: B(['name', 'lessonId', 'type'], { name: { type: 'string' }, description: { type: 'string' }, lessonId: { type: 'string', format: 'uuid' }, type: { type: 'string', enum: ['VIDEO', 'LISTEN', 'SPEAK', 'WRITE', 'QUIZ', 'GAME'] }, order: { type: 'integer' }, content: { type: 'object', description: 'Activity content/payload data' } }), responses: { '201': R('Created'), '400': R('BadRequest') } });
add('get', '/activities/{id}', { tags: ['Activities'], summary: 'Get activity by ID', operationId: 'activitiesGetById', parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Activity', 'Activity object'), '404': R('NotFound') } });
add('put', '/activities/{id}', { tags: ['Activities'], summary: 'Update activity', operationId: 'activitiesUpdate', parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, description: { type: 'string' }, type: { type: 'string', enum: ['VIDEO', 'LISTEN', 'SPEAK', 'WRITE', 'QUIZ', 'GAME'] }, order: { type: 'integer' }, content: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '404': R('NotFound') } });
add('delete', '/activities/{id}', { tags: ['Activities'], summary: 'Delete activity', operationId: 'activitiesDelete', parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '404': R('NotFound') } });

// --- Videos ---
add('get', '/videos', { tags: ['Videos'], summary: 'List all videos', operationId: 'videosList', responses: { '200': DAR('Video', 'Array of videos') } });
add('post', '/videos', { tags: ['Videos'], summary: 'Create video resource', operationId: 'videosCreate', requestBody: B(['title', 'url'], { title: { type: 'string' }, description: { type: 'string' }, url: { type: 'string', format: 'uri' }, thumbnail: { type: 'string' }, duration: { type: 'integer' }, lessonId: { type: 'string', format: 'uuid' } }), responses: { '201': R('Created'), '400': R('BadRequest') } });
add('get', '/videos/{id}', { tags: ['Videos'], summary: 'Get video by ID', operationId: 'videosGetById', parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Video', 'Video object'), '404': R('NotFound') } });
add('put', '/videos/{id}', { tags: ['Videos'], summary: 'Update video', operationId: 'videosUpdate', parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ title: { type: 'string' }, description: { type: 'string' }, url: { type: 'string', format: 'uri' }, thumbnail: { type: 'string' }, duration: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '404': R('NotFound') } });
add('delete', '/videos/{id}', { tags: ['Videos'], summary: 'Delete video', operationId: 'videosDelete', parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '404': R('NotFound') } });

// --- Audio ---
add('get', '/audio', { tags: ['Audio'], summary: 'List all audio', operationId: 'audioList', security: true, responses: { '200': DAR('Audio', 'Array of audio'), '401': R('Unauthorized') } });
add('get', '/audio/{id}', { tags: ['Audio'], summary: 'Get audio by ID', operationId: 'audioGetById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Audio', 'Audio object'), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Mentors ---
add('get', '/mentors', { tags: ['Mentors'], summary: 'List all mentors', operationId: 'mentorsList', security: true, responses: { '200': DAR('Mentor', 'Array of mentors'), '401': R('Unauthorized') } });
add('get', '/mentors/{id}', { tags: ['Mentors'], summary: 'Get mentor by ID', operationId: 'mentorsGetById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Mentor', 'Mentor object'), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Progress ---
add('get', '/progress', { tags: ['Progress'], summary: 'List progress records', operationId: 'progressList', security: true, responses: { '200': DAR('ProgressItem', 'Array of progress records'), '401': R('Unauthorized') } });
add('get', '/progress/overview', { tags: ['Progress'], summary: 'Progress overview dashboard', operationId: 'progressOverview', security: true, responses: { '200': DR({ type: 'object', description: 'Aggregated progress overview' }), '401': R('Unauthorized') } });
add('get', '/progress/{lessonId}', { tags: ['Progress'], summary: 'Get progress by lesson', operationId: 'progressGetByLesson', security: true, parameters: [PP('lessonId', 'string', 'uuid')], responses: { '200': DR('ProgressItem', 'Progress record'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/progress/complete', { tags: ['Progress'], summary: 'Complete a lesson', operationId: 'progressCompleteLesson', security: true, requestBody: B(['lessonId'], { lessonId: { type: 'string', format: 'uuid' }, score: { type: 'integer' }, timeSpent: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/progress/module/complete', { tags: ['Progress'], summary: 'Complete a module', operationId: 'progressCompleteModule', security: true, requestBody: B(['moduleId'], { moduleId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/progress/category/complete', { tags: ['Progress'], summary: 'Complete a category', operationId: 'progressCompleteCategory', security: true, requestBody: B(['categoryId'], { categoryId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/progress/reset', { tags: ['Progress'], summary: 'Reset all progress', operationId: 'progressReset', security: true, responses: { '200': R('Success'), '401': R('Unauthorized') } });

// --- Video Progress ---
add('get', '/video-progress/{videoId}', { tags: ['VideoProgress'], summary: 'Get video progress', operationId: 'videoProgressGet', security: true, parameters: [PP('videoId', 'string', 'uuid')], responses: { '200': DR('ProgressItem', 'Video progress record'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/video-progress', { tags: ['VideoProgress'], summary: 'Save video progress', operationId: 'videoProgressSave', security: true, requestBody: B(['videoId', 'progress'], { videoId: { type: 'string', format: 'uuid' }, progress: { type: 'number', description: 'Watch progress percentage (0-100)' }, timeWatched: { type: 'integer', description: 'Seconds watched' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/video-progress/complete', { tags: ['VideoProgress'], summary: 'Mark video as complete', operationId: 'videoProgressComplete', security: true, requestBody: B(['videoId'], { videoId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });

// --- Listen Progress ---
add('get', '/listen-progress/{activityId}', { tags: ['ListenProgress'], summary: 'Get listen progress', operationId: 'listenProgressGet', security: true, parameters: [PP('activityId', 'string', 'uuid')], responses: { '200': DR('ProgressItem', 'Listen progress record'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/listen-progress', { tags: ['ListenProgress'], summary: 'Save listen progress', operationId: 'listenProgressSave', security: true, requestBody: B(['activityId', 'progress'], { activityId: { type: 'string', format: 'uuid' }, progress: { type: 'number' }, timeListened: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/listen-progress/complete', { tags: ['ListenProgress'], summary: 'Mark listen as complete', operationId: 'listenProgressComplete', security: true, requestBody: B(['activityId'], { activityId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });

// --- Speak Progress ---
add('get', '/speak-progress/{activityId}', { tags: ['SpeakProgress'], summary: 'Get speak progress', operationId: 'speakProgressGet', security: true, parameters: [PP('activityId', 'string', 'uuid')], responses: { '200': DR('ProgressItem', 'Speak progress record'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/speak-progress', { tags: ['SpeakProgress'], summary: 'Save speak progress', operationId: 'speakProgressSave', security: true, requestBody: B(['activityId', 'progress'], { activityId: { type: 'string', format: 'uuid' }, progress: { type: 'number' }, recordingUrl: { type: 'string', format: 'uri' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/speak-progress/complete', { tags: ['SpeakProgress'], summary: 'Mark speak as complete', operationId: 'speakProgressComplete', security: true, requestBody: B(['activityId'], { activityId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });

// --- Write Progress ---
add('get', '/write-progress/{activityId}', { tags: ['WriteProgress'], summary: 'Get write progress', operationId: 'writeProgressGet', security: true, parameters: [PP('activityId', 'string', 'uuid')], responses: { '200': DR('ProgressItem', 'Write progress record'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/write-progress', { tags: ['WriteProgress'], summary: 'Save write progress', operationId: 'writeProgressSave', security: true, requestBody: B(['activityId', 'progress'], { activityId: { type: 'string', format: 'uuid' }, progress: { type: 'number' }, content: { type: 'string', description: 'Written content by the child' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/write-progress/complete', { tags: ['WriteProgress'], summary: 'Mark write as complete', operationId: 'writeProgressComplete', security: true, requestBody: B(['activityId'], { activityId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });

// --- Rewards ---
add('get', '/rewards', { tags: ['Rewards'], summary: 'List all rewards', operationId: 'rewardsList', security: true, responses: { '200': DAR('Reward', 'Array of rewards'), '401': R('Unauthorized') } });
add('get', '/rewards/stickers', { tags: ['Rewards'], summary: 'List sticker rewards', operationId: 'rewardsListStickers', security: true, responses: { '200': DAR('Reward', 'Array of sticker rewards'), '401': R('Unauthorized') } });
add('get', '/rewards/badges', { tags: ['Rewards'], summary: 'List badge rewards', operationId: 'rewardsListBadges', security: true, responses: { '200': DAR('Reward', 'Array of badge rewards'), '401': R('Unauthorized') } });

// --- Stories ---
add('get', '/stories', { tags: ['Stories'], summary: 'List all stories', operationId: 'storiesList', security: true, responses: { '200': DAR('Story', 'Array of stories'), '401': R('Unauthorized') } });
add('get', '/stories/{id}', { tags: ['Stories'], summary: 'Get story by ID', operationId: 'storiesGetById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Story', 'Story object'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/stories/{id}/progress', { tags: ['Stories'], summary: 'Get story progress', operationId: 'storiesGetProgress', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Story reading session progress' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/stories/{id}/start', { tags: ['Stories'], summary: 'Start reading a story', operationId: 'storiesStart', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Story session with current page' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/stories/{id}/page', { tags: ['Stories'], summary: 'Advance to next page', operationId: 'storiesAdvancePage', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ page: { type: 'integer' }, interaction: { type: 'object', description: 'Optional interaction data' } }), responses: { '200': DR({ type: 'object', description: 'Updated page state' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/stories/{id}/complete', { tags: ['Stories'], summary: 'Complete a story', operationId: 'storiesComplete', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Assessments ---
add('get', '/assessments', { tags: ['Assessments'], summary: 'List all assessments', operationId: 'assessmentsList', security: true, responses: { '200': DAR('Assessment', 'Array of assessments'), '401': R('Unauthorized') } });
add('post', '/assessments', { tags: ['Assessments'], summary: 'Create assessment (admin)', operationId: 'assessmentsCreate', security: true, requestBody: B(['title', 'questions'], { title: { type: 'string' }, description: { type: 'string' }, questions: { type: 'array', items: { type: 'object', description: 'Assessment question object' } }, skillId: { type: 'string', format: 'uuid' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/assessments/{id}', { tags: ['Assessments'], summary: 'Get assessment by ID', operationId: 'assessmentsGetById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('Assessment', 'Assessment object'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/assessments/{childId}/attempts', { tags: ['Assessments'], summary: 'Start assessment attempt', operationId: 'assessmentsStartAttempt', security: true, parameters: [PP('childId', 'string', 'uuid')], requestBody: B(['assessmentId'], { assessmentId: { type: 'string', format: 'uuid' } }), responses: { '201': DR('Attempt', 'Attempt created'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/assessments/{childId}/attempts', { tags: ['Assessments'], summary: 'Get attempt history', operationId: 'assessmentsAttemptHistory', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR('Attempt', 'Array of attempts'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/assessments/{childId}/attempts/{attemptId}', { tags: ['Assessments'], summary: 'Get attempt by ID', operationId: 'assessmentsGetAttempt', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('attemptId', 'string', 'uuid')], responses: { '200': DR('Attempt', 'Attempt object'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/assessments/{childId}/attempts/{attemptId}/submit', { tags: ['Assessments'], summary: 'Submit assessment attempt', operationId: 'assessmentsSubmitAttempt', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('attemptId', 'string', 'uuid')], requestBody: B(['answers'], { answers: { type: 'array', items: { type: 'object', properties: { questionId: { type: 'string' }, answer: { description: 'The child answer' }, timeSpent: { type: 'integer' } } } } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });

// --- Mastery ---
add('post', '/mastery/update', { tags: ['Mastery'], summary: 'Update skill performance', operationId: 'masteryUpdatePerformance', security: true, requestBody: B(['childId', 'skillId', 'score'], { childId: { type: 'string', format: 'uuid' }, skillId: { type: 'string', format: 'uuid' }, score: { type: 'number' }, modality: { type: 'string' }, context: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/mastery/weak-skills', { tags: ['Mastery'], summary: 'Get weak skills', operationId: 'masteryGetWeakSkills', security: true, responses: { '200': DAR({ type: 'object', description: 'Weak skill data' }), '401': R('Unauthorized') } });
add('get', '/mastery/child/{childId}', { tags: ['Mastery'], summary: 'Get child skills mastery', operationId: 'masteryGetChildSkills', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Child skill mastery data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/mastery/{skillId}', { tags: ['Mastery'], summary: 'Get skill health', operationId: 'masteryGetSkillHealth', security: true, parameters: [PP('skillId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Skill health metrics (knowledge, confidence, retention, engagement scores)' }), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Curriculum ---
add('get', '/curriculum', { tags: ['Curriculum'], summary: 'Get curriculum', operationId: 'curriculumGet', security: true, responses: { '200': DR({ type: 'object', description: 'Personalized curriculum' }), '401': R('Unauthorized') } });
add('get', '/curriculum/available', { tags: ['Curriculum'], summary: 'Get available skills', operationId: 'curriculumGetAvailable', security: true, responses: { '200': DAR({ type: 'object', description: 'Available skill data' }), '401': R('Unauthorized') } });
add('get', '/curriculum/next', { tags: ['Curriculum'], summary: 'Get next recommendations', operationId: 'curriculumGetNext', security: true, responses: { '200': DAR({ type: 'object', description: 'Next recommended skills' }), '401': R('Unauthorized') } });
add('get', '/curriculum/subject/{subjectId}', { tags: ['Curriculum'], summary: 'Get subject curriculum', operationId: 'curriculumGetSubject', security: true, parameters: [PP('subjectId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Subject curriculum data' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/curriculum/generate', { tags: ['Curriculum'], summary: 'Generate curriculum', operationId: 'curriculumGenerate', security: true, requestBody: BO({ subjects: { type: 'array', items: { type: 'string' } }, preferences: { type: 'object' } }), responses: { '200': DR({ type: 'object', description: 'Generated curriculum' }), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/curriculum/activate', { tags: ['Curriculum'], summary: 'Activate a skill', operationId: 'curriculumActivateSkill', security: true, requestBody: B(['skillId'], { skillId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/curriculum/complete', { tags: ['Curriculum'], summary: 'Complete a skill', operationId: 'curriculumCompleteSkill', security: true, requestBody: B(['skillId'], { skillId: { type: 'string', format: 'uuid' }, score: { type: 'number' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });

// --- Adaptive ---
add('post', '/adaptive/process', { tags: ['Adaptive'], summary: 'Process performance data', operationId: 'adaptiveProcess', security: true, requestBody: B(['childId', 'skillId', 'score'], { childId: { type: 'string', format: 'uuid' }, skillId: { type: 'string', format: 'uuid' }, score: { type: 'number' }, modality: { type: 'string' }, timeSpent: { type: 'integer' }, metadata: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/adaptive/profile', { tags: ['Adaptive'], summary: 'Get learning profile', operationId: 'adaptiveGetProfile', security: true, responses: { '200': DR({ type: 'object', description: "Child's adaptive learning profile" }), '401': R('Unauthorized') } });
add('get', '/adaptive/modality', { tags: ['Adaptive'], summary: 'Get modality performance', operationId: 'adaptiveGetModality', security: true, responses: { '200': DR({ type: 'object', description: 'Modality performance breakdown' }), '401': R('Unauthorized') } });
add('get', '/adaptive/recommendations', { tags: ['Adaptive'], summary: 'Get recommendations', operationId: 'adaptiveGetRecommendations', security: true, responses: { '200': DAR({ type: 'object', description: 'Recommendation data' }), '401': R('Unauthorized') } });
add('get', '/adaptive/events', { tags: ['Adaptive'], summary: 'Get adaptation events', operationId: 'adaptiveGetEvents', security: true, responses: { '200': DAR({ type: 'object', description: 'Adaptation event data' }), '401': R('Unauthorized') } });

// --- Reinforcement ---
add('post', '/reinforcement/process', { tags: ['Reinforcement'], summary: 'Process reinforcement', operationId: 'reinforcementProcess', security: true, requestBody: B(['childId', 'skillId'], { childId: { type: 'string', format: 'uuid' }, skillId: { type: 'string', format: 'uuid' }, performance: { type: 'number' }, context: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/reinforcement/queue', { tags: ['Reinforcement'], summary: 'Get reinforcement queue', operationId: 'reinforcementGetQueue', security: true, responses: { '200': DR({ type: 'object', description: 'Reinforcement queue data' }), '401': R('Unauthorized') } });
add('get', '/reinforcement/due', { tags: ['Reinforcement'], summary: 'Get due skills', operationId: 'reinforcementGetDue', security: true, responses: { '200': DAR({ type: 'object', description: 'Due skill data' }), '401': R('Unauthorized') } });
add('get', '/reinforcement/history', { tags: ['Reinforcement'], summary: 'View history', operationId: 'reinforcementGetHistory', security: true, responses: { '200': DAR({ type: 'object', description: 'Reinforcement history data' }), '401': R('Unauthorized') } });
add('get', '/reinforcement/events', { tags: ['Reinforcement'], summary: 'View events', operationId: 'reinforcementGetEvents', security: true, responses: { '200': DAR({ type: 'object', description: 'Reinforcement event data' }), '401': R('Unauthorized') } });

// --- Session ---
add('post', '/session', { tags: ['Session'], summary: 'Create a learning session', operationId: 'sessionCreate', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' }, type: { type: 'string', enum: ['DAILY', 'PRACTICE', 'ASSESSMENT', 'REINFORCEMENT'] }, blocks: { type: 'array', items: { type: 'object' } }, metadata: { type: 'object' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session/generate', { tags: ['Session'], summary: 'Generate session plan', operationId: 'sessionGenerate', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' }, duration: { type: 'integer', description: 'Target duration in minutes' }, focus: { type: 'array', items: { type: 'string' } } }), responses: { '200': DR({ type: 'object', description: 'Generated session plan' }), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/session/today', { tags: ['Session'], summary: "Get today's sessions", operationId: 'sessionGetToday', security: true, responses: { '200': DAR('SessionObj', "Today's sessions"), '401': R('Unauthorized') } });
add('get', '/session/history', { tags: ['Session'], summary: 'Get session history', operationId: 'sessionGetHistory', security: true, responses: { '200': DAR('SessionObj', 'Session history'), '401': R('Unauthorized') } });
add('get', '/session/events', { tags: ['Session'], summary: 'Get session events', operationId: 'sessionGetEvents', security: true, responses: { '200': DAR({ type: 'object', description: 'Session event data' }), '401': R('Unauthorized') } });
add('get', '/session/{id}', { tags: ['Session'], summary: 'Get session by ID', operationId: 'sessionGetById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('SessionObj', 'Session object'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/start', { tags: ['Session'], summary: 'Start a session', operationId: 'sessionStart', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session/pause', { tags: ['Session'], summary: 'Pause a session', operationId: 'sessionPause', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session/resume', { tags: ['Session'], summary: 'Resume a session', operationId: 'sessionResume', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session/complete', { tags: ['Session'], summary: 'Complete a session', operationId: 'sessionComplete', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' }, feedback: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session/abandon', { tags: ['Session'], summary: 'Abandon a session', operationId: 'sessionAbandon', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' }, reason: { type: 'string' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session/{id}/start', { tags: ['Session'], summary: 'Start session by ID', operationId: 'sessionStartById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/{id}/pause', { tags: ['Session'], summary: 'Pause session by ID', operationId: 'sessionPauseById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/{id}/resume', { tags: ['Session'], summary: 'Resume session by ID', operationId: 'sessionResumeById', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/{id}/complete', { tags: ['Session'], summary: 'Complete session by ID', operationId: 'sessionCompleteById', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ feedback: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/{id}/abandon', { tags: ['Session'], summary: 'Abandon session by ID', operationId: 'sessionAbandonById', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ reason: { type: 'string' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/{id}/block/complete', { tags: ['Session'], summary: 'Complete a session block', operationId: 'sessionCompleteBlock', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: B(['blockId'], { blockId: { type: 'string', format: 'uuid' }, score: { type: 'number' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session/{id}/block/skip', { tags: ['Session'], summary: 'Skip a session block', operationId: 'sessionSkipBlock', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: B(['blockId'], { blockId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Analytics ---
add('get', '/analytics', { tags: ['Analytics'], summary: 'Get analytics snapshot', operationId: 'analyticsGetSnapshot', security: true, responses: { '200': DR({ type: 'object', description: 'Analytics snapshot data' }), '401': R('Unauthorized') } });
add('get', '/analytics/history', { tags: ['Analytics'], summary: 'Get analytics history', operationId: 'analyticsGetHistory', security: true, parameters: [QP('days', 'integer', 'Number of days', 30), QP('childId', 'string', 'Child ID filter')], responses: { '200': DR({ type: 'object', description: 'Analytics history data' }), '401': R('Unauthorized') } });
add('get', '/analytics/trends', { tags: ['Analytics'], summary: 'Get learning trends', operationId: 'analyticsGetTrends', security: true, responses: { '200': DR({ type: 'object', description: 'Learning trend data' }), '401': R('Unauthorized') } });
add('get', '/analytics/subjects', { tags: ['Analytics'], summary: 'Get subject performance', operationId: 'analyticsGetSubjects', security: true, responses: { '200': DR({ type: 'object', description: 'Subject performance data' }), '401': R('Unauthorized') } });
add('get', '/analytics/insights', { tags: ['Analytics'], summary: 'Get learning insights', operationId: 'analyticsGetInsights', security: true, responses: { '200': DR({ type: 'object', description: 'Learning insight data' }), '401': R('Unauthorized') } });
add('get', '/analytics/report', { tags: ['Analytics'], summary: 'Get analytics report', operationId: 'analyticsGetReport', security: true, responses: { '200': DR({ type: 'object', description: 'Analytics report data' }), '401': R('Unauthorized') } });
add('get', '/analytics/overview', { tags: ['Analytics'], summary: 'Get parent-facing overview', operationId: 'analyticsGetOverview', security: true, responses: { '200': DR({ type: 'object', description: 'Parent-facing overview data' }), '401': R('Unauthorized') } });
add('get', '/analytics/activity', { tags: ['Analytics'], summary: 'Get activity analytics', operationId: 'analyticsGetActivity', security: true, responses: { '200': DR({ type: 'object', description: 'Activity analytics data' }), '401': R('Unauthorized') } });
add('get', '/analytics/progress', { tags: ['Analytics'], summary: 'Get progress analytics', operationId: 'analyticsGetProgress', security: true, responses: { '200': DR({ type: 'object', description: 'Progress analytics data' }), '401': R('Unauthorized') } });
add('get', '/analytics/rewards', { tags: ['Analytics'], summary: 'Get rewards analytics', operationId: 'analyticsGetRewards', security: true, responses: { '200': DR({ type: 'object', description: 'Rewards analytics data' }), '401': R('Unauthorized') } });
add('get', '/analytics/timeline', { tags: ['Analytics'], summary: 'Get learning timeline', operationId: 'analyticsGetTimeline', security: true, responses: { '200': DR({ type: 'object', description: 'Timeline data' }), '401': R('Unauthorized') } });

// --- Notifications ---
add('get', '/notifications', { tags: ['Notifications'], summary: 'List notifications', operationId: 'notificationsList', security: true, parameters: [QP('limit', 'integer', 'Max results', 50), QP('offset', 'integer', 'Pagination offset', 0), QP('unreadOnly', 'boolean', 'Filter unread only')], responses: { '200': DAR('Notification', 'Array of notifications'), '401': R('Unauthorized') } });
add('post', '/notifications', { tags: ['Notifications'], summary: 'Create notification', operationId: 'notificationsCreate', security: true, requestBody: B(['userId', 'title', 'body'], { userId: { type: 'string', format: 'uuid' }, title: { type: 'string' }, body: { type: 'string' }, type: { type: 'string' }, data: { type: 'object' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/notifications/unread-count', { tags: ['Notifications'], summary: 'Get unread count', operationId: 'notificationsUnreadCount', security: true, responses: { '200': DR({ type: 'object', properties: { count: { type: 'integer' } } }), '401': R('Unauthorized') } });
add('patch', '/notifications/read-all', { tags: ['Notifications'], summary: 'Mark all as read', operationId: 'notificationsMarkAllRead', security: true, responses: { '200': R('Success'), '401': R('Unauthorized') } });
add('patch', '/notifications/{id}/read', { tags: ['Notifications'], summary: 'Mark notification as read', operationId: 'notificationsMarkRead', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('delete', '/notifications/{id}', { tags: ['Notifications'], summary: 'Delete notification', operationId: 'notificationsDelete', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Learner ---
add('get', '/v1/learner/{childId}/state', { tags: ['Learner'], summary: 'Get learner state', operationId: 'learnerGetState', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Learner state including knowledge and topic states' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/v1/learner/{childId}/recommendation', { tags: ['Learner'], summary: 'Get learner recommendation', operationId: 'learnerGetRecommendation', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Recommendation data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });

// --- Learning Events ---
add('post', '/v1/learning-events', { tags: ['LearningEvents'], summary: 'Create learning event', operationId: 'learningEventsCreate', security: true, requestBody: B(['childId', 'type', 'activityId'], { childId: { type: 'string', format: 'uuid' }, type: { type: 'string' }, activityId: { type: 'string', format: 'uuid' }, sessionId: { type: 'string', format: 'uuid' }, topicId: { type: 'string' }, metadata: { type: 'object' }, timestamp: { type: 'string', format: 'date-time' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/learning-events', { tags: ['LearningEvents'], summary: 'Get events by child', operationId: 'learningEventsGetByChild', security: true, parameters: [QP('childId', 'string', 'Child ID filter'), QP('limit', 'integer', 'Max results'), QP('offset', 'integer', 'Pagination offset')], responses: { '200': DAR({ type: 'object', description: 'Learning event data' }), '401': R('Unauthorized') } });
add('get', '/v1/learning-events/session/{sessionId}', { tags: ['LearningEvents'], summary: 'Get events by session', operationId: 'learningEventsGetBySession', security: true, parameters: [PP('sessionId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Session event data' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/v1/learning-events/activity/{activityId}', { tags: ['LearningEvents'], summary: 'Get events by activity', operationId: 'learningEventsGetByActivity', security: true, parameters: [PP('activityId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Activity event data' }), '401': R('Unauthorized') } });
add('get', '/v1/learning-events/topic/{topicId}', { tags: ['LearningEvents'], summary: 'Get events by topic', operationId: 'learningEventsGetByTopic', security: true, parameters: [PP('topicId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Topic event data' }), '401': R('Unauthorized') } });
add('get', '/v1/learning-events/evidence', { tags: ['LearningEvents'], summary: 'Get evidence by child', operationId: 'learningEventsGetEvidenceByChild', security: true, parameters: [QP('childId', 'string', 'Child ID filter')], responses: { '200': DAR({ type: 'object', description: 'Learning evidence data' }), '401': R('Unauthorized') } });
add('get', '/v1/learning-events/evidence/session/{sessionId}', { tags: ['LearningEvents'], summary: 'Get evidence by session', operationId: 'learningEventsGetEvidenceBySession', security: true, parameters: [PP('sessionId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Session evidence data' }), '401': R('Unauthorized') } });
add('get', '/v1/learning-events/evidence/activity/{activityId}', { tags: ['LearningEvents'], summary: 'Get evidence by activity', operationId: 'learningEventsGetEvidenceByActivity', security: true, parameters: [PP('activityId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Activity evidence data' }), '401': R('Unauthorized') } });
add('get', '/v1/learning-events/evidence/topic/{topicId}', { tags: ['LearningEvents'], summary: 'Get evidence by topic', operationId: 'learningEventsGetEvidenceByTopic', security: true, parameters: [PP('topicId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Topic evidence data' }), '401': R('Unauthorized') } });

// --- Intelligence Core ---
add('post', '/v1/intelligence-core/observation/observe', { tags: ['IntelligenceCore'], summary: 'Observe learning event', operationId: 'intelligenceObserve', security: true, requestBody: B(['childId', 'eventType', 'topicId'], { childId: { type: 'string', format: 'uuid' }, eventType: { type: 'string' }, topicId: { type: 'string' }, data: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/intelligence-core/observation/topic-states', { tags: ['IntelligenceCore'], summary: 'Get topic states', operationId: 'intelligenceGetTopicStates', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Topic state data' }), '401': R('Unauthorized') } });
add('get', '/v1/intelligence-core/observation/knowledge-states', { tags: ['IntelligenceCore'], summary: 'Get knowledge states', operationId: 'intelligenceGetKnowledgeStates', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Knowledge state data' }), '401': R('Unauthorized') } });
add('post', '/v1/intelligence-core/evidence/process', { tags: ['IntelligenceCore'], summary: 'Process evidence', operationId: 'intelligenceProcessEvidence', security: true, requestBody: B(['childId', 'evidence'], { childId: { type: 'string', format: 'uuid' }, evidence: { type: 'object' }, source: { type: 'string' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/intelligence-core/evidence/metric-snapshots', { tags: ['IntelligenceCore'], summary: 'Get metric snapshots', operationId: 'intelligenceGetMetricSnapshots', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DAR({ type: 'object', description: 'Metric snapshot data' }), '401': R('Unauthorized') } });
add('post', '/v1/intelligence-core/classification/classify', { tags: ['IntelligenceCore'], summary: 'Classify child state', operationId: 'intelligenceClassify', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' }, data: { type: 'object' } }), responses: { '200': DR({ type: 'object', description: 'Classification result' }), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/intelligence-core/classification/result', { tags: ['IntelligenceCore'], summary: 'Get classification result', operationId: 'intelligenceGetClassificationResult', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Classification result data' }), '401': R('Unauthorized') } });

// --- Adaptive Planning ---
add('post', '/v1/adaptive-planning/roadmap', { tags: ['AdaptivePlanning'], summary: 'Create dynamic roadmap', operationId: 'adaptivePlanningCreateRoadmap', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/roadmap', { tags: ['AdaptivePlanning'], summary: 'Get dynamic roadmap', operationId: 'adaptivePlanningGetRoadmap', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Roadmap data' }), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/roadmap/items', { tags: ['AdaptivePlanning'], summary: 'Get roadmap items', operationId: 'adaptivePlanningGetRoadmapItems', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DAR({ type: 'object', description: 'Roadmap item data' }), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/learning-debts', { tags: ['AdaptivePlanning'], summary: 'Create learning debt', operationId: 'adaptivePlanningCreateLearningDebt', security: true, requestBody: B(['childId', 'skillId', 'reason'], { childId: { type: 'string', format: 'uuid' }, skillId: { type: 'string', format: 'uuid' }, reason: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/learning-debts', { tags: ['AdaptivePlanning'], summary: 'Get learning debts', operationId: 'adaptivePlanningGetLearningDebts', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DAR({ type: 'object', description: 'Learning debt data' }), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/learning-debts/{debtId}/resolve', { tags: ['AdaptivePlanning'], summary: 'Resolve learning debt', operationId: 'adaptivePlanningResolveDebt', security: true, parameters: [PP('debtId', 'string', 'uuid')], requestBody: BO({ resolution: { type: 'string' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/v1/adaptive-planning/reinforcement-queues', { tags: ['AdaptivePlanning'], summary: 'Get reinforcement queues', operationId: 'adaptivePlanningGetReinforcementQueues', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DAR({ type: 'object', description: 'Reinforcement queue data' }), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/practices', { tags: ['AdaptivePlanning'], summary: 'Create practice entry', operationId: 'adaptivePlanningCreatePractice', security: true, requestBody: B(['childId', 'skillId', 'type'], { childId: { type: 'string', format: 'uuid' }, skillId: { type: 'string', format: 'uuid' }, type: { type: 'string', enum: ['DAILY', 'MASTERY', 'REINFORCEMENT'] } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/practices', { tags: ['AdaptivePlanning'], summary: 'Get practice entries', operationId: 'adaptivePlanningGetPractices', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DAR({ type: 'object', description: 'Practice entry data' }), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/recovery-mode', { tags: ['AdaptivePlanning'], summary: 'Get recovery mode status', operationId: 'adaptivePlanningGetRecoveryMode', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Recovery mode data' }), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/recovery-mode', { tags: ['AdaptivePlanning'], summary: 'Create recovery mode', operationId: 'adaptivePlanningCreateRecoveryMode', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' }, reason: { type: 'string' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/recovery-mode/resolve', { tags: ['AdaptivePlanning'], summary: 'Resolve recovery mode', operationId: 'adaptivePlanningResolveRecovery', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/adaptive-constraints', { tags: ['AdaptivePlanning'], summary: 'Get constraints', operationId: 'adaptivePlanningGetConstraints', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Adaptive constraints data' }), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/adaptive-constraints', { tags: ['AdaptivePlanning'], summary: 'Create constraint', operationId: 'adaptivePlanningCreateConstraint', security: true, requestBody: B(['childId', 'type', 'value'], { childId: { type: 'string', format: 'uuid' }, type: { type: 'string' }, value: { type: 'object' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/v1/adaptive-planning/session-plans', { tags: ['AdaptivePlanning'], summary: 'Create session plan', operationId: 'adaptivePlanningCreateSessionPlan', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' }, duration: { type: 'integer' }, blocks: { type: 'array', items: { type: 'object' } } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/session-plans', { tags: ['AdaptivePlanning'], summary: 'Get session plans', operationId: 'adaptivePlanningGetSessionPlans', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DAR({ type: 'object', description: 'Session plan data' }), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/session-plans/{sessionPlanId}', { tags: ['AdaptivePlanning'], summary: 'Get session plan by ID', operationId: 'adaptivePlanningGetSessionPlanById', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Session plan object' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/v1/adaptive-planning/session-plans/{sessionPlanId}/start', { tags: ['AdaptivePlanning'], summary: 'Start session plan', operationId: 'adaptivePlanningStartSessionPlan', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/v1/adaptive-planning/session-plans/{sessionPlanId}/pause', { tags: ['AdaptivePlanning'], summary: 'Pause session plan', operationId: 'adaptivePlanningPauseSessionPlan', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/v1/adaptive-planning/session-plans/{sessionPlanId}/complete', { tags: ['AdaptivePlanning'], summary: 'Complete session plan', operationId: 'adaptivePlanningCompleteSessionPlan', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid')], requestBody: BO({ feedback: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/v1/adaptive-planning/session-plans/{sessionPlanId}/blocks', { tags: ['AdaptivePlanning'], summary: 'Get session blocks', operationId: 'adaptivePlanningGetSessionBlocks', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Session block data' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/v1/adaptive-planning/session-plans/{sessionPlanId}/blocks/{blockId}/complete', { tags: ['AdaptivePlanning'], summary: 'Complete block', operationId: 'adaptivePlanningCompleteBlock', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid'), PP('blockId', 'string', 'uuid')], requestBody: BO({ score: { type: 'number' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/v1/adaptive-planning/session-plans/{sessionPlanId}/blocks/{blockId}/skip', { tags: ['AdaptivePlanning'], summary: 'Skip block', operationId: 'adaptivePlanningSkipBlock', security: true, parameters: [PP('sessionPlanId', 'string', 'uuid'), PP('blockId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/v1/adaptive-planning/recommendations/next', { tags: ['AdaptivePlanning'], summary: 'Get next recommendation', operationId: 'adaptivePlanningGetNextRecommendation', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Next recommendation data' }), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/recommendations/practice', { tags: ['AdaptivePlanning'], summary: 'Get practice recommendation', operationId: 'adaptivePlanningGetPracticeRecommendation', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Practice recommendation data' }), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/recommendations/adaptive', { tags: ['AdaptivePlanning'], summary: 'Get adaptive recommendation', operationId: 'adaptivePlanningGetAdaptiveRecommendation', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Adaptive recommendation data' }), '401': R('Unauthorized') } });
add('get', '/v1/adaptive-planning/recommendations/recovery', { tags: ['AdaptivePlanning'], summary: 'Get recovery recommendation', operationId: 'adaptivePlanningGetRecoveryRecommendation', security: true, parameters: [QPR('childId', 'string', 'Child ID')], responses: { '200': DR({ type: 'object', description: 'Recovery recommendation data' }), '401': R('Unauthorized') } });

// --- Adaptive Curriculum (Public) ---
add('get', '/adaptive-curriculum/skills/search', { tags: ['AdaptiveCurriculum'], summary: 'Search skills', operationId: 'adaptiveCurriculumSearchSkills', security: true, parameters: [QP('q', 'string', 'Search query'), QP('domainId', 'string', 'Domain ID filter'), QP('gradeId', 'string', 'Grade ID filter'), QP('limit', 'integer', 'Max results', 20)], responses: { '200': DAR({ type: 'object', description: 'Matching skill data' }), '401': R('Unauthorized') } });
add('get', '/adaptive-curriculum/skills/{id}', { tags: ['AdaptiveCurriculum'], summary: 'Get skill detail', operationId: 'adaptiveCurriculumGetSkillDetail', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Skill detail' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/adaptive-curriculum/skills/{id}/tags', { tags: ['AdaptiveCurriculum'], summary: 'Get skill tags', operationId: 'adaptiveCurriculumGetSkillTags', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DAR({ type: 'string' }), '401': R('Unauthorized') } });
add('get', '/adaptive-curriculum/skills/{id}/activities', { tags: ['AdaptiveCurriculum'], summary: 'Get skill activities', operationId: 'adaptiveCurriculumGetSkillActivities', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Activity data' }), '401': R('Unauthorized') } });
add('get', '/adaptive-curriculum/skills/{id}/assessments', { tags: ['AdaptiveCurriculum'], summary: 'Get skill assessments', operationId: 'adaptiveCurriculumGetSkillAssessments', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Assessment data' }), '401': R('Unauthorized') } });
add('get', '/adaptive-curriculum/grades', { tags: ['AdaptiveCurriculum'], summary: 'Get all grades', operationId: 'adaptiveCurriculumGetGrades', security: true, responses: { '200': DAR({ type: 'object', description: 'Grade data' }), '401': R('Unauthorized') } });
add('get', '/adaptive-curriculum/grades/{id}', { tags: ['AdaptiveCurriculum'], summary: 'Get grade by ID', operationId: 'adaptiveCurriculumGetGrade', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Grade object' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/adaptive-curriculum/domains', { tags: ['AdaptiveCurriculum'], summary: 'Get all domains', operationId: 'adaptiveCurriculumGetDomains', security: true, responses: { '200': DAR({ type: 'object', description: 'Domain data' }), '401': R('Unauthorized') } });
add('get', '/adaptive-curriculum/domains/{id}', { tags: ['AdaptiveCurriculum'], summary: 'Get domain by ID', operationId: 'adaptiveCurriculumGetDomain', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Domain object' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/adaptive-curriculum/domains/by-subject/{subjectId}', { tags: ['AdaptiveCurriculum'], summary: 'Get domains by subject', operationId: 'adaptiveCurriculumGetDomainsBySubject', security: true, parameters: [PP('subjectId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Domain data for subject' }), '401': R('Unauthorized'), '404': R('NotFound') } });

// --- Adaptive Curriculum (Admin) ---
add('post', '/admin/adaptive-curriculum/grades', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Create grade', operationId: 'adminCurriculumCreateGrade', security: true, requestBody: B(['name', 'code'], { name: { type: 'string' }, code: { type: 'string' }, order: { type: 'integer' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('put', '/admin/adaptive-curriculum/grades/{id}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Update grade', operationId: 'adminCurriculumUpdateGrade', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, code: { type: 'string' }, order: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('delete', '/admin/adaptive-curriculum/grades/{id}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Delete grade', operationId: 'adminCurriculumDeleteGrade', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/admin/adaptive-curriculum/domains', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Create domain', operationId: 'adminCurriculumCreateDomain', security: true, requestBody: B(['name', 'subjectId'], { name: { type: 'string' }, subjectId: { type: 'string', format: 'uuid' }, description: { type: 'string' }, order: { type: 'integer' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('put', '/admin/adaptive-curriculum/domains/{id}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Update domain', operationId: 'adminCurriculumUpdateDomain', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: BO({ name: { type: 'string' }, subjectId: { type: 'string', format: 'uuid' }, description: { type: 'string' }, order: { type: 'integer' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('delete', '/admin/adaptive-curriculum/domains/{id}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Delete domain', operationId: 'adminCurriculumDeleteDomain', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/admin/adaptive-curriculum/skills/{id}/tags', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Add skill tag', operationId: 'adminCurriculumAddSkillTag', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: B(['tag'], { tag: { type: 'string' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('delete', '/admin/adaptive-curriculum/skills/{id}/tags/{tagId}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Remove skill tag', operationId: 'adminCurriculumRemoveSkillTag', security: true, parameters: [PP('id', 'string', 'uuid'), PP('tagId', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/admin/adaptive-curriculum/skills/{id}/activities', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Create skill activity', operationId: 'adminCurriculumCreateSkillActivity', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: B(['title', 'type'], { title: { type: 'string' }, type: { type: 'string' }, content: { type: 'object' } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('put', '/admin/adaptive-curriculum/skills/{id}/activities/{activityId}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Update skill activity', operationId: 'adminCurriculumUpdateSkillActivity', security: true, parameters: [PP('id', 'string', 'uuid'), PP('activityId', 'string', 'uuid')], requestBody: BO({ title: { type: 'string' }, type: { type: 'string' }, content: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('delete', '/admin/adaptive-curriculum/skills/{id}/activities/{activityId}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Delete skill activity', operationId: 'adminCurriculumDeleteSkillActivity', security: true, parameters: [PP('id', 'string', 'uuid'), PP('activityId', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/admin/adaptive-curriculum/skills/{id}/assessments', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Create skill assessment', operationId: 'adminCurriculumCreateSkillAssessment', security: true, parameters: [PP('id', 'string', 'uuid')], requestBody: B(['title', 'questions'], { title: { type: 'string' }, questions: { type: 'array', items: { type: 'object' } } }), responses: { '201': R('Created'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('put', '/admin/adaptive-curriculum/skills/{id}/assessments/{assessmentId}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Update skill assessment', operationId: 'adminCurriculumUpdateSkillAssessment', security: true, parameters: [PP('id', 'string', 'uuid'), PP('assessmentId', 'string', 'uuid')], requestBody: BO({ title: { type: 'string' }, questions: { type: 'array', items: { type: 'object' } } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('delete', '/admin/adaptive-curriculum/skills/{id}/assessments/{assessmentId}', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Delete skill assessment', operationId: 'adminCurriculumDeleteSkillAssessment', security: true, parameters: [PP('id', 'string', 'uuid'), PP('assessmentId', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/admin/adaptive-curriculum/bulk-import', { tags: ['AdaptiveCurriculumAdmin'], summary: 'Bulk import curriculum data', operationId: 'adminCurriculumBulkImport', security: true, requestBody: B(['data'], { data: { type: 'array', items: { type: 'object' } } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });

// --- Placement ---
add('get', '/placement/questionnaire', { tags: ['Placement'], summary: 'Get placement questionnaire', operationId: 'placementGetQuestionnaire', security: true, responses: { '200': DR({ type: 'object', description: 'Placement questionnaire data' }), '401': R('Unauthorized') } });
add('post', '/placement/start', { tags: ['Placement'], summary: 'Start placement test', operationId: 'placementStart', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' } }), responses: { '201': DR({ type: 'object', description: 'Placement session created' }), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/placement/start-from-beginning', { tags: ['Placement'], summary: 'Restart placement from beginning', operationId: 'placementStartFromBeginning', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' } }), responses: { '201': DR({ type: 'object', description: 'Placement session restarted' }), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/placement/children/{childId}/answer', { tags: ['Placement'], summary: 'Submit placement answer', operationId: 'placementSubmitAnswer', security: true, parameters: [PP('childId', 'string', 'uuid')], requestBody: B(['questionId', 'answer'], { questionId: { type: 'string' }, answer: {}, timeSpent: { type: 'integer' } }), responses: { '200': DR({ type: 'object', description: 'Answer result' }), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/placement/children/{childId}/result/{attemptId}', { tags: ['Placement'], summary: 'Get placement result', operationId: 'placementGetResult', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('attemptId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Placement result data' }), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/placement/children/{childId}/complete', { tags: ['Placement'], summary: 'Complete placement test', operationId: 'placementComplete', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/placement/children/{childId}/restart', { tags: ['Placement'], summary: 'Restart placement test', operationId: 'placementRestart', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });

// --- Skill Roadmap ---
add('get', '/adaptive-roadmap/children/{childId}/roadmap', { tags: ['SkillRoadmap'], summary: 'Get skill roadmap', operationId: 'skillRoadmapGet', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Skill roadmap data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/adaptive-roadmap/children/{childId}/refresh', { tags: ['SkillRoadmap'], summary: 'Refresh roadmap', operationId: 'skillRoadmapRefresh', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': R('Success'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptive-roadmap/children/{childId}/section/{section}', { tags: ['SkillRoadmap'], summary: 'Get roadmap section', operationId: 'skillRoadmapGetSection', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('section', 'string')], responses: { '200': DAR({ type: 'object', description: 'Section data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptive-roadmap/children/{childId}/unlocked', { tags: ['SkillRoadmap'], summary: 'Get unlocked skills', operationId: 'skillRoadmapGetUnlocked', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Unlocked skill data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptive-roadmap/children/{childId}/locked', { tags: ['SkillRoadmap'], summary: 'Get locked skills', operationId: 'skillRoadmapGetLocked', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Locked skill data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptive-roadmap/children/{childId}/review', { tags: ['SkillRoadmap'], summary: 'Get review skills', operationId: 'skillRoadmapGetReview', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Review skill data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptive-roadmap/children/{childId}/next', { tags: ['SkillRoadmap'], summary: 'Get next skill', operationId: 'skillRoadmapGetNext', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Next skill data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptive-roadmap/children/{childId}/daily-queue', { tags: ['SkillRoadmap'], summary: 'Get daily queue', operationId: 'skillRoadmapGetDailyQueue', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Daily queue data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/adaptive-roadmap/children/{childId}/unlock/{skillId}', { tags: ['SkillRoadmap'], summary: 'Unlock skill', operationId: 'skillRoadmapUnlock', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('skillId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });

// --- Mastery Engine ---
add('post', '/mastery-engine/{childId}/evaluate', { tags: ['MasteryEngine'], summary: 'Evaluate mastery', operationId: 'masteryEngineEvaluate', security: true, parameters: [PP('childId', 'string', 'uuid')], requestBody: B(['skillId'], { skillId: { type: 'string', format: 'uuid' }, performance: { type: 'number' }, context: { type: 'object' } }), responses: { '200': DR({ type: 'object', description: 'Mastery evaluation result' }), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/mastery-engine/{childId}/recalculate/{skillId}', { tags: ['MasteryEngine'], summary: 'Recalculate skill mastery', operationId: 'masteryEngineRecalculate', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('skillId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('get', '/mastery-engine/{childId}/skills/{skillId}', { tags: ['MasteryEngine'], summary: 'Get skill mastery', operationId: 'masteryEngineGetSkill', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('skillId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Skill mastery data' }), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('get', '/mastery-engine/{childId}/skills/{skillId}/history', { tags: ['MasteryEngine'], summary: 'Get skill history', operationId: 'masteryEngineGetSkillHistory', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('skillId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Skill history data' }), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('get', '/mastery-engine/{childId}/revision-queue', { tags: ['MasteryEngine'], summary: 'Get revision queue', operationId: 'masteryEngineGetRevisionQueue', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DAR({ type: 'object', description: 'Revision queue data' }), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/mastery-engine/{childId}/revision', { tags: ['MasteryEngine'], summary: 'Process revision', operationId: 'masteryEngineProcessRevision', security: true, parameters: [PP('childId', 'string', 'uuid')], requestBody: B(['skillId'], { skillId: { type: 'string', format: 'uuid' }, score: { type: 'number' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });

// --- AI Tutor ---
add('post', '/ai-tutor/{childId}/sessions', { tags: ['AITutor'], summary: 'Start AI tutor session', operationId: 'aiTutorStartSession', security: true, parameters: [PP('childId', 'string', 'uuid')], requestBody: BO({ topic: { type: 'string' }, difficulty: { type: 'string' }, preferences: { type: 'object' } }), responses: { '201': DR({ type: 'object', description: 'AI tutor session created' }), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('post', '/ai-tutor/{childId}/sessions/{sessionId}/resume', { tags: ['AITutor'], summary: 'Resume AI tutor session', operationId: 'aiTutorResumeSession', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('sessionId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/ai-tutor/{childId}/sessions/{sessionId}/end', { tags: ['AITutor'], summary: 'End AI tutor session', operationId: 'aiTutorEndSession', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('sessionId', 'string', 'uuid')], responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('get', '/ai-tutor/{childId}/sessions/{sessionId}/next-activity', { tags: ['AITutor'], summary: 'Get next tutor activity', operationId: 'aiTutorGetNextActivity', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('sessionId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Next activity data' }), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });
add('post', '/ai-tutor/{childId}/sessions/{sessionId}/progress', { tags: ['AITutor'], summary: 'Record tutor progress', operationId: 'aiTutorRecordProgress', security: true, parameters: [PP('childId', 'string', 'uuid'), PP('sessionId', 'string', 'uuid')], requestBody: B(['activityId', 'score'], { activityId: { type: 'string', format: 'uuid' }, score: { type: 'number' }, response: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });

// --- Adaptation ---
add('post', '/adaptation/{childId}/analyze', { tags: ['Adaptation'], summary: 'Analyze child learning', operationId: 'adaptationAnalyze', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Analysis result' }), '400': R('BadRequest'), '401': R('Unauthorized'), '403': R('Forbidden') } });
add('get', '/adaptation/{childId}/profile', { tags: ['Adaptation'], summary: 'Get adaptation profile', operationId: 'adaptationGetProfile', security: true, parameters: [PP('childId', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Adaptation profile data' }), '401': R('Unauthorized'), '403': R('Forbidden'), '404': R('NotFound') } });

// --- Health ---
add('get', '/health/live', { tags: ['Health'], summary: 'Liveness check', operationId: 'healthLiveness', responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok'] } } } } } } } });
add('get', '/health/ready', { tags: ['Health'], summary: 'Readiness check', operationId: 'healthReadiness', responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok'] }, uptime: { type: 'number' } } } } } } } });
add('get', '/health', { tags: ['Health'], summary: 'Full health check', operationId: 'healthFull', responses: { '200': { description: 'Health data', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'number' }, database: { type: 'string' } } } } } } } });

// --- Session Planner ---
add('post', '/session-planner/generate', { tags: ['SessionPlanner'], summary: 'Generate session plan', operationId: 'sessionPlannerGenerate', security: true, requestBody: B(['childId'], { childId: { type: 'string', format: 'uuid' }, duration: { type: 'integer' }, preferences: { type: 'object' } }), responses: { '200': DR({ type: 'object', description: 'Generated session plan' }), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('get', '/session-planner/plans', { tags: ['SessionPlanner'], summary: 'List plans', operationId: 'sessionPlannerListPlans', security: true, responses: { '200': DAR({ type: 'object', description: 'Session plan data' }), '401': R('Unauthorized') } });
add('get', '/session-planner/plan/{id}', { tags: ['SessionPlanner'], summary: 'Get plan by ID', operationId: 'sessionPlannerGetPlan', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR({ type: 'object', description: 'Session plan object' }), '401': R('Unauthorized'), '404': R('NotFound') } });
add('get', '/session-planner/sessions', { tags: ['SessionPlanner'], summary: 'List sessions', operationId: 'sessionPlannerListSessions', security: true, responses: { '200': DAR('SessionObj', 'Sessions'), '401': R('Unauthorized') } });
add('get', '/session-planner/session/{id}', { tags: ['SessionPlanner'], summary: 'Get session by ID', operationId: 'sessionPlannerGetSession', security: true, parameters: [PP('id', 'string', 'uuid')], responses: { '200': DR('SessionObj', 'Session object'), '401': R('Unauthorized'), '404': R('NotFound') } });
add('post', '/session-planner/start', { tags: ['SessionPlanner'], summary: 'Start a session', operationId: 'sessionPlannerStart', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session-planner/complete', { tags: ['SessionPlanner'], summary: 'Complete a session', operationId: 'sessionPlannerComplete', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' }, feedback: { type: 'object' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });
add('post', '/session-planner/abandon', { tags: ['SessionPlanner'], summary: 'Abandon a session', operationId: 'sessionPlannerAbandon', security: true, requestBody: B(['sessionId'], { sessionId: { type: 'string', format: 'uuid' }, reason: { type: 'string' } }), responses: { '200': R('Success'), '400': R('BadRequest'), '401': R('Unauthorized') } });

// --- Roadmap ---
add('get', '/roadmap', { tags: ['Roadmap'], summary: 'Get simple roadmap', operationId: 'roadmapGet', security: true, responses: { '200': DR({ type: 'object', description: 'Simple roadmap data' }), '401': R('Unauthorized') } });

// ===== Generate YAML =====
let result = part1 + '\npaths:\n';
for (const [url, methods] of Object.entries(pm)) {
  result += emitPathMethods(url, methods);
}

fs.writeFileSync(outPath, result, 'utf-8');
console.log('Done! Paths: ' + Object.keys(pm).length);
console.log('Size: ' + result.length + ' bytes');
