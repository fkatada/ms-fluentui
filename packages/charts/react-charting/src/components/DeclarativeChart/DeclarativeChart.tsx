/* eslint-disable @typescript-eslint/naming-convention */
import * as React from 'react';
import { useTheme } from '@fluentui/react';
import { IRefObject } from '@fluentui/react/lib/Utilities';
import { DonutChart } from '../DonutChart/index';
import { VerticalStackedBarChart } from '../VerticalStackedBarChart/index';
import { decodeBase64Fields } from '@fluentui/chart-utilities';
import type { Data, PlotData, PlotlySchema, OutputChartType } from '@fluentui/chart-utilities';
import {
  isArrayOrTypedArray,
  isDateArray,
  isNumberArray,
  isYearArray,
  mapFluentChart,
  sanitizeJson,
} from '@fluentui/chart-utilities';

import {
  isMonthArray,
  correctYearMonth,
  transformPlotlyJsonToDonutProps,
  transformPlotlyJsonToVSBCProps,
  transformPlotlyJsonToScatterChartProps,
  transformPlotlyJsonToHorizontalBarWithAxisProps,
  transformPlotlyJsonToHeatmapProps,
  transformPlotlyJsonToSankeyProps,
  transformPlotlyJsonToGaugeProps,
  transformPlotlyJsonToGVBCProps,
  transformPlotlyJsonToVBCProps,
  transformPlotlyJsonToChartTableProps,
  projectPolarToCartesian,
  isStringArray,
} from './PlotlySchemaAdapter';
import type { ColorwayType } from './PlotlyColorAdapter';
import { LineChart, ILineChartProps } from '../LineChart/index';
import { HorizontalBarChartWithAxis } from '../HorizontalBarChartWithAxis/index';
import { AreaChart, IAreaChartProps } from '../AreaChart/index';
import { HeatMapChart } from '../HeatMapChart/index';
import { SankeyChart } from '../SankeyChart/SankeyChart';
import { GaugeChart } from '../GaugeChart/index';
import { GroupedVerticalBarChart } from '../GroupedVerticalBarChart/index';
import { VerticalBarChart } from '../VerticalBarChart/index';
import { IChart, IImageExportOptions } from '../../types/index';
import { withResponsiveContainer } from '../ResponsiveContainer/withResponsiveContainer';
import { IScatterChartProps, ScatterChart } from '../ScatterChart/index';
import { ChartTable } from '../ChartTable/index';

const ResponsiveDonutChart = withResponsiveContainer(DonutChart);
const ResponsiveVerticalStackedBarChart = withResponsiveContainer(VerticalStackedBarChart);
const ResponsiveLineChart = withResponsiveContainer(LineChart);
const ResponsiveHorizontalBarChartWithAxis = withResponsiveContainer(HorizontalBarChartWithAxis);
const ResponsiveAreaChart = withResponsiveContainer(AreaChart);
const ResponsiveHeatMapChart = withResponsiveContainer(HeatMapChart);
const ResponsiveSankeyChart = withResponsiveContainer(SankeyChart);
const ResponsiveGaugeChart = withResponsiveContainer(GaugeChart);
const ResponsiveGroupedVerticalBarChart = withResponsiveContainer(GroupedVerticalBarChart);
const ResponsiveVerticalBarChart = withResponsiveContainer(VerticalBarChart);
const ResponsiveScatterChart = withResponsiveContainer(ScatterChart);
const ResponsiveChartTable = withResponsiveContainer(ChartTable);

/**
 * DeclarativeChart schema.
 * {@docCategory DeclarativeChart}
 */
export interface Schema {
  /**
   * Plotly schema represented as JSON object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plotlySchema: any;
}

/**
 * DeclarativeChart props.
 * {@docCategory DeclarativeChart}
 */
export interface DeclarativeChartProps extends React.RefAttributes<HTMLDivElement> {
  /**
   * The schema representing the chart data, layout and configuration
   */
  chartSchema: Schema;

  /**
   * Callback when an event occurs
   */
  onSchemaChange?: (eventData: Schema) => void;

  /**
   * Optional callback to access the IDeclarativeChart interface. Use this instead of ref for accessing
   * the public methods and properties of the component.
   */
  componentRef?: IRefObject<IDeclarativeChart>;

