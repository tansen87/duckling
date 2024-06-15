import {
  Code2,
  DatabaseIcon,
  FolderHeart,
  HelpCircleIcon,
  HistoryIcon,
  LucideIcon,
} from 'lucide-react';

import ToggleColorMode from '@/components/ToggleColorMode';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils.ts';
import { open } from '@tauri-apps/plugin-shell';
import { atom } from 'jotai';
import { useAtom } from 'jotai/react';
import AppSettingDialog from '../settings/AppSetting';

export const activeSideAtom = atom('database');

interface SideButtonProps {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

const SideButton = ({ id, icon: Comp, label, onClick }: SideButtonProps) => {
  const [activeSide, setActiveSide] = useAtom(activeSideAtom);
  const handleClick = () => {
    setActiveSide(id);
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-8 rounded-lg',
              activeSide == id ? 'bg-muted' : '',
            )}
            aria-label={label}
            onClick={onClick ?? handleClick}
          >
            <Comp className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={5}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ASide() {
  return (
    <aside className="inset-y absolute left-0 z-20 flex h-full flex-col border-r w-9">
      <nav className="grid gap-0.5 p-0.5 [&>*]:place-self-center">
        <SideButton id="database" label="Database" icon={DatabaseIcon} />
        <SideButton id="favorite" label="Favorite" icon={FolderHeart} />
        <SideButton id="code" label="Code" icon={Code2} />
        <SideButton id="history" label="History" icon={HistoryIcon} />
      </nav>
      <nav className="mt-auto grid gap-1 p-0 [&>*]:place-self-center">
        <SideButton
          id="help"
          label="Help"
          icon={HelpCircleIcon}
          onClick={() => {
            open('https://github.com/tansen87/duckling');
          }}
        />
        <ToggleColorMode />
        <AppSettingDialog />
      </nav>
    </aside>
  );
}
