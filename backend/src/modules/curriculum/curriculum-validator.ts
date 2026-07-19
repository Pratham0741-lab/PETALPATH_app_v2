import { GradeCurriculum, CurriculumTheme, CurriculumNode, Activity } from './curriculum.types.js';
import { ALLOWED_SUBJECTS, ALLOWED_MONTHS } from './curriculum.config.js';

export interface ValidationErrorDetail {
  gradeId: string;
  themeId: string;
  lessonId: string;
  validationType: string;
  expected: string;
  actual: string;
}

export class CurriculumValidationError extends Error {
  constructor(public readonly errors: ValidationErrorDetail[]) {
    super(`Curriculum validation failed with ${errors.length} error(s).`);
    Object.setPrototypeOf(this, CurriculumValidationError.prototype);
  }

  public formatDiagnostics(): string {
    return this.errors
      .map((err) => {
        return [
          '[Curriculum Validation Error]',
          `- Grade: ${err.gradeId}`,
          `- Theme: ${err.themeId}`,
          `- Lesson ID: ${err.lessonId}`,
          `- Validation Type: ${err.validationType}`,
          `- Expected: ${err.expected}`,
          `- Actual: ${err.actual}`
        ].join('\n');
      })
      .join('\n\n');
  }
}

/**
 * Validates the parsed JSON curriculum for a single grade.
 */
