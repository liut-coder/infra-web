import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rolesApi, usersApi } from "@/features/admin/api";
import type { RoleRecord, UserRecord } from "@/features/admin/types";
import { asErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const userSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  username: z.string().min(3, "用户名至少 3 位"),
  displayName: z.string().min(1, "请输入显示名称"),
  password: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userSchema>;

const defaultValues: UserFormValues = {
  email: "",
  username: "",
  displayName: "",
  password: "",
  roleIds: [],
  isActive: true,
};

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () =>
      usersApi.list({ page, pageSize: 10, q: search || undefined }),
  });
  const rolesQuery = useQuery({
    queryKey: ["admin", "roles", "all"],
    queryFn: () => rolesApi.list({ page: 1, pageSize: 100 }),
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  const saveMutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (editingUser) {
        return usersApi.update(editingUser.id, {
          email: values.email,
          username: values.username,
          displayName: values.displayName,
          isActive: values.isActive,
          roleIds: values.roleIds,
          password: values.password || undefined,
        });
      }
      return usersApi.create({
        email: values.email,
        username: values.username,
        displayName: values.displayName,
        password: values.password || "",
        roleIds: values.roleIds,
      });
    },
    onSuccess: () => {
      setDrawerOpen(false);
      setEditingUser(null);
      form.reset(defaultValues);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      setDeleteUser(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  function openCreate() {
    setEditingUser(null);
    form.reset({ ...defaultValues, password: "ChangeMe123!" });
    setDrawerOpen(true);
  }

  const openEdit = useCallback(
    async (user: UserRecord) => {
      setEditingUser(user);
      const detail = await usersApi.get(user.id);
      form.reset({
        email: detail.email,
        username: detail.username,
        displayName: detail.displayName,
        password: "",
        isActive: detail.isActive,
        roleIds: detail.roles?.map((role) => role.id) ?? [],
      });
      setDrawerOpen(true);
    },
    [form],
  );

  const roleOptions = rolesQuery.data?.items ?? [];
  const rows = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination;
  const activeUsers = rows.filter((item) => item.isActive).length;
  const boundUsers = rows.filter((item) => (item.roles?.length ?? 0) > 0).length;

  const columns = useMemo<ColumnDef<UserRecord>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: "用户",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.displayName}</div>
            <div className="text-xs text-muted-foreground">
              @{row.original.username}
            </div>
          </div>
        ),
      },
      { accessorKey: "email", header: "邮箱" },
      {
        accessorKey: "isActive",
        header: "状态",
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone="success">启用</StatusBadge>
          ) : (
            <StatusBadge tone="offline">停用</StatusBadge>
          ),
      },
      {
        accessorKey: "lastLoginAt",
        header: "最近登录",
        cell: ({ row }) =>
          row.original.lastLoginAt
            ? formatDateTime(row.original.lastLoginAt)
            : "-",
      },
      {
        accessorKey: "createdAt",
        header: "创建时间",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void openEdit(row.original)}
            >
              <Edit2 className="h-4 w-4" />
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => setDeleteUser(row.original)}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          </div>
        ),
      },
    ],
    [openEdit],
  );

  return (
    <GlassPage>
      <PageContainer>
      <PageHeader
        title="用户管理"
        description="管理后台登录账号、启停状态和角色绑定"
        actions={
          <PermissionGate permission="user:create" fallback={null}>
            <Button onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              新建用户
            </Button>
          </PermissionGate>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["用户总数", (pagination?.total ?? rows.length).toString(), UserPlus],
          ["启用账号", activeUsers.toString(), Edit2],
          ["已绑定角色", boundUsers.toString(), ShieldCheck],
        ].map(([title, value, Icon]) => (
          <GlassPanel key={title as string} className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm text-slate-500">{title as string}</div>
                <div className="mt-0.5 font-semibold text-slate-950">{value as string}</div>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
      <GlassPanel className="mt-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-950">账号闭环</div>
            <div className="mt-1 text-sm text-slate-500">
              用户绑定角色，角色承载权限；登录、修改和删除动作进入审计链路。
            </div>
          </div>
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            {rolesQuery.isFetching ? "角色同步中" : `${roleOptions.length} 个角色可绑定`}
          </GlassButtonSurface>
        </div>
      </GlassPanel>
      <div className="mt-6 space-y-5">
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="搜索邮箱、用户名或显示名称"
        />
        <DataTable
          data={rows}
          columns={columns}
          total={pagination?.total}
          page={pagination?.page}
          pageCount={pagination?.totalPages}
          onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
          onNextPage={() =>
            setPage((value) =>
              Math.min(pagination?.totalPages ?? value, value + 1),
            )
          }
          isPreviousDisabled={(pagination?.page ?? 1) <= 1}
          isNextDisabled={
            (pagination?.page ?? 1) >= (pagination?.totalPages ?? 1)
          }
          toolbar={
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {usersQuery.isFetching
                  ? "正在同步后端数据"
                  : "数据来自 /api/v1/users"}
              </span>
              {usersQuery.error ? (
                <span className="text-sm text-red-600">
                  {asErrorMessage(usersQuery.error)}
                </span>
              ) : null}
            </div>
          }
        />
      </div>

      <FormDrawer
        open={drawerOpen}
        title={editingUser ? "编辑用户" : "新建用户"}
        description="提交后直接写入后端 users 接口"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button
              onClick={form.handleSubmit((values) =>
                saveMutation.mutate(values),
              )}
              disabled={saveMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              {saveMutation.isPending ? "保存中" : "保存"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="邮箱" error={form.formState.errors.email?.message}>
            <Input {...form.register("email")} />
          </Field>
          <Field label="用户名" error={form.formState.errors.username?.message}>
            <Input {...form.register("username")} />
          </Field>
          <Field
            label="显示名称"
            error={form.formState.errors.displayName?.message}
          >
            <Input {...form.register("displayName")} />
          </Field>
          <Field
            label={editingUser ? "重置密码" : "初始密码"}
            error={form.formState.errors.password?.message}
          >
            <Input
              type="password"
              placeholder={editingUser ? "留空则不修改" : "至少 8 位"}
              {...form.register("password")}
            />
          </Field>
          {editingUser ? (
            <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <Checkbox
                checked={form.watch("isActive")}
                onCheckedChange={(value) =>
                  form.setValue("isActive", Boolean(value), {
                    shouldValidate: true,
                  })
                }
              />
              启用账号
            </label>
          ) : null}
          <div className="grid gap-2">
            <Label>角色</Label>
            <div className="grid gap-2 rounded-md border p-3">
              {roleOptions.map((role: RoleRecord) => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <Checkbox
                    checked={form.watch("roleIds").includes(role.id)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("roleIds");
                      form.setValue(
                        "roleIds",
                        checked
                          ? [...current, role.id]
                          : current.filter((item) => item !== role.id),
                        { shouldValidate: true },
                      );
                    }}
                  />
                  <span>{role.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {role.key}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {saveMutation.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {asErrorMessage(saveMutation.error)}
            </div>
          ) : null}
        </div>
      </FormDrawer>

      <ConfirmDialog
        open={Boolean(deleteUser)}
        title="删除用户"
        description={`确认删除 ${deleteUser?.displayName ?? ""}？该操作会调用后端删除接口。`}
        confirmText={deleteMutation.isPending ? "删除中" : "删除"}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
      />
      </PageContainer>
    </GlassPage>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
