/**
 * Built-in pictures for the questionnaire, so the child sees a fruit, a car or
 * a red circle instead of a word while the item bank's artwork does not exist.
 * The pictures are Material Design Icons (open source, bundled with
 * @expo/vector-icons), each in its real-world colour. Which file name draws
 * which picture is decided in pictogramMap.ts; a file name with no match there
 * falls back to loading the real image from the CDN, so uploading artwork
 * under a new name is all it takes to replace a picture.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../../theme';
import { COLOURS, type Pic } from './pictogramMap';

export { pictogramFor, type Pic } from './pictogramMap';

const BALL_COLOURS = [COLOURS.red, COLOURS.blue, COLOURS.yellow, COLOURS.green, COLOURS.orange, COLOURS.purple];

/** A basket with `count` balls above it, for "which has more" questions. */
const Basket: React.FC<{ count: number; size: number }> = ({ count, size }) => {
  const perRow = count <= 4 ? 2 : 3;
  const ball = Math.floor((size * 0.8) / perRow) - 2;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={[styles.balls, { width: size * 0.9 }]}>
        {Array.from({ length: count }, (_, i) => (
          <MaterialCommunityIcons key={i} name="circle" size={ball} color={BALL_COLOURS[i % BALL_COLOURS.length]} />
        ))}
      </View>
      <MaterialCommunityIcons name="basket" size={Math.round(size * 0.5)} color="#B9803A" style={styles.basket} />
    </View>
  );
};

export const Pictogram: React.FC<{ pic: Pic; size: number }> = ({ pic, size }) => {
  const box = { width: size, height: size };
  switch (pic.kind) {
    case 'icon':
      return (
        <View style={[styles.center, box]} importantForAccessibility="no-hide-descendants">
          <MaterialCommunityIcons name={pic.icon} size={Math.round(size * 0.9 * pic.scale)} color={pic.colour} />
        </View>
      );
    case 'glyph': {
      // Numerals and letters fill the tile; a whole word gets smaller type.
      const font = pic.text.length > 2 ? size * 0.34 : size * 0.62;
      return (
        <View style={[styles.center, box]} importantForAccessibility="no-hide-descendants">
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[typography.presets.title, styles.glyph, { fontSize: Math.round(font), lineHeight: Math.round(font * 1.3) }]}
          >
            {pic.text}
          </Text>
        </View>
      );
    }
    case 'basket':
      return <Basket count={pic.count} size={size} />;
    case 'idk':
      return (
        <View style={[styles.center, box]} importantForAccessibility="no-hide-descendants">
          <Text
            allowFontScaling={false}
            style={[typography.presets.title, styles.idk, { fontSize: Math.round(size * 0.55), lineHeight: Math.round(size * 0.7) }]}
          >
            ?
          </Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glyph: { color: colors.purple, textAlign: 'center' },
  idk: { color: colors.textSecondary, textAlign: 'center' },
  balls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  /* Pulls the basket up so the balls sit in it. */
  basket: { marginTop: -8 },
});
