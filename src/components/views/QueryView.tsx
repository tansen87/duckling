import { IconButton } from '@mui/material';
import { IconDecimal } from '@tabler/icons-react';
import * as dialog from '@tauri-apps/plugin-dialog';
import { PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { focusAtom } from 'jotai-optics';
import {
  ArrowDownToLineIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { TablerSvgIcon } from '@/components/MuiIconButton';
import { PaginationDropdown } from '@/components/PaginationDropdown';
import { Stack, ToolbarContainer } from '@/components/Toolbar';
import { AgTable } from '@/components/tables/AgTable';
import { CanvasTable } from '@/components/tables/CanvasTable';
import { Separator } from '@/components/ui/separator';
import { Loading } from '@/components/views/TableView';
import { atomStore } from '@/stores';
import { precisionAtom, tableRenderAtom } from '@/stores/setting';
import { QueryContextType, execute, exportData } from '@/stores/tabs';

export function QueryView({
  context,
}: {
  context: PrimitiveAtom<QueryContextType>;
}) {
  const [ctx, setContext] = useAtom(context);
  const [loading, setLoading] = useState(false);

  const handleQuery = async (ctx?: QueryContextType) => {
    try {
      setLoading(true);
      if (!ctx) {
        ctx = atomStore.get(context);
      }
      const res = (await execute(ctx)) ?? {};
      setContext((prev) => ({ ...prev, ...res }));
    } catch (error) {
      console.error(error);
      toast.warning((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const handleExport = async (file: string) => {
    try {
      const ctx = atomStore.get(context);
      await exportData({ file }, ctx);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    (async () => {
      await handleQuery(ctx);
    })();
  }, []);
  const precision = useAtomValue(precisionAtom);
  const tableRender = useAtomValue(tableRenderAtom);

  const TableComponent = tableRender === 'canvas' ? CanvasTable : AgTable;
  return (
    <div className="h-full flex flex-col">
      <PageSizeToolbar
        query={handleQuery}
        exportData={handleExport}
        ctx={context}
      />
      <div className="h-full flex-1">
        <Suspense fallback={<Loading />}>
          {loading ? <Loading /> : null}
          <TableComponent
            style={loading ? { display: 'none' } : undefined}
            data={ctx.data ?? []}
            schema={ctx.schema ?? []}
            orderBy={ctx.orderBy}
            precision={precision}
            beautify={ctx.beautify}
          />
        </Suspense>
      </div>
    </div>
  );
}

interface PageSizeToolbarProps {
  query: (ctx?: QueryContextType) => Promise<void>;
  exportData: (file: string) => Promise<void>;
  ctx: PrimitiveAtom<QueryContextType>;
}

function PageSizeToolbar({ query, ctx, exportData }: PageSizeToolbarProps) {
  const context = useAtomValue(ctx);

  const { page, perPage, totalCount, data } = context;

  const pageAtom = focusAtom(ctx, (o) => o.prop('page'));
  const perPageAtom = focusAtom(ctx, (o) => o.prop('perPage'));
  const beautifyAtom = focusAtom(ctx, (o) => o.prop('beautify'));
  const setPage = useSetAtom(pageAtom);
  const setPerPage = useSetAtom(perPageAtom);
  const setBeautify = useSetAtom(beautifyAtom);

  const handleBeautify = () => {
    setBeautify((prev) => !prev);
  };
  const handleRefresh = async () => {
    await query(context);
  };

  const toFirst = async () => {
    setPage(1);
    await query();
  };
  const toLast = async () => {
    setPage(Math.ceil(context.totalCount / context.perPage));
    await query();
  };

  const increase = async () => {
    setPage((prev) => prev + 1);
    await query();
  };

  const decrease = async () => {
    setPage((prev) => prev - 1);
    await query();
  };

  const handlePerPage = async (perPage: number) => {
    setPerPage(perPage);
    await query();
  };

  const count = data?.length ?? 0;
  const start = perPage * (page - 1) + 1;
  const end = start + count - 1;
  const content = count >= totalCount ? `${count} rows` : `${start}-${end}`;
  const handleExport = async () => {
    const file = await dialog.save({
      title: 'Export',
      defaultPath: `xxx-${new Date().getTime()}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (file) {
      exportData(file);
    }
  };
  return (
    <ToolbarContainer>
      <Stack>
        <IconButton color="inherit" onClick={toFirst} disabled={page <= 1}>
          <ChevronsLeftIcon size={16} />
        </IconButton>
        <IconButton color="inherit" onClick={decrease} disabled={page <= 1}>
          <ChevronLeftIcon size={16} />
        </IconButton>
        <PaginationDropdown content={content} setPerPage={handlePerPage} />
        {count < totalCount ? `of ${totalCount}` : null}
        <IconButton
          color="inherit"
          onClick={increase}
          disabled={page >= Math.ceil(totalCount / perPage)}
        >
          <ChevronRightIcon size={16} />
        </IconButton>
        <IconButton
          color="inherit"
          onClick={toLast}
          disabled={page >= Math.ceil(totalCount / perPage)}
        >
          <ChevronsRightIcon size={16} />
        </IconButton>
        <IconButton color="inherit" onClick={handleBeautify}>
          <TablerSvgIcon icon={<IconDecimal />} />
        </IconButton>
        <Separator orientation="vertical" />
        <IconButton color="inherit" onClick={handleRefresh}>
          <RefreshCwIcon size={16} />
        </IconButton>
      </Stack>
      <IconButton color="inherit" onClick={handleExport}>
        <ArrowDownToLineIcon size={16} />
      </IconButton>
    </ToolbarContainer>
  );
}

export default QueryView;