import CodeIcon from '@mui/icons-material/Code';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, BoxProps, Divider, ListItemText } from '@mui/material';
import { styled } from '@mui/material/styles';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/primitives';
import { useEffect, useState } from 'react';

import { ContextMenu, ContextMenuItem } from '@/components/ContextMenu';
import DBConfig, { useDBConfigStore } from '@/components/DBConfig';
import FileTreeView from '@/components/sidebar/FileTree';
import { SideToolbar } from '@/components/sidebar/SideToolbar';
import { FileNode, useDBStore } from '@/stores/db';
import { DTableType } from '@/stores/store';
import { useTabsStore } from '@/stores/tabs';

const TreeViewWrapper = styled(Box)<BoxProps>(() => ({
  width: '100%',
  maxHeight: 'calc(100vh - 64px)',
  height: 'calc(100vh - 64px)',
  overflow: 'auto',
  pr: 1,
  pb: 2,
}));

function SidebarTree() {
  const [selectedTable, setSelectedTable] = useState<DTableType | null>(null);
  const dbList = useDBStore((state) => state.dbList);
  const appendDB = useDBStore((state) => state.append);
  const contextMenu = useDBStore((state) => state.contextMenu);
  const setContextMenu = useDBStore((state) => state.setContextMenu);
  const updateTab = useTabsStore((state) => state.update);
  const removeDB = useDBStore((state) => state.remove);
  const onOpen = useDBConfigStore((state) => state.onOpen);

  async function openDirectory(name?: string) {
    const fileTree: FileNode = await invoke('get_folder_tree', { name });
    if (fileTree) {
      appendDB({
        data: fileTree,
      });
    }
  }
  async function openUrl() {
    const path: string = await invoke('opened_urls');
    console.log(path);
  }

  useEffect(() => {
    openUrl();
    const unlisten = listen('open-directory', (e) => {
      console.log(e.payload);

      openDirectory(e.payload as string);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleClose = () => {
    setContextMenu(null);
  };

  return (
    <>
      <SideToolbar selectedTable={selectedTable} />
      <TreeViewWrapper>
        {dbList.map((db, i) => (
          <FileTreeView
            key={i}
            rootKey={i}
            db={db}
            selected={
              selectedTable?.rootKey == i ? selectedTable.tableName : null
            }
            onSelectTable={setSelectedTable}
          />
        ))}
      </TreeViewWrapper>

      {/* ---------- modal/dialog ---------- */}

      {/* db context menu */}
      <ContextMenu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <ContextMenuItem
          onClick={() => {
            onOpen();
            handleClose();
          }}
          icon={<SettingsIcon />}
        >
          <ListItemText>Properties</ListItemText>
        </ContextMenuItem>
        <ContextMenuItem
          icon={<CodeIcon />}
          onClick={() => {
            if (contextMenu?.context) {
              updateTab!(contextMenu?.context);
            }
            handleClose();
          }}
        >
          Query Editor
        </ContextMenuItem>
        <Divider />
        <ContextMenuItem
          icon={<DeleteIcon />}
          onClick={() => {
            if (contextMenu?.context?.root) {
              removeDB(contextMenu?.context?.root);
            }
            handleClose();
          }}
        >
          <ListItemText>Remove Data Source...</ListItemText>
        </ContextMenuItem>
      </ContextMenu>

      {/* db config */}
      <DBConfig />
    </>
  );
}

export default SidebarTree;