export function validateCurriculum(
  data: any,
  fileName: string,
  globalNodeIds?: Set<string>
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];
  const gradeId = data?.grade?.id || fileName.replace('.json', '');

  // 1. Validate Grade Top-Level Structure
  if (!data || typeof data !== 'object') {
    errors.push({
      gradeId,
      themeId: 'N/A',
      lessonId: 'N/A',
      validationType: 'JSON Structure',
      expected: 'Root element must be a valid JSON object',
      actual: String(data)
    });
    return errors;
  }

  if (!data.grade || typeof data.grade !== 'object') {
    errors.push({
      gradeId,
      themeId: 'N/A',
      lessonId: 'N/A',
      validationType: 'Metadata Presence',
      expected: 'Grade metadata object must exist',
      actual: 'Missing grade property'
    });
    return errors;
  }

  const { id, name, description } = data.grade;
  if (!id || typeof id !== 'string') {
    errors.push({
      gradeId,
      themeId: 'N/A',
      lessonId: 'N/A',
      validationType: 'Metadata Check',
      expected: 'Grade ID must be a non-empty string',
      actual: String(id)
    });
  }
  if (!name || typeof name !== 'string') {
    errors.push({
      gradeId,
      themeId: 'N/A',
      lessonId: 'N/A',
      validationType: 'Metadata Check',
      expected: 'Grade name must be a non-empty string',
      actual: String(name)
    });
  }
  if (!description || typeof description !== 'string') {
    errors.push({
      gradeId,
      themeId: 'N/A',
      lessonId: 'N/A',
      validationType: 'Metadata Check',
      expected: 'Grade description must be a non-empty string',
      actual: String(description)
    });
  }

  if (!Array.isArray(data.themes)) {
    errors.push({
      gradeId,
      themeId: 'N/A',
      lessonId: 'N/A',
      validationType: 'Metadata Presence',
      expected: 'Themes must be a valid array',
      actual: data.themes ? typeof data.themes : 'Missing themes property'
    });
    return errors;
  }

  const themeIds = new Set<string>();
  const themeOrders = new Set<number>();
  const nodeIdsInGrade = new Set<string>();
  const allNodes: CurriculumNode[] = [];

  // 2. Validate Themes
  for (let i = 0; i < data.themes.length; i++) {
    const theme = data.themes[i];
    const themeIndexStr = `Index ${i}`;
    const themeId = theme?.id || themeIndexStr;

    if (!theme || typeof theme !== 'object') {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'Theme Structure',
        expected: 'Theme must be a valid JSON object',
        actual: String(theme)
      });
      continue;
    }

    if (!theme.id || typeof theme.id !== 'string') {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'Theme Metadata',
        expected: 'Theme ID must be a non-empty string',
        actual: String(theme.id)
      });
    } else if (themeIds.has(theme.id)) {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'ID Uniqueness',
        expected: 'Theme ID must be unique within grade',
        actual: `Duplicate theme ID '${theme.id}'`
      });
    } else {
      themeIds.add(theme.id);
    }

    if (!theme.title || typeof theme.title !== 'string') {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'Theme Metadata',
        expected: 'Theme title must be a non-empty string',
        actual: String(theme.title)
      });
    }

    if (typeof theme.order !== 'number' || theme.order < 1 || !Number.isInteger(theme.order)) {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'Order Integrity',
        expected: 'Theme order must be a unique positive integer',
        actual: String(theme.order)
      });
    } else if (themeOrders.has(theme.order)) {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'Order Integrity',
        expected: 'Theme order must be unique within grade',
        actual: `Duplicate theme order '${theme.order}'`
      });
    } else {
      themeOrders.add(theme.order);
    }

    if (!Array.isArray(theme.nodes)) {
      errors.push({
        gradeId,
        themeId,
        lessonId: 'N/A',
        validationType: 'Theme Structure',
        expected: 'Theme nodes must be a valid array',
        actual: theme.nodes ? typeof theme.nodes : 'Missing nodes property'
      });
      continue;
    }

    const nodeOrders = new Set<number>();

    // 3. Validate Nodes (Lessons)
    for (let j = 0; j < theme.nodes.length; j++) {
      const node = theme.nodes[j];
      const nodeIndexStr = `Theme ${themeId} Index ${j}`;
      const nodeId = node?.id || nodeIndexStr;

      if (!node || typeof node !== 'object') {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Structure',
          expected: 'Lesson node must be a valid JSON object',
          actual: String(node)
        });
        continue;
      }

      // Check lesson ID presence
      if (!node.id || typeof node.id !== 'string') {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Metadata',
          expected: 'Lesson ID must be a non-empty string',
          actual: String(node.id)
        });
      } else {
        // Validate local uniqueness
        if (nodeIdsInGrade.has(node.id)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: node.id,
            validationType: 'ID Uniqueness',
            expected: 'Lesson ID must be unique within grade',
            actual: `Duplicate lesson ID '${node.id}'`
          });
        } else {
          nodeIdsInGrade.add(node.id);
        }

        // Validate global uniqueness if tracker set is supplied
        if (globalNodeIds) {
          if (globalNodeIds.has(node.id)) {
            errors.push({
              gradeId,
              themeId,
              lessonId: node.id,
              validationType: 'ID Uniqueness',
              expected: 'Lesson ID must be unique globally across all grades',
              actual: `Duplicate global lesson ID '${node.id}'`
            });
          } else {
            globalNodeIds.add(node.id);
          }
        }
      }

      // Title
      if (!node.title || typeof node.title !== 'string') {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Metadata',
          expected: 'Lesson title must be a non-empty string',
          actual: String(node.title)
        });
      }

      // Order
      if (typeof node.order !== 'number' || node.order < 1 || !Number.isInteger(node.order)) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Order Integrity',
          expected: 'Lesson order must be a unique positive integer within theme',
          actual: String(node.order)
        });
      } else if (nodeOrders.has(node.order)) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Order Integrity',
          expected: 'Lesson order must be unique within theme',
          actual: `Duplicate lesson order '${node.order}'`
        });
      } else {
        nodeOrders.add(node.order);
      }

      // Difficulty
      if (typeof node.difficulty !== 'number' || node.difficulty < 1 || !Number.isInteger(node.difficulty)) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Business Rules',
          expected: 'Lesson difficulty must be a positive integer',
          actual: String(node.difficulty)
        });
      }

      // Estimated minutes
      if (typeof node.estimated_minutes !== 'number' || node.estimated_minutes < 1 || !Number.isInteger(node.estimated_minutes)) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Business Rules',
          expected: 'Estimated minutes must be a positive integer',
          actual: String(node.estimated_minutes)
        });
      }

      // Prerequisites presence & type
      if (!Array.isArray(node.prerequisites)) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Structure',
          expected: 'Prerequisites must be an array of strings',
          actual: node.prerequisites ? typeof node.prerequisites : 'Missing prerequisites property'
        });
      } else {
        // Validate self-reference
        if (node.id && node.prerequisites.includes(node.id)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: node.id,
            validationType: 'Reference Check',
            expected: 'Lesson must not list itself as a prerequisite',
            actual: `Self-referencing prerequisite found in [${node.prerequisites.join(', ')}]`
          });
        }
      }

      // Activities validation
      if (!Array.isArray(node.activities)) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Structure',
          expected: 'Activities must be an array of activity configurations',
          actual: node.activities ? typeof node.activities : 'Missing activities property'
        });
      } else if (node.activities.length === 0) {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Business Rules',
          expected: 'Activities array must not be empty',
          actual: '0 activities'
        });
      } else {
        const activityTypes = new Set<string>();
        for (let a = 0; a < node.activities.length; a++) {
          const act = node.activities[a];
          const actIndexStr = `${nodeId} Activity ${a}`;
          if (!act || typeof act !== 'object') {
            errors.push({
              gradeId,
              themeId,
              lessonId: nodeId,
              validationType: 'Lesson Structure',
              expected: 'Activity config must be an object',
              actual: String(act)
            });
            continue;
          }

          if (!act.type || typeof act.type !== 'string') {
            errors.push({
              gradeId,
              themeId,
              lessonId: nodeId,
              validationType: 'Lesson Structure',
              expected: 'Activity type must be a non-empty string',
              actual: String(act.type)
            });
          } else if (activityTypes.has(act.type)) {
            errors.push({
              gradeId,
              themeId,
              lessonId: nodeId,
              validationType: 'Business Rules',
              expected: 'Activity types must be unique within a single node',
              actual: `Duplicate activity type '${act.type}'`
            });
          } else {
            activityTypes.add(act.type);
          }

          if (typeof act.difficulty !== 'number' || act.difficulty < 1 || !Number.isInteger(act.difficulty)) {
            errors.push({
              gradeId,
              themeId,
              lessonId: nodeId,
              validationType: 'Business Rules',
              expected: `Activity '${act.type || actIndexStr}' difficulty must be a positive integer`,
              actual: String(act.difficulty)
            });
          }

          if (typeof act.estimated_minutes !== 'number' || act.estimated_minutes < 1 || !Number.isInteger(act.estimated_minutes)) {
            errors.push({
              gradeId,
              themeId,
              lessonId: nodeId,
              validationType: 'Business Rules',
              expected: `Activity '${act.type || actIndexStr}' estimated_minutes must be a positive integer`,
              actual: String(act.estimated_minutes)
            });
          }

          if (typeof act.repeatable !== 'boolean') {
            errors.push({
              gradeId,
              themeId,
              lessonId: nodeId,
              validationType: 'Business Rules',
              expected: `Activity '${act.type || actIndexStr}' repeatable must be a boolean`,
              actual: String(act.repeatable)
            });
          }
        }
      }

      // Rewards validation
      if (!node.reward || typeof node.reward !== 'object') {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Structure',
          expected: 'Reward must be a valid object',
          actual: node.reward ? typeof node.reward : 'Missing reward property'
        });
      } else {
        const { xp, coins } = node.reward;
        if (typeof xp !== 'number' || xp < 0 || !Number.isInteger(xp)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Business Rules',
            expected: 'Reward xp must be a non-negative integer',
            actual: String(xp)
          });
        }
        if (typeof coins !== 'number' || coins < 0 || !Number.isInteger(coins)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Business Rules',
            expected: 'Reward coins must be a non-negative integer',
            actual: String(coins)
          });
        }
      }

      // Mastery validation
      if (!node.mastery || typeof node.mastery !== 'object') {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Structure',
          expected: 'Mastery must be a valid object',
          actual: node.mastery ? typeof node.mastery : 'Missing mastery property'
        });
      } else {
        const { required_score, attempts } = node.mastery;
        if (typeof required_score !== 'number' || required_score < 0 || required_score > 100) {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Business Rules',
            expected: 'Mastery required_score must be between 0 and 100',
            actual: String(required_score)
          });
        }
        if (typeof attempts !== 'number' || attempts < 1 || !Number.isInteger(attempts)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Business Rules',
            expected: 'Mastery attempts must be a positive integer >= 1',
            actual: String(attempts)
          });
        }
      }

      // Curriculum details validation
      if (!node.curriculum || typeof node.curriculum !== 'object') {
        errors.push({
          gradeId,
          themeId,
          lessonId: nodeId,
          validationType: 'Lesson Structure',
          expected: 'Curriculum details must be a valid object',
          actual: node.curriculum ? typeof node.curriculum : 'Missing curriculum property'
        });
      } else {
        const { subject, month, learning_outcome } = node.curriculum;
        
        if (!subject || typeof subject !== 'string') {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Lesson Structure',
            expected: 'Curriculum subject must be a non-empty string',
            actual: String(subject)
          });
        } else if (!ALLOWED_SUBJECTS.includes(subject as any)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Business Rules',
            expected: `Curriculum subject must be one of the allowed subjects: [${ALLOWED_SUBJECTS.join(', ')}]`,
            actual: `'${subject}'`
          });
        }

        if (!month || typeof month !== 'string') {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Lesson Structure',
            expected: 'Curriculum month must be a non-empty string',
            actual: String(month)
          });
        } else if (!ALLOWED_MONTHS.includes(month as any)) {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Business Rules',
            expected: `Curriculum month must be one of the allowed months: [${ALLOWED_MONTHS.join(', ')}]`,
            actual: `'${month}'`
          });
        }

        if (!learning_outcome || typeof learning_outcome !== 'string') {
          errors.push({
            gradeId,
            themeId,
            lessonId: nodeId,
            validationType: 'Lesson Structure',
            expected: 'Curriculum learning_outcome must be a non-empty string',
            actual: String(learning_outcome)
          });
        }
      }

      allNodes.push(node);
    }
  }

  // 4. Validate Relational References & Cross-Grade prerequisites
  for (const node of allNodes) {
    if (Array.isArray(node.prerequisites)) {
      for (const prereqId of node.prerequisites) {
        if (!nodeIdsInGrade.has(prereqId)) {
          errors.push({
            gradeId,
            themeId: 'N/A',
            lessonId: node.id,
            validationType: 'Reference Check',
            expected: 'Existing lesson ID within the same grade',
            actual: `'${prereqId}' (non-existent ID)`
          });
        }
      }
    }
  }

  // 5. Validate Dependency Cycle Check (Topological Sort / DAG)
  if (errors.length === 0) {
    const cycleErrors = validateDAGCycles(gradeId, allNodes);
    errors.push(...cycleErrors);
  }

  return errors;
}