  /**
   * Optional prop to specify the colorway type of the chart.
   * - 'default': Use Fluent UI color palette aligning with plotly colorway.
   * - 'builtin': Use Fluent UI colorway.
   * - 'others': Reserved for future colorways.
   * @default 'default'
   */
  colorwayType?: ColorwayType;
}

/**
 * {@docCategory DeclarativeChart}
 */
export interface IDeclarativeChart {
  exportAsImage: (opts?: IImageExportOptions) => Promise<string>;
}

const useColorMapping = () => {
  const colorMap = React.useRef(new Map<string, string>());
  return colorMap;
};

/**
 * DeclarativeChart component.
 * {@docCategory DeclarativeChart}
 */
export const DeclarativeChart: React.FunctionComponent<DeclarativeChartProps> = React.forwardRef<
  HTMLDivElement,
  DeclarativeChartProps
>((props, forwardedRef) => {
  const { plotlySchema } = sanitizeJson(props.chartSchema);
  const chart: OutputChartType = mapFluentChart(plotlySchema);
  if (!chart.isValid) {
    throw new Error(`Invalid chart schema: ${chart.errorMessage}`);
  }
  let plotlyInput = plotlySchema as PlotlySchema;
  try {
    plotlyInput = decodeBase64Fields(plotlyInput);
  } catch (error) {
    throw new Error(`Failed to decode plotly schema: ${error}`);
  }
  const plotlyInputWithValidData: PlotlySchema = {
    ...plotlyInput,
    data: chart.validTracesInfo!.map(trace => plotlyInput.data[trace[0]]),
  };

  let { selectedLegends } = plotlySchema;
  const colorMap = useColorMapping();
  const theme = useTheme();
  const isDarkTheme = theme?.isInverted ?? false;
  const chartRef = React.useRef<IChart>(null);

  if (!isArrayOrTypedArray(selectedLegends)) {
    selectedLegends = [];
  }

  const [activeLegends, setActiveLegends] = React.useState<string[]>(selectedLegends);
  const onActiveLegendsChange = (keys: string[]) => {
    setActiveLegends(keys);
    if (props.onSchemaChange) {
      props.onSchemaChange({ plotlySchema: { plotlyInput, selectedLegends: keys } });
    }
  };

  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { plotlySchema } = sanitizeJson(props.chartSchema);
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { selectedLegends } = plotlySchema;
    setActiveLegends(selectedLegends ?? []);
  }, [props.chartSchema]);

  const multiSelectLegendProps = {
    canSelectMultipleLegends: true,
    onChange: onActiveLegendsChange,
    selectedLegends: activeLegends,
  };

  const commonProps = {
    legendProps: multiSelectLegendProps,
    componentRef: chartRef,
    calloutProps: { layerProps: { eventBubblingEnabled: true } },
  };

  const renderLineAreaScatter = (plotlyData: Data[], isAreaChart: boolean, isScatterChart: boolean): JSX.Element => {
    const isScatterMarkers = [
      'text+markers',
      'markers+text',
      'lines+markers',
      'markers+line',
      'text+lines+markers',
    ].includes((plotlyData[0] as PlotData)?.mode);
    const chartType = isAreaChart ? 'area' : isScatterChart ? 'scatter' : 'line';
    const chartProps: ILineChartProps | IAreaChartProps | IScatterChartProps = {
      ...transformPlotlyJsonToScatterChartProps(
        { data: plotlyData, layout: plotlyInput.layout },
        chartType,
        isScatterMarkers,
        colorMap,
        props.colorwayType,
        isDarkTheme,
      ),
      ...commonProps,
    };
    if (isAreaChart) {
      return <ResponsiveAreaChart {...chartProps} />;
    }
    if (isScatterChart) {
      return <ResponsiveScatterChart {...(chartProps as IScatterChartProps)} />;
    }
    return <ResponsiveLineChart {...chartProps} />;
  };

