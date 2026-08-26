/**
 * Drop Zone View — PetalPath Drag & Drop Presentation
 * Drop target with visual states (default, hover, correct, incorrect).
 *
 * Redesign notes: the five states kept their meanings and their thresholds, but
 * their colours now come from the palette rather than a stray set of Tailwind
 * slate/emerald/amber hexes (spec §3). Each state also keeps a distinct border
 * *style* as well as a colour — solid once matched, dashed while empty — so a
 * child who cannot separate the greens from the greys can still tell a filled
 * zone from an open one (§30).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../../theme';
import { DropZone as DropZoneModel } from '../types';

export interface DropZoneProps {
  zone: DropZoneModel;
  placedDraggableId?: string;
  isHovered?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  isHighlighted?: boolean;
}

/**
 * Devanagari combining marks — matras, virama, anusvara. They stack onto the
 * preceding consonant instead of advancing the pen, so counting them as
 * characters makes "का" measure twice as wide as it draws. U+0950 (ॐ) is
 * excluded deliberately: it is a full glyph.
 */
function isCombining(code: number): boolean {
  return (
    (code >= 0x0900 && code <= 0x0903) ||
    (code >= 0x093a && code <= 0x094f) ||
    (code >= 0x0951 && code <= 0x0957) ||
    (code >= 0x0962 && code <= 0x0963) ||
    code === 0x200c ||
    code === 0x200d
  );
}

/**
 * Largest size at which `text` fits the zone. Mirrors `fitFontSize` in the
 * backend board builder; the two sit in separate packages with no shared module,
 * so the constants are repeated rather than imported — `0.62` is the rounded
 * face's average advance-to-size ratio and `1.2` its line height.
 *
 * Generated specs carry a precomputed `visualState.fontSize` and never reach
 * this. It is here for hand-authored specs and for the boards that predate that
 * field, which would otherwise still be drawn at a flat 72px.
 */
function fitSymbolSize(text: string, width: number, height: number): number {
  let len = 0;
  for (const ch of text) {
    if (!isCombining(ch.codePointAt(0) ?? 0)) len += 1;
  }
  const byWidth = (width - 24) / (Math.max(len, 1) * 0.62);
  const byHeight = (height - 24) / 1.2;
  return Math.max(18, Math.min(72, Math.round(Math.min(byWidth, byHeight))));
}

export const DropZoneView: React.FC<DropZoneProps> = ({
  zone,
  placedDraggableId,
  isHovered,
  isCorrect,
  isIncorrect,
  isHighlighted,
}) => {
  const rawSymbol = zone.visualState?.targetContent || zone.visualState?.labelText || '';
  const symbol = rawSymbol
    .replace(/Outline for\s*/i, '')
    .replace(/\s*Outline/i, '')
    .trim();

  const filled = Boolean(isCorrect || placedDraggableId);

  /*
   * An empty target now sits on the board's painted sky rather than on flat
   * white. `surfaceSecondary` (#FFFDFC) against that sky (#FFFDFC) is the same
   * colour, so the zone would have dissolved into the background; opaque white
   * plus a stronger dashed edge keeps it legible as "something goes here".
   */
  let borderColor = colors.textSecondary;
  let backgroundColor = colors.white;
  let symbolColor = colors.textSecondary;

  if (filled) {
    borderColor = colors.leafGreen;
    backgroundColor = colors.greenSoft;
    symbolColor = colors.leafGreen;
  } else if (isIncorrect) {
    borderColor = colors.error;
    backgroundColor = colors.errorLight;
    symbolColor = colors.error;
  } else if (isHovered) {
    borderColor = colors.blue;
    backgroundColor = colors.blueSoft;
    symbolColor = colors.blue;
  } else if (isHighlighted) {
    borderColor = colors.warning;
    backgroundColor = colors.warningLight;
    symbolColor = colors.warning;
  }

  return (
    <View
      style={[
        styles.zone,
        {
          position: 'absolute',
          left: zone.shape.position.x,
          top: zone.shape.position.y,
          width: zone.shape.dimensions.width,
          height: zone.shape.dimensions.height,
          borderColor,
          backgroundColor,
          /* Solid once something lives here, dashed while it is still an
             invitation — state without relying on colour (§30). */
          borderStyle: filled ? 'solid' : 'dashed',
          borderRadius:
            zone.shape.type === 'circle'
              ? zone.shape.dimensions.width / 2
              : radius.illustrationCard,
        },
      ]}
      accessibilityLabel={`Drop Zone: ${symbol || 'Target'}${placedDraggableId ? ', matched' : ''}`}
    >
      {symbol ? (
        <Text
          style={[
            styles.outlineSymbol,
            {
              color: symbolColor,
              opacity: filled ? 1 : 0.65,
              fontSize:
                zone.visualState?.fontSize ??
                fitSymbolSize(symbol, zone.shape.dimensions.width, zone.shape.dimensions.height),
            },
          ]}
          /* Two lines, matching `fitWrappedFontSize` in the board builder: a
             two-word label like "Not Helping" is sized on its longest word and
             wrapped, which reads at 45px instead of being crushed to 29px to fit
             on one line. Single words are unaffected. */
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {symbol}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  zone: {
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  outlineSymbol: {
    /* No fontSize here on purpose — it is computed per zone at the call site,
       either from the spec's own `visualState.fontSize` or by measuring. This was
       a flat 72, which fits "C" and overflows "Not Helping". The family and weight
       are still the app's rounded face (§6). */
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.black,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
