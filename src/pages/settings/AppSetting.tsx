import { DialogClose } from '@radix-ui/react-dialog';
import { getTauriVersion, getVersion } from '@tauri-apps/api/app';
import * as shell from '@tauri-apps/plugin-shell';
import { atom, useAtom } from 'jotai';
import { SettingsIcon } from 'lucide-react';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import Dialog from '@/components/custom/Dialog';
import { SidebarNav } from '@/components/custom/siderbar-nav';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  CsvParam,
  SettingState,
  settingAtom,
} from '@/stores/setting';

const items = [
  {
    key: 'profile',
    title: 'Appearance',
  },
  {
    key: 'csv',
    title: 'Read/Export',
  },
  // {
  //   key: 'update',
  //   title: 'Software Update',
  // },
];

export const navKeyAtom = atom('profile');

export const Display = ({
  hidden,
  children,
}: PropsWithChildren<{ hidden: boolean }>) => (
  <div className={hidden ? 'flex flex-col h-full' : 'hidden'}>{children}</div>
);

export default function AppSettingDialog() {
  const [navKey, setNavKey] = useAtom(navKeyAtom);
  return (
    <Dialog
      title="Setting"
      className="min-w-[800px] min-h-[600px]"
      trigger={
        <Button variant="ghost" size="icon" className="size-8 rounded-lg">
          <SettingsIcon className="size-4" />
        </Button>
      }
    >
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <SidebarNav items={items} activeKey={navKey} setKey={setNavKey} />
        </aside>
        <div className="flex-1 lg:max-w-2xl h-full">
          <Display hidden={navKey == 'profile'}>
            <Profile />
          </Display>
          <Display hidden={navKey == 'csv'}>
            <CSVForm />
          </Display>
          {/* <Display hidden={navKey == 'update'}>
            <UpdateForm />
          </Display> */}
        </div>
      </div>
    </Dialog>
  );
}

function Profile() {
  const [settings, setSettings] = useAtom(settingAtom);
  const form = useForm({
    defaultValues: settings,
  });

  const onSubmit = (data: SettingState) => {
    setSettings((s) => ({ ...s, ...data }));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className=" h-full flex flex-col"
      >
        <div className="flex-1 space-y-4">
          <FormField
            control={form.control}
            name="main_font_family"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Main Font Family</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="table_font_family"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Table Font Family</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="precision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Float precision</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="table_render"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Table render</FormLabel>
                <Select onValueChange={field.onChange} {...field}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a render" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit">Update</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

const UpdateForm = () => {
  const [settings, setSettings] = useAtom(settingAtom);
  const form = useForm({
    defaultValues: settings,
  });

  const [version, setVersion] = useState<string>();
  const [tauriVersion, setTauriVersion] = useState<string>();
  const onSubmit = (data: SettingState) => {
    setSettings((s) => ({ ...s, ...data }));
  };
  useEffect(() => {
    (async () => {
      setVersion(await getVersion());
      setTauriVersion(await getTauriVersion());
    })();
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className=" h-full flex flex-col"
        >
          <div className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="proxy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proxy</FormLabel>
                  <FormDescription>
                    use a proxy server for updater
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="auto_update"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Automatic updates</FormLabel>
                    <FormDescription>
                      Turn this off to prevent the app from checking for
                      updates.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit">Update</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};

const CSVForm = () => {
  const [settings, setSettings] = useAtom(settingAtom);
  const form = useForm({
    defaultValues: settings.csv,
  });

  const onSubmit = (data: CsvParam) => {
    setSettings((s) => ({ ...s, csv: data }));
  };

  return (
    <>
      <DialogDescription>
        Read csv file parameters, see:&nbsp;
        <a
          className="prose prose-a:text-link text-link border-b-[1px] cursor-pointer"
          onClick={() =>
            shell.open(
              'https://duckdb.org/docs/data/csv/overview.html#parameters',
            )
          }
        >
          csv parameters
        </a>
      </DialogDescription>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <div className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="delim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delim</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Specifies the string that separates columns within each row
                    (line) of the file.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Specifies the quoting string to be used when a data value is
                    quoted.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="escape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escape</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Specifies the string that should appear before a data
                    character sequence that matches the quote value.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New line</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Set the new line character(s) in the file. Options are
                    '\r','\n', or '\r\n'.
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button className="mx-0" type="submit">
              Update
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
