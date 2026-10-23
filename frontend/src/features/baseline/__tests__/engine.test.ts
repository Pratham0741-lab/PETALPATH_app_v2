/**
 * Baseline scoring and adaptive logic.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import bankJson from '../assessment_items.json';
import {
  buildBaseline,
  childDomains,
  makeAnswer,
  nextChildItem,
  nextParentItem,
  scoreChildDomain,
  scoreDomains,
  skippedBaseline,
  strengthsAndFocus,
  gradeForAgeGroup,
} from '../engine';
import { IDK, type Answer, type AssessmentItem, type ItemBank } from '../types';

const bank = bankJson as unknown as ItemBank;
const GRADE = 'nursery' as const;

type Policy = (item: AssessmentItem) => string;
const ALWAYS_RIGHT: Policy = (i) => i.correct_option;
const ALWAYS_WRONG: Policy = (i) => (i.options.find((o) => o.id !== i.correct_option) ?? { id: 'x' }).id;
const ALWAYS_IDK: Policy = () => IDK;
const PARENT_YES: Policy = () => 'yes';
const PARENT_NOT_YET: Policy = () => 'not_yet';

/** Plays the whole questionnaire with the given answer policies. */
function play(child: Policy, parent: Policy = PARENT_YES, b: ItemBank = bank): Answer[] {
  const answers: Answer[] = [];
  for (let item = nextChildItem(b, GRADE, answers); item; item = nextChildItem(b, GRADE, answers)) {
    answers.push(makeAnswer(b, item, child(item)));
  }
  for (let item = nextParentItem(b, GRADE, answers); item; item = nextParentItem(b, GRADE, answers)) {
    answers.push(makeAnswer(b, item, parent(item)));
  }
  return answers;
}

const ans = (domain: Answer['domain'], difficulty: 1 | 2 | 3, credit: number, parent = false): Answer => ({
  itemId: `${domain}-${difficulty}-${Math.random()}`,
  domain,
  difficulty,
  response: credit ? 'a' : 'b',
  credit,
  parent,
});

describe('item bank', () => {
  it('has the Nursery sample items the spec asks for', () => {
    const n = bank.items.filter((i) => i.grade === GRADE);
    for (const d of ['english', 'maths', 'cognitive'] as const) {
      assert.equal(n.filter((i) => i.domain === d && i.type !== 'parent_observed').length, 3, d);
    }
    for (const d of ['fine_motor', 'sel', 'life_skills'] as const) {
      assert.equal(n.filter((i) => i.domain === d && i.type === 'parent_observed').length, 2, d);
    }
    for (const i of n) {
      assert.ok([1, 2, 3].includes(i.difficulty), i.id);
      if (i.type !== 'parent_observed') assert.ok(i.options.some((o) => o.id === i.correct_option), i.id);
    }
  });
});

describe('adaptive flow', () => {
  it('starts each domain at difficulty 2', () => {
    const first = nextChildItem(bank, GRADE, [])!;
    assert.equal(first.difficulty, 2);
    assert.equal(first.domain, 'english');
  });

  it('moves up after a correct answer and down after a miss', () => {
    const first = nextChildItem(bank, GRADE, [])!;
    const up = nextChildItem(bank, GRADE, [makeAnswer(bank, first, first.correct_option)])!;
    assert.equal(up.difficulty, 3);
    const down = nextChildItem(bank, GRADE, [makeAnswer(bank, first, IDK)])!;
    assert.equal(down.difficulty, 1);
  });

  it('asks 2-3 items per domain and 10-14 in total', () => {
    for (const policy of [ALWAYS_RIGHT, ALWAYS_WRONG, ALWAYS_IDK]) {
      const answers = play(policy);
      assert.ok(answers.length >= 10 && answers.length <= 14, `total ${answers.length}`);
      for (const d of childDomains(bank, GRADE)) {
        const n = answers.filter((a) => a.domain === d).length;
        assert.ok(n >= 2 && n <= 3, `${d}: ${n}`);
      }
    }
  });

  it('resumes from the saved answers: the next item is a function of them', () => {
    const answers = play(ALWAYS_RIGHT).slice(0, 4);
    const a = nextChildItem(bank, GRADE, answers);
    const b = nextChildItem(bank, GRADE, JSON.parse(JSON.stringify(answers)));
    assert.equal(a?.id, b?.id);
  });
});

