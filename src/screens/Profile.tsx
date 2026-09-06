import React, { useState, useEffect, useRef } from "react";
import { Profile } from "../types";
import { Input, Button } from "../components/ui";
import { compressImage, cleanImageUrl } from "../utils/banks";
import { Camera, Trash2, Image as ImageIcon } from "lucide-react";

interface ProfileScreenProps {
  profile: Profile;
  onUpdateProfile: (profile: Profile) => void;
  onLogout: () => void;
}

export function ProfileScreen({
  profile,
  onUpdateProfile,
  onLogout,
}: ProfileScreenProps) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      // Comprime a foto para resolução de avatar (256x256) leve e nítida
      const base64 = await compressImage(file, 256, 256);
      const updatedProfile = { ...form, photoUrl: base64 };
      setForm(updatedProfile);
      onUpdateProfile(updatedProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Erro ao processar imagem do perfil:", err);
      alert("Não foi possível carregar a imagem da galeria.");
    } finally {
      setIsProcessingImage(false);
    }
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    const updatedProfile = { ...form, photoUrl: "" };
    setForm(updatedProfile);
    onUpdateProfile(updatedProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-xl pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          👤 Meu Perfil
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gerencie suas informações pessoais.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Avatar com ação de clique para abrir a galeria */}
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Clique para escolher foto da galeria"
          >
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-4 ring-gray-100 transition-all group-hover:ring-[#00C853] dark:bg-gray-700 dark:ring-gray-700 dark:group-hover:ring-[#00C853]">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt="Perfil"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  🧑
                </div>
              )}
            </div>

            {/* Overlay com ícone de câmera */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6" />
              <span className="mt-1 text-[10px] font-medium">Trocar foto</span>
            </div>

            {/* Botão de câmera visível no canto da foto */}
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#00C853] text-white shadow-md transition-transform hover:scale-110 active:scale-95"
              title="Escolher foto da galeria"
              disabled={isProcessingImage}
            >
              <Camera className="h-4 w-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[#00C853]" />
                {isProcessingImage ? "Carregando..." : "Escolher da Galeria"}
              </button>
              {form.photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover foto
                </button>
              )}
            </div>

            <Input
              label="Nome"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              label="URL da Foto (opcional)"
              type="text"
              placeholder="Cole o link ou escolha da galeria acima"
              value={form.photoUrl?.startsWith("data:") ? "" : form.photoUrl}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, photoUrl: cleanImageUrl(val) }));
              }}
            />
            {form.photoUrl?.startsWith("data:") && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                ✓ Foto personalizada da sua galeria selecionada
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Moeda
          </label>
          <select
            value={form.currency}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, currency: e.target.value }))
            }
            className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C853] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="BRL">Real (R$)</option>
            <option value="USD">Dólar ($)</option>
            <option value="EUR">Euro (€)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-3 dark:border-gray-700">
          <Button type="submit" fullWidth>
            {saved ? "Salvo com sucesso!" : "Salvar Alterações"}
          </Button>
          <Button type="button" variant="danger" fullWidth onClick={onLogout}>
            Sair da conta
          </Button>
        </div>
      </form>
    </div>
  );
}
