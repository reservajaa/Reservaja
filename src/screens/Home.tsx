import React, { useState, useMemo, useRef } from "react";
import { Goal, Profile, GoalShortcut, DEFAULT_GOAL_SHORTCUTS } from "../types";
import { formatCurrency } from "../utils";
import { GoalCard } from "../components/GoalCard";
import { GoalShortcuts } from "../components/GoalShortcuts";
import { Plus, Search, ArrowUpDown, Wallet, Image as ImageIcon, X } from "lucide-react";
import { Button, Input } from "../components/ui";
import { motion } from "motion/react";
import { Modal } from "../components/Modal";
import confetti from "canvas-confetti";
import logoImg from "../assets/images/reserva_ja_logo_1782703217853.jpg";
import { BANKS_BASE, getBankLogoUrl, cleanImageUrl, compressImage } from "../utils/banks";

interface HomeProps {
  goals: Goal[];
  profile: Profile;
  onAddGoal: (
    goal: Omit<Goal, "id" | "createdAt" | "savedAmount" | "history">,
  ) => void;
  onUpdateGoal: (
    id: string,
    updates: Partial<
      Omit<Goal, "id" | "createdAt" | "savedAmount" | "history">
    >,
  ) => void;
  onDeleteGoal: (id: string) => void;
  onAddMoney: (id: string, amount: number) => void;
  onRemoveMoney: (id: string, amount: number) => void;
  onClearHistory?: (id: string) => void;
  onUpdateGoalShortcuts?: (goalId: string, shortcuts: GoalShortcut[]) => void;
}