/**
 * Validates that there are no circular dependency prerequisites.
 * Returns validation error details if cycles are detected.
 */
function validateDAGCycles(gradeId: string, nodes: CurriculumNode[]): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];
  const adjList = new Map<string, string[]>();
  const nodeMap = new Map<string, CurriculumNode>();

  for (const node of nodes) {
    adjList.set(node.id, [...(node.prerequisites || [])]);
    nodeMap.set(node.id, node);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  const dfs = (nodeId: string, path: string[]): boolean => {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, path)) return true;
      } else if (recStack.has(neighbor)) {
        path.push(neighbor); // Complete the cycle representation
        return true;
      }
    }

    recStack.delete(nodeId);
    path.pop();
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const path: string[] = [];
      if (dfs(node.id, path)) {
        // Trace cycle
        const cycleStartIndex = path.indexOf(path[path.length - 1]);
        const cyclePath = path.slice(cycleStartIndex).join(' -> ');
        errors.push({
          gradeId,
          themeId: 'N/A',
          lessonId: node.id,
          validationType: 'DAG Cycle Detection',
          expected: 'Prerequisites must form an acyclic dependency graph (no prerequisite loops)',
          actual: `Prerequisite dependency cycle detected: ${cyclePath}`
        });
        // Stop after first detected cycle per grade to avoid log noise
        break;
      }
    }
  }

  return errors;
}
