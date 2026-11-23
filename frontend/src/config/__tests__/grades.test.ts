/**
 * The class picker must agree with the grade rule the baseline and the server
 * use (age group string → grade), for every class.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GRADE_OPTIONS, gradeForAge, gradeLabel } from '../grades';
import { gradeForAgeGroup } from '../../features/baseline/engine';

describe('class options', () => {
  it('each class round-trips through its age and its age-group label', () => {
    for (const g of GRADE_OPTIONS) {
      assert.equal(gradeForAge(g.age).id, g.id);
      // The server stores "<ages> years" (children.service determineAgeGroup).
      assert.equal(gradeForAgeGroup(`${g.ages} years`), g.id);
    }
  });

  it('ages are strictly increasing and every class has a distinct age', () => {
    for (let i = 1; i < GRADE_OPTIONS.length; i++) {
      assert.ok(GRADE_OPTIONS[i].age > GRADE_OPTIONS[i - 1].age);
    }
  });

  it('older profiles saved with age 6 read as the last class', () => {
    const last = GRADE_OPTIONS[GRADE_OPTIONS.length - 1];
    assert.equal(gradeForAge(last.age + 1).id, last.id);
    assert.equal(gradeLabel(3), 'Nursery (3–4 yrs)');
  });
});
