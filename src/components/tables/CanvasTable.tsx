import { DataType } from '@apache-arrow/ts';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { ListTable, VTable } from '@visactor/react-vtable';
import {
  ColumnDefine,
  ListTable as ListTableAPI,
  ListTableConstructorOptions,
  TYPES,
  themes,
} from '@visactor/vtable';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import dayjs from 'dayjs';
import type { ComponentProps } from 'react';

import { TableProps } from '@/components/tables/AgTable';
import { useTheme } from '@/hooks/theme-provider';
import { tableFontFamilyAtom } from '@/stores/setting';
import { isDarkTheme, isNumberType, uniqueArray } from '@/utils';
import { assign } from 'radash';

type ITableThemeDefine = ComponentProps<typeof ListTable>['theme'];

const LIGHT_THEME: ITableThemeDefine = {
  defaultStyle: {
    borderColor: '#f2f2f2',
    hover: {
      cellBgColor: '#9cbef4',
      inlineRowBgColor: '#9cbef4',
      inlineColumnBgColor: '#9cbef4',
    },
  },
  headerStyle: {},
  bodyStyle: {
    bgColor: getLightBackgroundColor,
    hover: {
      cellBgColor: '#CCE0FF',
      inlineRowBgColor: '#F3F8FF',
      inlineColumnBgColor: '#F3F8FF',
    },
  },
  frameStyle: {
    borderColor: '#d1d5da',
    shadowColor: 'rgba(00, 24, 47, 0.06)',
  },
};

const DARK_THEME: ITableThemeDefine = {
  underlayBackgroundColor: 'transparent',
  defaultStyle: {
    color: '#D3D5DA',
    bgColor: '#373b45',
    borderColor: '#444A54',
  },
  headerStyle: {
    bgColor: '#2e2f32',
  },
  bodyStyle: {
    bgColor: getDarkBackgroundColor,
  },
  frameStyle: {
    borderColor: '#d1d5da',
  },
};

// const lightTheme = merge([themes.ARCO, LIGHT_THEME]);
// const darkTheme = merge([themes.DARK, DARK_THEME]);

function getDarkBackgroundColor(args: TYPES.StylePropertyFunctionArg): string {
  const { row, table } = args;
  const index = row - table.frozenRowCount;

  if (!(index & 1)) {
    return '#2d3137';
  }
  return '#282a2e';
}

function getLightBackgroundColor(args: TYPES.StylePropertyFunctionArg): string {
  const { row, table } = args;
  const index = row - table.frozenRowCount;

  if (!(index & 1)) {
    return '#FFF';
  }
  return '#fbfbfc';
}