export function Home({
  goals,
  profile,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddMoney,
  onRemoveMoney,
  onClearHistory,
  onUpdateGoalShortcuts,
}: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("newest");

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Merge default banks with admin-added custom banks
  const allBanks = useMemo(() => [
    ...BANKS_BASE,
    ...(profile.extraBanks || []),
  ], [profile.extraBanks]);

  const [goalForm, setGoalForm] = useState<{
    name: string;
    targetAmount: string;
    installments: string;
    installmentValue: string;
    imageUrl: string;
    productUrl: string;
    bank: string;
    shortcuts: GoalShortcut[];
  }>({
    name: "",
    targetAmount: "",
    installments: "1",
    installmentValue: "",
    imageUrl: "",
    productUrl: "",
    bank: "",
    shortcuts: DEFAULT_GOAL_SHORTCUTS,
  });

  const [isMoneyModalOpen, setIsMoneyModalOpen] = useState(false);
  const [activeMoneyGoal, setActiveMoneyGoal] = useState<string | null>(null);
  const [moneyAmount, setMoneyAmount] = useState("");

  const [isRemoveMoneyModalOpen, setIsRemoveMoneyModalOpen] = useState(false);
  const [activeRemoveMoneyGoal, setActiveRemoveMoneyGoal] = useState<
    string | null
  >(null);
  const [removeMoneyAmount, setRemoveMoneyAmount] = useState("");

  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [goalToClearHistory, setGoalToClearHistory] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [shortcutAction, setShortcutAction] = useState<"add" | "remove">("add");
  const [shortcutGoalId, setShortcutGoalId] = useState("");
  const [shortcutAmount, setShortcutAmount] = useState("");

  const goalImageInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  const handleGoalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file, 480, 480);
      setGoalForm((prev) => ({ ...prev, imageUrl: base64 }));
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      alert("Não foi possível carregar a imagem selecionada.");
    }
    e.target.value = "";
  };

  const handleProductUrlChange = (val: string) => {
    const cleaned = cleanImageUrl(val);
    const isDirectImage = cleaned.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || (val.includes("google.") && val.includes("imgurl="));
    setGoalForm((prev) => {
      if (isDirectImage && !prev.imageUrl) {
        return { ...prev, productUrl: cleaned, imageUrl: cleaned };
      }
      return { ...prev, productUrl: cleaned };
    });
  };

  const handleImageUrlChange = (val: string) => {
    const cleaned = cleanImageUrl(val);
    setGoalForm((prev) => ({ ...prev, imageUrl: cleaned }));
  };

  const fetchProductData = async (url: string) => {
    if (!url) return;
    try {
      new URL(url);
    } catch {
      return; // Invalid URL
    }

    setIsFetchingUrl(true);
    try {
      // 1. Fetch metadata using Microlink
      const metaRes = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(url)}`,
      );
      const metaData = await metaRes.json();

      let title = "";
      let image = "";

      if (metaData.status === "success") {
        title = metaData.data.title || "";
        image = metaData.data.image?.url || metaData.data.logo?.url || "";

        // Clean up title
        if (title) {
          title = title.split("|")[0].split("-")[0].trim();
        }
      }

      // 2. Try to get price via allorigins (HTML parsing)
      let price = "";
      try {
        const response = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        );
        const data = await response.json();
        const html = data.contents;

        if (html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          if (!title) {
            title =
              doc
                .querySelector('meta[property="og:title"]')
                ?.getAttribute("content") ||
              doc.querySelector("title")?.textContent ||
              "";
            title = title.split("|")[0].split("-")[0].trim();
          }
          if (!image) {
            image =
              doc
                .querySelector('meta[property="og:image"]')
                ?.getAttribute("content") || "";
          }

          const mlPrice = doc.querySelector(
            ".andes-money-amount__fraction",
          )?.textContent;
          const amazonPrice = doc.querySelector(".a-price-whole")?.textContent;
          const magaluPrice = doc.querySelector(
            '[data-testid="price-value"]',
          )?.textContent;

          if (mlPrice) {
            price = mlPrice.replace(/\./g, "");
          } else if (amazonPrice) {
            price = amazonPrice.replace(/\./g, "");
          } else if (magaluPrice) {
            price = magaluPrice.replace(/[^\d,]/g, "").replace(",", ".");
          } else {
            // generic fallback: find first R$ XX.XXX,XX
            const match = html.match(/R\$\s*([\d\.,]+)/);
            if (match) {
              price = match[1].replace(/\./g, "").replace(",", ".");
            }
          }
        }
      } catch (e) {
        console.error("HTML parse failed", e);
      }

      setGoalForm((prev) => ({
        ...prev,
        name: prev.name || title || prev.name,
        imageUrl: prev.imageUrl || image || prev.imageUrl,
        targetAmount: prev.targetAmount || price || prev.targetAmount,
      }));
    } catch (error) {
      console.error("Error fetching product data:", error);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const filteredAndSortedGoals = useMemo(() => {
    let result = goals.filter((g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      switch (sortOption) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "highest":
          return b.targetAmount - a.targetAmount;
        case "lowest":
          return a.targetAmount - b.targetAmount;
        case "closest": {
          const aPercent = a.savedAmount / a.targetAmount;
          const bPercent = b.savedAmount / b.targetAmount;
          return bPercent - aPercent;
        }
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return result;
  }, [goals, searchQuery, sortOption]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(
      goalForm.targetAmount.replace(/,/g, "."),
    );
    if (isNaN(amount) || amount <= 0) {
      alert("O valor da meta deve ser maior que zero.");
      return;
    }
    
    const installments = parseInt(goalForm.installments) || 1;
    const installmentValue = parseFloat(goalForm.installmentValue.replace(/,/g, ".")) || 0;

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, {
        name: goalForm.name,
        targetAmount: amount,
        installments,
        installmentValue,
        imageUrl: goalForm.imageUrl,
        productUrl: goalForm.productUrl,
        bank: goalForm.bank,
        shortcuts: goalForm.shortcuts,
      });
    } else {
      onAddGoal({
        name: goalForm.name,
        targetAmount: amount,
        installments,
        installmentValue,
        imageUrl: goalForm.imageUrl,
        productUrl: goalForm.productUrl,
        bank: goalForm.bank,
        shortcuts: goalForm.shortcuts,
      });
    }

    closeGoalModal();
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
    setGoalForm({
      name: "",
      targetAmount: "",
      installments: "1",
      installmentValue: "",
      imageUrl: "",
      productUrl: "",
      bank: "",
      shortcuts: DEFAULT_GOAL_SHORTCUTS,
    });
  };

  const handleAddMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMoneyGoal) return;

    const amount = parseFloat(moneyAmount.replace(/,/g, "."));
    if (isNaN(amount) || amount <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    const goal = goals.find((g) => g.id === activeMoneyGoal);
    if (goal) {
      const newSaved = goal.savedAmount + amount;
      if (newSaved >= goal.targetAmount) {
        triggerConfetti();
      } else {
        triggerSaveMoneyAnimation();
      }
      onAddMoney(activeMoneyGoal, amount);
    }

    closeMoneyModal();
  };

  const closeMoneyModal = () => {
    setIsMoneyModalOpen(false);
    setActiveMoneyGoal(null);
    setMoneyAmount("");
  };

  const handleRemoveMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRemoveMoneyGoal) return;

    const amount = parseFloat(removeMoneyAmount.replace(/,/g, "."));
    if (isNaN(amount) || amount <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    const goal = goals.find((g) => g.id === activeRemoveMoneyGoal);
    if (goal) {
      if (goal.savedAmount > 0) {
        triggerSadAnimation();
      }
      onRemoveMoney(activeRemoveMoneyGoal, amount);
    }

    closeRemoveMoneyModal();
  };

  const closeRemoveMoneyModal = () => {
    setIsRemoveMoneyModalOpen(false);
    setActiveRemoveMoneyGoal(null);
    setRemoveMoneyAmount("");
  };

  const handleShortcutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcutGoalId) {
      alert("Por favor, selecione uma meta.");
      return;
    }

    const amount = parseFloat(shortcutAmount.replace(/,/g, "."));
    if (isNaN(amount) || amount <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    const goal = goals.find((g) => g.id === shortcutGoalId);
    if (!goal) return;

    if (shortcutAction === "add") {
      const newSaved = goal.savedAmount + amount;
      if (newSaved >= goal.targetAmount) {
        triggerConfetti();
      } else {
        triggerSaveMoneyAnimation();
      }
      onAddMoney(shortcutGoalId, amount);
    } else {
      if (goal.savedAmount > 0) {
        triggerSadAnimation();
      }
      onRemoveMoney(shortcutGoalId, amount);
    }

    setIsShortcutModalOpen(false);
    setShortcutAmount("");
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        }),
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        }),
      );
    }, 250);
  };

  const triggerSaveMoneyAnimation = () => {
    // Fogos (Fireworks)
    const duration = 1.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        }),
      );
    }, 250);

    // Confetes (Bottom up)
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.9 },
      colors: ["#00C853", "#FFD700", "#81C784"],
    });
  };

  const triggerSadAnimation = () => {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;

    // @ts-ignore
    const sad =
      typeof confetti.shapeFromText === "function"
        ? confetti.shapeFromText({ text: "😢", scalar: 3 })
        : undefined;
    // @ts-ignore
    const cry =
      typeof confetti.shapeFromText === "function"
        ? confetti.shapeFromText({ text: "😭", scalar: 3 })
        : undefined;
    // @ts-ignore
    const broken =
      typeof confetti.shapeFromText === "function"
        ? confetti.shapeFromText({ text: "📉", scalar: 3 })
        : undefined;

    const shapes = [sad, cry, broken].filter(Boolean);

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      confetti({
        particleCount: shapes.length ? 5 : 15,
        angle: 270,
        spread: 60,
        origin: { x: Math.random(), y: -0.1 },
        colors: shapes.length ? undefined : ["#3b82f6", "#60a5fa", "#93c5fd"],
        shapes: shapes.length ? shapes : undefined,
        scalar: shapes.length ? 2 : 1,
        ticks: 200,
        gravity: 0.8,
        zIndex: 100,
      });
    }, 250);
  };

  return (
    <div className="mx-auto max-w-4xl pb-24 md:pb-8">
      <header className="mb-8 md:hidden">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm overflow-hidden bg-white">
            <img
              src={logoImg}
              alt="Logo"
              className="h-full w-full object-cover"
            />
          </div>
          Reserva Já
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Transforme pequenos valores em grandes conquistas.
        </p>
      </header>

      <div className="hidden md:block mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Minhas Metas
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Transforme pequenos valores em grandes conquistas.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Guardado</p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            {goals.reduce((acc, curr) => acc + curr.savedAmount, 0).toLocaleString('pt-BR', { style: 'currency', currency: profile.currency || 'BRL' })}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Meta Global</p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold text-gray-900 dark:text-white">
             {goals.reduce((acc, curr) => acc + curr.targetAmount, 0).toLocaleString('pt-BR', { style: 'currency', currency: profile.currency || 'BRL' })}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Metas Concluídas</p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold text-gray-900 dark:text-white">
             {goals.filter(g => g.savedAmount >= g.targetAmount).length} <span className="text-sm font-normal text-gray-500">/ {goals.length}</span>
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar meta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C853] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="relative shrink-0">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="h-11 appearance-none rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C853] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="newest">Mais recente</option>
            <option value="oldest">Mais antiga</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
            <option value="closest">Mais próxima</option>
          </select>
          <ArrowUpDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-6xl">🌱</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Nenhuma meta ainda
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Comece a planejar o seu futuro. Crie sua primeira meta clicando no
            botão abaixo.
          </p>
          <Button
            className="mt-6 md:hidden"
            onClick={() => setIsGoalModalOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Criar Meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={profile.currency}
              customBanks={profile.customBanks}
              extraBanks={profile.extraBanks}
              onEdit={(g) => {
                setEditingGoal(g);
                setGoalForm({
                  name: g.name,
                  targetAmount: g.targetAmount.toString(),
                  installments: (g.installments || 1).toString(),
                  installmentValue: g.installmentValue ? g.installmentValue.toString() : "",
                  imageUrl: g.imageUrl,
                  productUrl: g.productUrl || "",
                  bank: g.bank || "",
                  shortcuts: g.shortcuts && g.shortcuts.length > 0 ? g.shortcuts : DEFAULT_GOAL_SHORTCUTS,
                });
                setIsGoalModalOpen(true);
              }}
              onDelete={(id) => setGoalToDelete(id)}
              onAddMoney={(id) => {
                setActiveMoneyGoal(id);
                setIsMoneyModalOpen(true);
              }}
              onRemoveMoney={(id) => {
                setActiveRemoveMoneyGoal(id);
                setIsRemoveMoneyModalOpen(true);
              }}
              onClearHistory={(id) => setGoalToClearHistory(id)}
            />
          ))}
        </div>
      )}

      {/* FABs */}
      <div className="fixed bottom-20 right-6 z-20 flex gap-3 md:bottom-8">
        <button
          onClick={() => {
            setShortcutAction("add");
            setShortcutGoalId(goals[0]?.id || "");
            setShortcutAmount("");
            setIsShortcutModalOpen(true);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="Transação Rápida"
        >
          <Wallet className="h-6 w-6" />
        </button>
        <button
          onClick={() => setIsGoalModalOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00C853] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="Nova Meta"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Goal Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={closeGoalModal}
        title={editingGoal ? "Editar Meta" : "Nova Meta"}
      >
        <form onSubmit={handleSaveGoal} noValidate className="space-y-4">
          <Input
            label="Nome da meta"
            placeholder="Ex: Fone Bluetooth"
            value={goalForm.name}
            onChange={(e) =>
              setGoalForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
          <Input
            label="Valor Total"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ex: 100.00"
            value={goalForm.targetAmount}
            onChange={(e) => {
              const val = e.target.value;
              const numVal = parseFloat(val);
              const inst = parseInt(goalForm.installments);
              setGoalForm((prev) => ({ 
                ...prev, 
                targetAmount: val,
                installmentValue: !isNaN(numVal) && inst > 1 ? (numVal / inst).toFixed(2) : prev.installmentValue
              }));
            }}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parcelamento
              </label>
              <select
                className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={goalForm.installments}
                onChange={(e) => {
                  const inst = parseInt(e.target.value);
                  const total = parseFloat(goalForm.targetAmount);
                  setGoalForm(prev => ({
                    ...prev,
                    installments: e.target.value,
                    installmentValue: inst > 1 && !isNaN(total) ? (total / inst).toFixed(2) : ""
                  }));
                }}
              >
                <option value="1">À vista</option>
                {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
            
            {parseInt(goalForm.installments) > 1 && (
              <Input
                label="Valor da parcela"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ex: 50.00"
                value={goalForm.installmentValue}
                onChange={(e) => {
                  const val = e.target.value;
                  const numVal = parseFloat(val);
                  const inst = parseInt(goalForm.installments);
                  setGoalForm(prev => ({
                    ...prev,
                    installmentValue: val,
                    targetAmount: !isNaN(numVal) && inst > 1 ? (numVal * inst).toFixed(2) : prev.targetAmount
                  }));
                }}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Banco para Reserva (opcional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setGoalForm(prev => ({ ...prev, bank: "" }))}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 border-2 transition-all text-xs font-medium ${
                  !goalForm.bank
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-gray-400" />
                </div>
                <span className="leading-tight text-center">Nenhum</span>
              </button>
              {allBanks.map(bank => (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setGoalForm(prev => ({ ...prev, bank: bank.id }))}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 border-2 transition-all text-xs font-medium ${
                    goalForm.bank === bank.id
                      ? "border-[2px] bg-opacity-10"
                      : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                  }`}
                  style={goalForm.bank === bank.id ? {
                    borderColor: bank.color,
                    backgroundColor: bank.color + "18",
                    color: bank.color,
                  } : {}}
                >
                  <div className="h-8 w-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm overflow-hidden p-0.5">
                    <img
                      src={getBankLogoUrl(bank.id, profile.customBanks, profile.extraBanks)}
                      alt={bank.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.parentElement!.innerHTML = bank.name.charAt(0);
                        el.parentElement!.className += ' text-xs font-bold text-gray-600';
                      }}
                    />
                  </div>
                  <span className="leading-tight text-center line-clamp-1">{bank.name}</span>
                </button>
              ))}
            </div>
          </div>
          {/* URL do Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL do Produto (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={productImageInputRef}
                className="hidden"
                onChange={handleGoalImageUpload}
              />
              <div className="flex-1 relative">
                <Input
                  label=""
                  type="text"
                  placeholder="Link da loja ou link da imagem..."
                  value={goalForm.productUrl.startsWith('data:') ? '[Imagem Carregada do Computador/Celular]' : goalForm.productUrl}
                  onChange={(e) => handleProductUrlChange(e.target.value)}
                  onBlur={() => {
                    if (goalForm.productUrl && !goalForm.productUrl.startsWith('data:')) {
                      fetchProductData(goalForm.productUrl);
                    }
                  }}
                />
                {isFetchingUrl && (
                  <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                )}
              </div>
              <button
                type="button"
                onClick={() => productImageInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shrink-0"
                title="Adicionar foto do produto do computador ou celular"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* URL da Imagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL da Imagem da Meta (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={goalImageInputRef}
                className="hidden"
                onChange={handleGoalImageUpload}
              />
              <div className="flex-1">
                <Input
                  label=""
                  type="text"
                  placeholder="Cole o link da imagem ou escolha um arquivo..."
                  value={goalForm.imageUrl.startsWith('data:') ? '[Imagem Selecionada do Computador/Celular]' : goalForm.imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => goalImageInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shrink-0"
                title="Enviar imagem do computador ou celular"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Preview da Imagem da Meta */}
            {goalForm.imageUrl && (
              <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <div className="h-14 w-14 shrink-0 rounded-lg bg-white dark:bg-gray-800 overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <img
                    src={goalForm.imageUrl}
                    alt="Preview da meta"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).alt = 'Falha ao carregar';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Foto da Meta Selecionada
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {goalForm.imageUrl.startsWith('data:') ? 'Arquivo do computador/celular' : goalForm.imageUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGoalForm(prev => ({ ...prev, imageUrl: '' }))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remover imagem"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Atalhos Rápidos da Meta */}
          <div className="pt-1">
            <GoalShortcuts
              shortcuts={goalForm.shortcuts}
              currency={profile.currency}
              onSelectAmount={() => {}}
              onSaveShortcuts={(newShortcuts) =>
                setGoalForm((prev) => ({ ...prev, shortcuts: newShortcuts }))
              }
            />
          </div>

          <div className="pt-2">
            <Button type="submit" fullWidth>
              Salvar Meta
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Money Modal */}
      <Modal
        isOpen={isMoneyModalOpen}
        onClose={closeMoneyModal}
        title="Guardar Dinheiro"
      >
        <form onSubmit={handleAddMoney} className="space-y-4">
          {activeMoneyGoal && (
            <GoalShortcuts
              shortcuts={goals.find((g) => g.id === activeMoneyGoal)?.shortcuts}
              currency={profile.currency}
              currentAmount={moneyAmount}
              onSelectAmount={(amt) => setMoneyAmount(amt.toFixed(2))}
              onSaveShortcuts={
                onUpdateGoalShortcuts
                  ? (newShortcuts) =>
                      onUpdateGoalShortcuts(activeMoneyGoal, newShortcuts)
                  : undefined
              }
            />
          )}

          <Input
            label="Quanto deseja guardar?"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ex: 50.00"
            value={moneyAmount}
            onChange={(e) => setMoneyAmount(e.target.value)}
            required
            autoFocus
          />
          <div className="pt-2">
            <Button type="submit" fullWidth>
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Money Modal */}
      <Modal
        isOpen={isRemoveMoneyModalOpen}
        onClose={closeRemoveMoneyModal}
        title="Tirar Dinheiro"
      >
        <form onSubmit={handleRemoveMoney} className="space-y-4">
          {activeRemoveMoneyGoal && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
                Saldo disponível: <strong className="text-gray-900 dark:text-white">{formatCurrency(goals.find(g => g.id === activeRemoveMoneyGoal)?.savedAmount || 0, profile.currency)}</strong>
              </p>

              <GoalShortcuts
                shortcuts={goals.find((g) => g.id === activeRemoveMoneyGoal)?.shortcuts}
                currency={profile.currency}
                currentAmount={removeMoneyAmount}
                onSelectAmount={(amt) => {
                  const maxVal = goals.find((g) => g.id === activeRemoveMoneyGoal)?.savedAmount || 0;
                  const finalAmt = maxVal > 0 ? Math.min(amt, maxVal) : amt;
                  setRemoveMoneyAmount(finalAmt.toFixed(2));
                }}
                onSaveShortcuts={
                  onUpdateGoalShortcuts
                    ? (newShortcuts) =>
                        onUpdateGoalShortcuts(activeRemoveMoneyGoal, newShortcuts)
                    : undefined
                }
              />
            </>
          )}

          <Input
            label="Quanto deseja retirar?"
            type="number"
            step="0.01"
            min="0.01"
            max={goals.find(g => g.id === activeRemoveMoneyGoal)?.savedAmount || 0.01}
            placeholder="Ex: 50.00"
            value={removeMoneyAmount}
            onChange={(e) => setRemoveMoneyAmount(e.target.value)}
            required
            autoFocus
          />
          <div className="pt-2">
            <Button type="submit" variant="danger" fullWidth>
              Retirar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shortcut Modal */}
      <Modal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        title="Transação Rápida"
      >
        <form onSubmit={handleShortcutSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShortcutAction("add")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                shortcutAction === "add"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setShortcutAction("remove")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                shortcutAction === "remove"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              Retirar
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Meta
            </label>
            <select
              value={shortcutGoalId}
              onChange={(e) => setShortcutGoalId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#00C853] focus:outline-none focus:ring-1 focus:ring-[#00C853] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="" disabled>
                Selecione uma meta
              </option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {shortcutGoalId && shortcutAction === 'remove' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Saldo disponível: <strong className="text-gray-900 dark:text-white">{formatCurrency(goals.find(g => g.id === shortcutGoalId)?.savedAmount || 0, profile.currency)}</strong>
              </p>
            )}
          </div>

          {shortcutGoalId && (
            <GoalShortcuts
              shortcuts={goals.find((g) => g.id === shortcutGoalId)?.shortcuts}
              currency={profile.currency}
              currentAmount={shortcutAmount}
              onSelectAmount={(amt) => {
                if (shortcutAction === "remove") {
                  const maxVal = goals.find((g) => g.id === shortcutGoalId)?.savedAmount || 0;
                  const finalAmt = maxVal > 0 ? Math.min(amt, maxVal) : amt;
                  setShortcutAmount(finalAmt.toFixed(2));
                } else {
                  setShortcutAmount(amt.toFixed(2));
                }
              }}
              onSaveShortcuts={
                onUpdateGoalShortcuts
                  ? (newShortcuts) =>
                      onUpdateGoalShortcuts(shortcutGoalId, newShortcuts)
                  : undefined
              }
            />
          )}

          <Input
            label="Valor"
            type="number"
            step="0.01"
            min="0.01"
            max={shortcutAction === 'remove' && shortcutGoalId ? goals.find(g => g.id === shortcutGoalId)?.savedAmount || 0.01 : undefined}
            placeholder="Ex: 50.00"
            value={shortcutAmount}
            onChange={(e) => setShortcutAmount(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant={shortcutAction === "add" ? "primary" : "danger"}
              fullWidth
            >
              {shortcutAction === "add" ? "Adicionar" : "Retirar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        title="Excluir Meta"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Tem certeza que deseja excluir esta meta? Esta ação não pode ser
            desfeita.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setGoalToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                if (goalToDelete) {
                  onDeleteGoal(goalToDelete);
                  setGoalToDelete(null);
                }
              }}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear History Confirmation Modal */}
      <Modal
        isOpen={!!goalToClearHistory}
        onClose={() => setGoalToClearHistory(null)}
        title="Limpar Histórico"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Tem certeza que deseja limpar todo o histórico desta meta? Todas as movimentações registradas serão apagadas, mantendo o saldo atual intacto. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setGoalToClearHistory(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                if (goalToClearHistory && onClearHistory) {
                  onClearHistory(goalToClearHistory);
                  setGoalToClearHistory(null);
                }
              }}
            >
              Limpar Histórico
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
