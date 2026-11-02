/**
 * The item bank is content, edited by hand: these checks catch a grade left
 * without questions (the child would land straight on "All done") or a
 * picture the app cannot draw (the child would see a word instead).
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import bankJson from '../assessment_items.json';
import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
import { childDomains, makeAnswer, nextChildItem, nextDifficulty, parentItems } from '../engine';
import { OBJECTS, pictogramFor } from '../pictogramMap';
import { IDK, type Answer, type BaselineGrade, type ItemBank } from '../types';

const bank = bankJson as unknown as ItemBank;
const GRADES: BaselineGrade[] = ['prenursery', 'nursery', 'lkg', 'ukg'];

describe('item bank', () => {
  for (const grade of GRADES) {
    it(`${grade} has child questions in English, Maths and Thinking, and parent questions`, () => {
      assert.deepEqual(childDomains(bank, grade), ['english', 'maths', 'cognitive']);
      assert.ok(parentItems(bank, grade).length >= 3);
      assert.ok(nextChildItem(bank, grade, []), 'a first question to ask');
    });
  }

  for (const grade of GRADES) {
    it(`${grade} has 3 child questions at every difficulty in every subject`, () => {
      for (const domain of childDomains(bank, grade)) {
        for (const level of [1, 2, 3]) {
          const n = bank.items.filter(
            (i) => i.grade === grade && i.domain === domain && i.difficulty === level && i.type !== 'parent_observed',
          ).length;
          assert.equal(n, 3, `${grade} ${domain} level ${level}`);
        }
      }
    });

    it(`${grade}: every right/wrong path gets a question at exactly the level it earned`, () => {
      // 4 answers per subject → 16 right/wrong patterns, applied to every subject.
      for (let mask = 0; mask < 16; mask++) {
        const answers: Answer[] = [];
        const step = new Map<string, number>();
        for (let item = nextChildItem(bank, grade, answers); item; item = nextChildItem(bank, grade, answers)) {
          const sofar = answers.filter((a) => a.domain === item!.domain);
          assert.equal(item.difficulty, nextDifficulty(sofar), `${grade} ${item.id} pattern ${mask}`);
          const k = step.get(item.domain) ?? 0;
          step.set(item.domain, k + 1);
          answers.push(makeAnswer(bank, item, (mask >> k) & 1 ? item.correct_option : IDK));
        }
      }
    });
  }

  it('every object icon exists in Material Design Icons', () => {
    const map = glyphs as Record<string, number>;
    for (const [name, { icon }] of Object.entries(OBJECTS)) assert.ok(map[icon] !== undefined, `${name} → ${icon}`);
  });

  it('ids are unique', () => {
    const ids = bank.items.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every child question has its correct answer among the options', () => {
    for (const item of bank.items.filter((i) => i.type !== 'parent_observed')) {
      assert.ok(item.options.some((o) => o.id === item.correct_option), item.id);
      assert.equal(new Set(item.options.map((o) => o.id)).size, item.options.length, `${item.id} duplicate option`);
    }
  });

  it('every picture is one the app can draw', () => {
    const paths = [
      bank.common.idk_image,
      ...bank.items.flatMap((i) => [...i.images, ...i.options.map((o) => o.image)]),
    ].filter((p): p is string => !!p);
    const missing = paths.filter((p) => !pictogramFor(p));
    assert.deepEqual([...new Set(missing)], []);
  });
});

describe('pictogramFor', () => {
  it('draws objects, sizes, shapes, numerals, letters, words and baskets', () => {
    assert.deepEqual(pictogramFor('x/apple.png'), { kind: 'icon', icon: 'food-apple', colour: '#E5484D', scale: 1 });
    assert.equal((pictogramFor('x/small_ball.png') as { scale: number }).scale < 1, true);
    assert.equal((pictogramFor('x/blue_square.png') as { icon: string }).icon, 'square');
    assert.deepEqual(pictogramFor('x/num_7.png'), { kind: 'glyph', text: '7' });
    assert.deepEqual(pictogramFor('x/letter_b.png'), { kind: 'glyph', text: 'b' });
    assert.deepEqual(pictogramFor('x/word_sun.png'), { kind: 'glyph', text: 'sun' });
    assert.deepEqual(pictogramFor('x/basket_6_balls.png'), { kind: 'basket', count: 6 });
  });

  it('leaves unknown names to the CDN image', () => {
    assert.equal(pictogramFor('x/my_new_artwork.png'), null);
    assert.equal(pictogramFor(null), null);
  });
});