function useTableTheme(transpose?: boolean) {
  const appTheme = useTheme();
  const tableFontFamily = useAtomValue(tableFontFamilyAtom);

  const common: ITableThemeDefine = {
    defaultStyle: {
      fontSize: 12,
      fontFamily: 'Consolas',
      borderLineWidth: 1,
      fontWeight: 500,
      lineHeight: 12,
    },
    bodyStyle: {
      fontSize: 12,
      lineHeight: 12,
      padding: [8, 12, 6, 12],
      fontFamily: tableFontFamily,
      borderLineWidth: ({ row }) => {
        if (row == 0) {
          return [0, 1, 1, 1];
        }
        return [1, 1, 1, 1];
      },
    },
    headerStyle: {
      fontFamily: tableFontFamily,
      fontSize: 12,
      padding: [8, 12, 6, 12],
      borderLineWidth: ({ row, table }) => {
        // @ts-ignore
        const transpose = table.transpose;
        if (transpose && row == 0) {
          return [0, 0, 0, 1];
        }
        return transpose ? [1, 0, 1, 1] : [0, 1, 1, 1];
      },
    },
    frameStyle: {
      borderLineWidth: 0,
      borderLineDash: [],
      cornerRadius: 0,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
    scrollStyle: {
      width: 8,
      visible: 'always',
      scrollSliderCornerRadius: 0,
      hoverOn: false,
      barToSide: true,
    },
    selectionStyle: {
      cellBorderLineWidth: 1,
    },
  };

  const theme = useMemo(() => {
    const [baseTheme, colorTheme] = isDarkTheme(appTheme)
      ? [themes.DARK, DARK_THEME]
      : [themes.ARCO, LIGHT_THEME];
    return baseTheme.extends(assign(common, colorTheme as Object));
  }, [appTheme, transpose]);

  return theme;
}

export const CanvasTable = React.memo(function CanvasTable({
  data,
  schema,
  beautify,
  precision,
  transpose,
  cross,
  style,
  onSelectedCell,
}: TableProps) {
  const titleMap = new Map();

  const _titles =
    schema?.map(({ name, dataType, type }) => {
      const item = {
        key: name,
        name,
        type: type ?? dataType,
        dataType,
      };
      titleMap.set(name, item);
      return item;
    }) ?? [];

  if (_titles && _titles.length == 0) {
    return null;
  }

  const types = new Map(_titles.map(({ key, type }) => [key, type]));

  const [leftPinnedCols, setLeftPinnedCols] = useState<string[]>([]);
  const [rightPinnedCols, setRightPinnedCols] = useState<string[]>([]);

  const tableRef = useRef<ListTableAPI>();

  const pinnedSet = new Set([...leftPinnedCols, ...rightPinnedCols]);

  const __titles = [
    ...leftPinnedCols.map((key) => titleMap.get(key)),
    ..._titles.filter(({ key }) => !pinnedSet.has(key)),
    ...rightPinnedCols.map((key) => titleMap.get(key)),
  ];

  const __columns: ColumnDefine[] = __titles.map(
    ({ key, name, dataType }, _) => {
      return {
        field: name,
        fieldKey: key,
        title: name,
        dragHeader: true,
        sort: true,
        style: (arg) => {
          const style: Record<string, string> = {};
          if (isNumberType(dataType)) {
            style['textAlign'] = 'right';
          }
          if (arg.dataValue === null || arg.dataValue === undefined) {
            style['color'] = 'gray';
          }
          return style;
        },
        fieldFormat: (record) => {
          const value = record[key];
          if (value === null) {
            return '<null>';
          }

          if (DataType.isDate(dataType)) {
            return dayjs(value).format('YYYY-MM-DD');
          }
          if (DataType.isTimestamp(dataType)) {
            return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
          }

          if (beautify && DataType.isFloat(dataType) && precision) {
            try {
              return (value as number)?.toFixed(precision);
            } catch (error) {
              return value;
            }
          }
          return value;
        },
      } as ColumnDefine;
    },
  );

  useEffect(() => {
    const handleBodyClick = (_e: Event) => {
      tableRef.current?.stateManager.hideMenu();
    };

    document.addEventListener('click', handleBodyClick);
    document.addEventListener('dblclick', handleBodyClick);
    document.addEventListener('contextmenu', handleBodyClick);
    // document.addEventListener('mousedown', handleBodyClick);

    return () => {
      document.removeEventListener('click', handleBodyClick);
      document.removeEventListener('dblclick', handleBodyClick);
      document.removeEventListener('contextmenu', handleBodyClick);
      // document.removeEventListener('mousedown', handleBodyClick);
    };
  }, []);

  const handleMouseEnterCell: ComponentProps<
    typeof ListTable
  >['onMouseEnterCell'] = (args) => {
    const table = tableRef.current;
    if (!table) {
      return;
    }

    const { col, row } = args;
    const isShow = table.stateManager.menu.isShow;
    if (
      (!table.transpose && row === 0 && col !== 0 && !isShow) ||
      (table.transpose && col === 0 && row !== 0 && !isShow)
    ) {
      const rect = table.getVisibleCellRangeRelativeRect({
        col,
        row,
      });

      const name = table.getCellValue(col, row);
      const type = types.get(name);
      table.showTooltip(col, row, {
        content: `${name}: ${type}`,
        referencePosition: {
          rect,
          placement: VTable.TYPES.Placement.bottom,
        },
        className: 'defineTooltip',
        style: {
          arrowMark: false,
        },
      });
    }
  };
  const handleDropdownMenuClick: ComponentProps<
    typeof ListTable
  >['onDropdownMenuClick'] = async (e) => {
    const transpose = tableRef.current?.transpose;
    if ((!transpose && e.row == 0) || (transpose && e.col == 0)) {
      if (e.menuKey == 'copy-field') {
        await writeText((e?.field as string) ?? '');
      } else if (e.menuKey == 'pin-to-left') {
        setLeftPinnedCols((v) => uniqueArray([...v, e.field as string]));
        setRightPinnedCols((v) => v.filter((key) => key != e.field));
      } else if (e.menuKey == 'pin-to-right') {
        setRightPinnedCols((v) => uniqueArray([e.field as string, ...v]));
        setLeftPinnedCols((v) => v.filter((key) => key != e.field));
      } else if (e.menuKey == 'pin-to-clear') {
        setLeftPinnedCols([]);
        setRightPinnedCols([]);
      }
    } else {
      if (e.menuKey == 'copy') {
        await writeText((e?.field as string) ?? '');
      }
    }
    };
    const theme = useTableTheme(transpose);
    const appTheme = useTheme();

  const option: ListTableConstructorOptions = React.useMemo(
    () => ({
      records: data,
      limitMaxAutoWidth: 200,
      heightMode: 'standard',
      defaultRowHeight: 24,
      widthMode: 'autoWidth',
      showFrozenIcon: true,
      frozenColCount: 1 + leftPinnedCols.length,
      rightFrozenColCount: rightPinnedCols.length,
      theme,
      transpose,
      rowSeriesNumber: {
        title: '',
        width: 'auto',
        headerStyle: {},
        style: { color: '#96938f', fontSize: 10, textAlign: 'center' },
        dragOrder: false,
        disableColumnResize: true,
      },
      columns: [
        // {
        //   field: '__index__',
        //   title: '',
        //   dragHeader: false,
        //   disableSelect: true,
        //   // disableHover: true,
        //   disableHeaderHover: true,
        //   disableHeaderSelect: true,
        //   disableColumnResize: true,
        //   style: { color: '#96938f', fontSize: 10, textAlign: 'center' },
        //   fieldFormat: (_r, col, row) => {
        //     return transpose ? col : row;
        //   },
        // },
        ...__columns,
      ],
      menu: {
        contextMenuItems: (_field, row, col) => {
          if ((!transpose && row == 0) || (transpose && col == 0)) {
            return [
              {
                menuKey: 'copy-field',
                text: 'Copy Field Name',
              },
              {
                menuKey: 'pin-to-left',
                text: 'Pin to left',
              },
              {
                menuKey: 'pin-to-right',
                text: 'Pin to right',
              },
              {
                menuKey: 'pin-to-clear',
                text: 'Clear pinned',
              },
            ];
          }
          return [];
        },
      },
      hover: {
        highlightMode: 'cell',
      },
      select: {
        headerSelectMode: 'cell',
        highlightMode: cross ? 'cross' : 'row',
      },
      keyboardOptions: {
        moveEditCellOnArrowKeys: true,
        copySelected: true,
        pasteValueToCell: true,
      },
    }),
    [
      data,
      transpose,
      appTheme,
      leftPinnedCols,
      rightPinnedCols,
      beautify,
      cross,
    ],
  );

  console.log("cross:", cross);
  return (
    <div
      className="h-full select-text"
      style={style}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <ListTable
        ref={tableRef}
        onContextMenuCell={(arg) => {
          console.log('context', arg);
        }}
        onMouseDownCell={(arg) => {
          const table = tableRef.current;
          if (table) {
            const value = table.getCellRawValue(arg.col, arg.row);
            onSelectedCell?.(value);
          }
        }}
        onDropdownMenuClick={handleDropdownMenuClick}
        onMouseEnterCell={handleMouseEnterCell}
        option={option}
      />
    </div>
  );
});

export function SimpleTable({ data }: { data: unknown[] }) {
  const tableRef = useRef<ListTableAPI>();
  const theme = useTableTheme();

  const option: ListTableConstructorOptions = React.useMemo(
    () => ({
      records: data,
      limitMaxAutoWidth: 200,
      // heightMode: 'autoHeight',
      heightMode: 'standard',
      defaultRowHeight: 28,
      widthMode: 'autoWidth',
      showFrozenIcon: true,
      theme,
      columns: [
        {
          field: '__index__',
          title: '',
          dragHeader: false,
          disableSelect: true,
          // disableHover: true,
          disableHeaderHover: true,
          disableHeaderSelect: true,
          disableColumnResize: true,
          style: { color: '#96938f', fontSize: 10, textAlign: 'center' },
          fieldFormat: (_r, _col, row) => {
            return row;
          },
        },
        ...Object.keys(data[0] ?? {}).map((key) => {
          return {
            field: key,
            title: key,
            dragHeader: true,
            sort: true,
          } as ColumnDefine;
        }),
      ],
      hover: {
        highlightMode: 'row',
      },
      keyboardOptions: {
        moveEditCellOnArrowKeys: true,
        copySelected: true,
        pasteValueToCell: true,
      },
    }),
    [data],
  );

  return (
    <div className="h-full">
      <ListTable ref={tableRef} option={option} />
    </div>
  );
}
