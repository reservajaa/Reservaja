import React, { useState } from "react";
import { Goal } from "../types";
import { formatCurrency } from "../utils";
import {
  Pencil,
  Trash2,
  Wallet,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "./ui";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../utils";
import { BANKS_BASE, getBankLogoUrl } from "../utils/banks";
import { CustomBankEntry } from "../types";

interface GoalCardProps {
  key?: React.Key;
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onAddMoney: (id: string) => void;
  onRemoveMoney: (id: string) => void;
  onClearHistory?: (id: string) => void;
  currency: string;
  customBanks?: Record<string, string>;
  extraBanks?: CustomBankEntry[];
}

function getStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("amazon")) return "Amazon";
    if (hostname.includes("mercadolivre")) return "Mercado Livre";
    if (hostname.includes("shopee")) return "Shopee";
    if (hostname.includes("aliexpress")) return "AliExpress";
    if (hostname.includes("magazineluiza") || hostname.includes("magalu"))
      return "Magalu";
    if (hostname.includes("americanas")) return "Americanas";
    return "Ver Produto";
  } catch {
    return "Ver Produto";
  }
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAddMoney,
  onRemoveMoney,
  onClearHistory,
  currency,
  customBanks,
  extraBanks,
}: GoalCardProps) {
  const allBanks = [...BANKS_BASE, ...(extraBanks || [])];
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage =
    Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) ||
    0;
  const isCompleted = percentage >= 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
    >
      <div
        className="flex items-start gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {goal.imageUrl ? (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <img
              src={goal.imageUrl}
              alt={goal.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={(e) => {
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-2xl">🎯</span>';
                }
              }}
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-green-50 text-2xl dark:bg-green-900/20">
            🎯
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {goal.name}
            </h3>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(goal);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(goal.id);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
            </div>
            {isCompleted && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-500/20 mt-1 mr-1">
                🏆 Meta Concluída
              </span>
            )}
          </div>
          </div>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-200">
                {formatCurrency(goal.savedAmount, currency)}
              </span>
              {goal.installments && goal.installments > 1 && goal.installmentValue ? (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                  (em {goal.installments}x de {formatCurrency(goal.installmentValue, currency)})
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {goal.bank && (() => {
                const bank = allBanks.find((b) => b.id === goal.bank);
                if (!bank) return null;
                return (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: bank.color + "22", color: bank.color, border: `1px solid ${bank.color}44` }}
                  >
                    <img
                      src={getBankLogoUrl(bank.id, customBanks, extraBanks)}
                      alt={bank.name}
                      referrerPolicy="no-referrer"
                      className="h-4 w-4 object-contain rounded-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {bank.name}
                  </div>
                );
              })()}
              {goal.productUrl && (
                <a
                  href={goal.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 w-max rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  {getStoreName(goal.productUrl)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(goal.savedAmount, currency)} guardado
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Falta{" "}
                  {formatCurrency(
                    Math.max(0, goal.targetAmount - goal.savedAmount),
                    currency,
                  )}
                </span>
              </div>

              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`absolute bottom-0 left-0 top-0 rounded-full ${
                    isCompleted
                      ? "bg-gradient-to-r from-green-400 to-green-500"
                      : "bg-[#00C853]"
                  }`}
                />
              </div>
              <div className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                {percentage}%
              </div>
            </div>

            {!isCompleted && (
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex flex-col gap-2">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMoney(goal.id);
                  }}
                  className="text-[#00C853] hover:bg-green-50 dark:hover:bg-green-900/20 bg-green-50/50 dark:bg-transparent"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Guardar Dinheiro
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveMoney(goal.id);
                  }}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Wallet className="mr-2 h-4 w-4 opacity-70" />
                  Tirar Dinheiro
                </Button>
              </div>
            )}
            {isCompleted && (
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex justify-center">
                <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  🎉 Meta Concluída!
                </span>
              </div>
            )}
            {goal.history && goal.history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Histórico
                  </h4>
                  {onClearHistory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearHistory(goal.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Limpar histórico da meta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Limpar Histórico</span>
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {[...goal.history].reverse().map((record) => (
                    <div
                      key={record.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(record.date).toLocaleDateString("pt-BR")}{" "}
                        {new Date(record.date).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={
                          record.amount > 0
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : "text-red-500 dark:text-red-400 font-medium"
                        }
                      >
                        {record.amount > 0 ? "+" : ""}
                        {formatCurrency(record.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
