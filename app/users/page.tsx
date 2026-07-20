"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Boxes,
  CircleCheck,
  ShieldAlert,
  Activity,
  ExternalLink,
} from "lucide-react";
import { useEmbedders, type Embedder } from "@/hooks/useEmbedders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type SortKey =
  | "embed"
  | "embedder"
  | "sandbox"
  | "load_count"
  | "load_today"
  | "last_seen"
  | "status";
type SortDir = "asc" | "desc";

const columns: { key: SortKey; label: string }[] = [
  { key: "embed", label: "Embed" },
  { key: "embedder", label: "Embedder" },
  { key: "sandbox", label: "Sandbox" },

  { key: "load_today", label: "Today/Total" },

  { key: "last_seen", label: "Last seen" },
  { key: "status", label: "Status" },
];

// const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const NEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;
function isRecentlyAdded(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
}

export default function EmbeddersTable() {
  const { data, isLoading, isError } = useEmbedders();
  const [sortKey, setSortKey] = useState<SortKey>("load_count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const rows = data?.embedders ?? [];
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const total = data?.embedders.length ?? 0;
  const active =
    data?.embedders.filter((e) => e.status === "Active").length ?? 0;
  const inactive = total - active;
  const sandboxed = data?.embedders.filter((e) => e.sandbox).length ?? 0;
  const totalLoads =
    data?.embedders.reduce((sum, e) => sum + e.load_count, 0) ?? 0;
  const totalLoadsToday =
    data?.embedders.reduce((sum, e) => sum + e.load_today, 0) ?? 0;
  const sandboxLoads =
    data?.embedders
      .filter((e) => e.sandbox)
      .reduce((sum, e) => sum + e.load_count, 0) ?? 0;
  const nonSandboxLoads = totalLoads - sandboxLoads;
  const sandboxLoadPct =
    totalLoads > 0 ? Math.round((sandboxLoads / totalLoads) * 100) : 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  const sandboxPct = total > 0 ? Math.round((sandboxed / total) * 100) : 0;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (isLoading) return <p className="p-4 text-sm text-slate-500">Loading…</p>;
  if (isError)
    return (
      <p className="p-4 text-sm text-red-600">Failed to load embedders.</p>
    );

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total embedders
            </CardTitle>
            <Boxes className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{total}</div>
            <p className="text-xs text-slate-500">{inactive} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active
            </CardTitle>
            <CircleCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">
              {active}
            </div>
            <p className="text-xs text-slate-500">{activePct}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Sandboxed
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{sandboxed}</div>
            <p className="text-xs text-slate-500">{sandboxPct}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Loads by sandbox
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalLoads}</div>
            <p className="text-xs text-slate-500">
              {totalLoadsToday} loads today
            </p>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-amber-500"
                style={{ width: `${sandboxLoadPct}%` }}
              />
              <div
                className="bg-slate-400"
                style={{ width: `${100 - sandboxLoadPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {sandboxLoads} sandboxed ({sandboxLoadPct}%) · {nonSandboxLoads}{" "}
              not sandboxed
            </p>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            {columns.map((col) => (
              <TableHead key={col.key}>
                <button
                  onClick={() => toggleSort(col.key)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  {col.label}
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                  )}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((e: Embedder, i) => (
            <TableRow key={e.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{e.embed}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {e.embedder.includes("https://") ? (
                    <Link
                      href={e.embedder}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1.5"
                    >
                      {e.embedder}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  ) : e.embedder.includes("http://") ? (
                    <Link
                      href={e.embedder}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 hover:underline"
                    >
                      {e.embedder}
                    </Link>
                  ) : (
                    <h1 className="text-gray-400 ">{e.embedder}</h1>
                  )}
                  {isRecentlyAdded(e.created_at) && (
                    <Badge variant="outline">New</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{e.sandbox ? "Yes" : "No"}</TableCell>
              <TableCell>
                {e.load_today} / {e.load_count}
              </TableCell>

              <TableCell>{new Date(e.last_seen).toLocaleString()}</TableCell>
              <TableCell>
                <span
                  className={
                    e.status === "Active" ? "text-green-600" : "text-slate-400"
                  }
                >
                  {e.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