describe('scoring', () => {
  it('all correct → Secure everywhere, high confidence where 3 items were asked', () => {
    const domains = scoreDomains(play(ALWAYS_RIGHT, PARENT_YES));
    for (const d of ['english', 'maths', 'fine_motor', 'sel', 'life_skills'] as const) {
      assert.equal(domains[d]?.level, 3, d);
    }
    assert.equal(domains.english?.confidence, 'high');
  });

  it('all wrong → Not yet, and the domain stops early', () => {
    const answers = play(ALWAYS_WRONG, PARENT_NOT_YET);
    const domains = scoreDomains(answers);
    for (const d of childDomains(bank, GRADE)) {
      assert.equal(domains[d]?.level, 0, d);
      assert.equal(answers.filter((a) => a.domain === d).length, 2, `${d} stopped after two misses`);
    }
    assert.equal(domains.sel?.level, 0);
  });

  it('all "I don\'t know" scores exactly like all wrong', () => {
    assert.deepEqual(scoreDomains(play(ALWAYS_IDK, PARENT_NOT_YET)), scoreDomains(play(ALWAYS_WRONG, PARENT_NOT_YET)));
  });

  it('mixed: right at 2, missed at 3, right at 2 → Developing', () => {
    assert.deepEqual(scoreChildDomain([ans('english', 2, 1), ans('english', 3, 0), ans('english', 2, 1)]), {
      level: 2,
      confidence: 'high',
    });
  });

  it('inconsistent answers lower the level and the confidence', () => {
    // Missed the easy one, got the hard one: likely a guess.
    assert.deepEqual(scoreChildDomain([ans('maths', 2, 0), ans('maths', 1, 0), ans('maths', 3, 1)]), {
      level: 2,
      confidence: 'low',
    });
  });

  it('two items are never high confidence', () => {
    assert.equal(scoreChildDomain([ans('maths', 2, 1), ans('maths', 3, 1)]).confidence, 'low');
  });

  it('early stop after two consecutive misses ending at the lowest difficulty', () => {
    // A bank with several easy items, to show the stop is the rule and not
    // just running out of items.
    const easy: ItemBank = {
      ...bank,
      items: [1, 1, 1, 2, 3].map((difficulty, i) => ({
        ...bank.items[0],
        id: `e${i}`,
        difficulty: difficulty as 1 | 2 | 3,
      })),
    };
    const answers: Answer[] = [];
    for (let item = nextChildItem(easy, GRADE, answers); item; item = nextChildItem(easy, GRADE, answers)) {
      answers.push(makeAnswer(easy, item, IDK));
    }
    assert.equal(answers.length, 2);
    assert.deepEqual(answers.map((a) => a.difficulty), [2, 1]);
  });

  it('parent observations: yes / sometimes / not yet', () => {
    const p = (credit: number) => ans('sel', 2, credit, true);
    assert.equal(scoreDomains([p(1), p(1)]).sel?.level, 3);
    assert.equal(scoreDomains([p(1), p(0.5)]).sel?.level, 2);
    assert.equal(scoreDomains([p(0.5), p(0)]).sel?.level, 1);
    assert.equal(scoreDomains([p(0), p(0)]).sel?.level, 0);
    assert.equal(scoreDomains([p(1), p(0.5)]).sel?.confidence, 'low');
    assert.equal(scoreDomains([p(1), p(1)]).sel?.confidence, 'high');
  });
});

describe('strengths and focus areas', () => {
  const r = (level: 0 | 1 | 2 | 3, confidence: 'high' | 'low' = 'high') => ({ level, confidence });

  it('highest are strengths, lowest are focus areas', () => {
    const out = strengthsAndFocus({ english: r(3), maths: r(1), sel: r(2) });
    assert.deepEqual(out, { strengths: ['english'], focus_areas: ['maths'] });
  });

  it('ties: all tied domains, high confidence first, capped at 3', () => {
    const out = strengthsAndFocus({
      english: r(3, 'low'),
      maths: r(3),
      cognitive: r(3),
      sel: r(3),
      hindi: r(0),
    });
    assert.deepEqual(out.strengths, ['maths', 'cognitive', 'sel']);
    assert.deepEqual(out.focus_areas, ['hindi']);
  });

  it('everything at the same level is never both a strength and a focus area', () => {
    assert.deepEqual(strengthsAndFocus({ english: r(2), maths: r(2) }), { strengths: ['english', 'maths'], focus_areas: [] });
    assert.deepEqual(strengthsAndFocus({ english: r(0), maths: r(0) }), { strengths: [], focus_areas: ['english', 'maths'] });
  });

  it('domains with no data are left out', () => {
    const out = strengthsAndFocus({ english: r(3), maths: r(0) });
    assert.ok(!out.strengths.includes('hindi') && !out.focus_areas.includes('hindi'));
    assert.deepEqual(strengthsAndFocus({}), { strengths: [], focus_areas: [] });
  });
});

describe('baseline record', () => {
  it('has the spec shape and no personal data', () => {
    const b = buildBaseline('child-1', GRADE, play(ALWAYS_RIGHT), new Date('2026-10-23T10:00:00Z'));
    assert.deepEqual(Object.keys(b).sort(), ['assessed_at', 'child_id', 'domains', 'focus_areas', 'grade', 'skipped', 'strengths']);
    assert.equal(b.skipped, false);
    assert.equal(b.assessed_at, '2026-10-23T10:00:00.000Z');
  });

  it('a skipped questionnaire has no results (default starting point)', () => {
    const b = skippedBaseline('child-1', GRADE, new Date());
    assert.deepEqual({ ...b, assessed_at: '' }, {
      child_id: 'child-1',
      assessed_at: '',
      grade: GRADE,
      domains: {},
      strengths: [],
      focus_areas: [],
      skipped: true,
    });
  });

  it('grade follows the backend rule', () => {
    assert.equal(gradeForAgeGroup('2-3'), 'prenursery');
    assert.equal(gradeForAgeGroup('3-4'), 'nursery');
    assert.equal(gradeForAgeGroup('4-5'), 'lkg');
    assert.equal(gradeForAgeGroup('5-6'), 'ukg');
  });
});