  const checkAndRenderChart = (isAreaChart: boolean = false) => {
    let fallbackVSBC = false;
    const xValues = (plotlyInputWithValidData.data[0] as PlotData).x;
    const isXDate = isDateArray(xValues);
    const isXNumber = isNumberArray(xValues);
    const isXMonth = isMonthArray(xValues);
    const isYString = isStringArray((plotlyInputWithValidData.data[0] as Partial<PlotData>).y);

    // Consider year as categorical variable not numeric continuous variable
    // Also year is not considered a date variable as it is represented as a point
    // in time and brings additional complexity of handling timezone and locale
    // formatting given the current design of the charting library
    const isXYear = isYearArray(xValues);
    const allModes = plotlyInputWithValidData.data.map((data: PlotData) => data.mode);
    const isScatterChart = allModes.every((mode: string) => mode === 'markers');
    // If x is date or number and y is not string, render as Line/Area Chart
    // If x is month, correct the year and render as Line/Area Chart
    if (((isXDate || isXNumber) && !isXYear && !isYString) || (isScatterChart && !isYString)) {
      return renderLineAreaScatter(plotlyInputWithValidData.data, isAreaChart, isScatterChart);
    } else if (isXMonth) {
      const updatedData = plotlyInputWithValidData.data.map((dataPoint: PlotData) => ({
        ...dataPoint,
        x: correctYearMonth(dataPoint.x),
      }));
      return renderLineAreaScatter(updatedData, isAreaChart, isScatterChart);
    }
    // Unsupported schema, render as VerticalStackedBarChart
    fallbackVSBC = true;
    if (isAreaChart) {
      throw new Error('Fallback to VerticalStackedBarChart is not allowed for Area Charts.');
    }
    return (
      <ResponsiveVerticalStackedBarChart
        {...transformPlotlyJsonToVSBCProps(
          plotlyInputWithValidData,
          colorMap,
          props.colorwayType,
          isDarkTheme,
          fallbackVSBC,
        )}
        {...commonProps}
      />
    );
  };

  const exportAsImage = React.useCallback(
    (opts?: IImageExportOptions): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!chartRef.current || typeof chartRef.current.toImage !== 'function') {
          return reject(Error('Chart cannot be exported as image'));
        }

        chartRef.current
          .toImage({
            background: theme.semanticColors.bodyBackground,
            scale: 5,
            ...opts,
          })
          .then(resolve)
          .catch(reject);
      });
    },
    [theme],
  );

  React.useImperativeHandle(
    props.componentRef,
    () => ({
      exportAsImage,
    }),
    [exportAsImage],
  );

  switch (chart.type) {
    case 'donut':
      return (
        <ResponsiveDonutChart
          {...transformPlotlyJsonToDonutProps(plotlyInputWithValidData, colorMap, props.colorwayType, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'horizontalbar':
      return (
        <ResponsiveHorizontalBarChartWithAxis
          {...transformPlotlyJsonToHorizontalBarWithAxisProps(
            plotlyInputWithValidData,
            colorMap,
            props.colorwayType,
            isDarkTheme,
          )}
          {...commonProps}
        />
      );
    case 'groupedverticalbar':
      return (
        <ResponsiveGroupedVerticalBarChart
          {...transformPlotlyJsonToGVBCProps(plotlyInputWithValidData, colorMap, props.colorwayType, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'verticalstackedbar':
      return (
        <ResponsiveVerticalStackedBarChart
          {...transformPlotlyJsonToVSBCProps(plotlyInputWithValidData, colorMap, props.colorwayType, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'heatmap':
      return (
        <ResponsiveHeatMapChart
          {...transformPlotlyJsonToHeatmapProps(plotlyInputWithValidData)}
          {...commonProps}
          legendProps={{}}
        />
      );
    case 'sankey':
      return (
        <ResponsiveSankeyChart
          {...transformPlotlyJsonToSankeyProps(plotlyInputWithValidData, colorMap, props.colorwayType, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'gauge':
      return (
        <ResponsiveGaugeChart
          {...transformPlotlyJsonToGaugeProps(plotlyInputWithValidData, colorMap, props.colorwayType, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'verticalbar':
      return (
        <ResponsiveVerticalBarChart
          {...transformPlotlyJsonToVBCProps(plotlyInputWithValidData, colorMap, props.colorwayType, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'table':
      return (
        <ResponsiveChartTable
          {...transformPlotlyJsonToChartTableProps(plotlyInputWithValidData, colorMap, isDarkTheme)}
          {...commonProps}
        />
      );
    case 'area':
    case 'line':
    case 'fallback':
    case 'scatterpolar':
    case 'scatter':
      if (chart.type === 'scatterpolar') {
        const cartesianProjection = projectPolarToCartesian(plotlyInputWithValidData);
        plotlyInputWithValidData.data = cartesianProjection.data;
      }
      // Need recheck for area chart as we don't have ability to check for valid months in previous step
      const isAreaChart = plotlyInputWithValidData.data.some(
        (series: PlotData) => series.fill === 'tonexty' || series.fill === 'tozeroy' || !!series.stackgroup,
      );
      return checkAndRenderChart(isAreaChart);
    default:
      throw new Error(`Unsupported chart type :${plotlyInputWithValidData.data[0]?.type}`);
  }
});
DeclarativeChart.displayName = 'DeclarativeChart';
DeclarativeChart.defaultProps = {
  colorwayType: 'default',
};
