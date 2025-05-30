import { IArcProps, IArcStyles } from './Arc.types';
import { DefaultPalette, ITheme, HighContrastSelector } from '@fluentui/react/lib/Styling';
export const getStyles = (props: IArcProps, theme: ITheme | undefined): IArcStyles => {
  const { color } = props;
  return {
    arcRoot: { fill: color },
    arcRootFocussed: { fill: color, stroke: theme?.palette.black || DefaultPalette.black, strokeWidth: 2 },
    arc: { outline: 'none' },
    arcText: {
      fill: theme?.semanticColors.bodyText || DefaultPalette.black,
      outline: 'none',
      selectors: {
        [HighContrastSelector]: {
          fill: 'CanvasText',
        },
      },
    },
  };
};
