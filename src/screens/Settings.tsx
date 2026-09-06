import React, { useRef, useState } from 'react';
import { Settings as SettingsType, Profile, CustomBankEntry } from '../types';
import { exportData } from '../utils';
import { 
  Moon, 
  Sun, 
  Monitor, 
  Download, 
  Upload, 
  Info, 
  Plus, 
  Trash2, 
  RotateCcw, 
  AlertCircle, 
  Image as ImageIcon, 
  HelpCircle 
} from 'lucide-react';
import { Button, Input } from '../components/ui';
import { BANKS_BASE, cleanImageUrl } from '../utils/banks';
import { v4 as uuidv4 } from 'uuid';

interface SettingsScreenProps {
  settings: SettingsType;
  onUpdateSettings: (settings: SettingsType) => void;
  fullData: any;
  onImportData: (data: string) => boolean;
  profile?: Profile;
  onUpdateProfile?: (profile: Profile) => void;
  isAdmin?: boolean;
}

export function SettingsScreen({ 
  settings, 
  onUpdateSettings, 
  fullData, 
  onImportData,
  profile,
  onUpdateProfile,
  isAdmin = false
}: SettingsScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'bancos'>('geral');
  const [customBanks, setCustomBanks] = useState<Record<string, string>>(profile?.customBanks || {});
  const [extraBanks, setExtraBanks] = useState<CustomBankEntry[]>(profile?.extraBanks || []);
  const [bankErrors, setBankErrors] = useState<Record<string, boolean>>({});
  const [newBankLogoError, setNewBankLogoError] = useState(false);
  const bankFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const extraBankFileInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  // New bank form state
  const [newBankName, setNewBankName] = useState('');
  const [newBankLogo, setNewBankLogo] = useState('');
  const [newBankColor, setNewBankColor] = useState('#6366f1');

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (onImportData(content)) {
          alert('Dados importados com sucesso!');
        } else {
          alert('Erro ao importar arquivo. Certifique-se de que é um backup válido do Reserva Já.');
        }
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveBanks = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile && onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        customBanks,
        extraBanks,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleBankFileUpload = (bankId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCustomBanks(prev => ({
          ...prev,
          [bankId]: base64,
        }));
        setBankErrors(prev => {
          const copy = { ...prev };
          delete copy[bankId];
          return copy;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetBank = (bankId: string) => {
    setCustomBanks(prev => {
      const copy = { ...prev };
      delete copy[bankId];
      return copy;
    });
    setBankErrors(prev => {
      const copy = { ...prev };
      delete copy[bankId];
      return copy;
    });
  };

  const handleExtraBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setNewBankLogo(base64);
        setNewBankLogoError(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddExtraBank = () => {
    if (!newBankName.trim() || !newBankLogo.trim()) {
      alert('Preencha o nome e a URL da logo do banco.');
      return;
    }
    const id = `custom_${uuidv4().slice(0, 8)}`;
    const newBank = {
      id,
      name: newBankName.trim(),
      logoUrl: cleanImageUrl(newBankLogo.trim()),
      color: newBankColor,
    };
    
    const newExtraBanks = [...extraBanks, newBank];
    setExtraBanks(newExtraBanks);
    
    if (profile && onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        customBanks,
        extraBanks: newExtraBanks,
      });
    }

    setNewBankName('');
    setNewBankLogo('');
    setNewBankColor('#6366f1');
    setNewBankLogoError(false);
  };

  const handleRemoveExtraBank = (id: string) => {
    const newExtraBanks = extraBanks.filter(b => b.id !== id);
    setExtraBanks(newExtraBanks);
    
    if (profile && onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        customBanks,
        extraBanks: newExtraBanks,
      });
    }
  };

  return (
    <div className="mx-auto max-w-xl pb-24 md:pb-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          ⚙️ Configurações
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personalize sua experiência no Reserva Já.
        </p>
      </header>

      {isAdmin && (
        <div className="mb-6 flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'geral' 
                ? 'border-green-500 text-green-600 dark:text-green-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('geral')}
          >
            Geral
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'bancos' 
                ? 'border-green-500 text-green-600 dark:text-green-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('bancos')}
          >
            Imagens dos Bancos (Admin)
          </button>
        </div>
      )}

      {activeTab === 'geral' ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aparência</h2>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  settings.theme === 'light'
                    ? 'border-[#00C853] bg-green-50 text-[#00C853] dark:bg-green-900/20'
                    : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300'
                }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm font-medium">Claro</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  settings.theme === 'dark'
                    ? 'border-[#00C853] bg-green-50 text-[#00C853] dark:bg-green-900/20'
                    : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300'
                }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm font-medium">Escuro</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ...settings, theme: 'system' })}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  settings.theme === 'system'
                    ? 'border-[#00C853] bg-green-50 text-[#00C853] dark:bg-green-900/20'
                    : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300'
                }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm font-medium">Sistema</span>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Backup e Dados</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Salve suas metas para não perder nada ou importe um backup anterior.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => exportData(fullData)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Backup
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleImportClick}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Backup
                </Button>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-50 p-2 text-blue-500 dark:bg-blue-900/20">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Sobre o Reserva Já</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Versão 1.0.0<br/>
                  Um aplicativo PWA moderno e offline-first para te ajudar a atingir seus objetivos financeiros.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <form onSubmit={handleSaveBanks} className="space-y-6">

          {/* ── Guia de instruções ── */}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-200/60 p-4 dark:bg-blue-900/20 dark:border-blue-800/50 text-sm space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200">
              <HelpCircle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Dicas para adicionar ou alterar imagens dos bancos</span>
            </div>
            <ul className="text-xs text-blue-800/90 dark:text-blue-300 list-disc list-inside space-y-1.5 leading-relaxed">
              <li>
                <strong>Fazer upload direto (Recomendado):</strong> Clique no botão <strong>📁 Enviar Foto</strong> para selecionar um arquivo PNG, JPG ou SVG direto do seu computador/celular.
              </li>
              <li>
                <strong>Ao pegar no Google:</strong> Clique com o <u>botão direito</u> na imagem no Google e selecione <strong>"Copiar endereço da imagem"</strong> (não copie o link da página do site).
              </li>
              <li>
                <strong>Voltar ao original:</strong> Deixe o campo em branco ou clique no botão <strong>🔄 Padrão</strong> para usar a logo oficial do aplicativo.
              </li>
            </ul>
          </div>

          {/* ── Bancos padrão ── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Logos dos bancos padrão</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Personalize a imagem de cada banco colando o link direto ou enviando uma imagem do computador.
            </p>
            {BANKS_BASE.map(bank => {
              const currentUrl = customBanks?.[bank.id] || bank.logoUrl;
              const hasCustom = Boolean(customBanks?.[bank.id]);
              const hasError = Boolean(bankErrors[bank.id]);

              return (
                <div key={bank.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-1/3 shrink-0">
                      <div 
                        className={`h-11 w-11 shrink-0 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center p-1 shadow-sm relative overflow-hidden transition-all ${
                          hasError ? 'border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''
                        }`} 
                        style={{ border: hasError ? undefined : `1px solid ${bank.color}44` }}
                      >
                        {hasError ? (
                          <AlertCircle className="w-5 h-5 text-amber-500" title="Falha ao carregar imagem" />
                        ) : (
                          <img 
                            src={currentUrl} 
                            alt={bank.name} 
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain"
                            onError={() => {
                              setBankErrors(prev => ({ ...prev, [bank.id]: true }));
                            }}
                            onLoad={() => {
                              setBankErrors(prev => {
                                if (!prev[bank.id]) return prev;
                                const copy = { ...prev };
                                delete copy[bank.id];
                                return copy;
                              });
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{bank.name}</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {hasCustom ? 'Personalizada' : 'Padrão'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-2 w-full">
                      <div className="flex-1">
                        <Input
                          label=""
                          value={customBanks?.[bank.id] || ''}
                          placeholder="Cole a URL da imagem ou deixe vazio para padrão"
                          onChange={(e) => {
                            const cleaned = cleanImageUrl(e.target.value);
                            setCustomBanks(prev => ({
                              ...prev,
                              [bank.id]: cleaned
                            }));
                            setBankErrors(prev => {
                              const copy = { ...prev };
                              delete copy[bank.id];
                              return copy;
                            });
                          }}
                        />
                      </div>

                      {/* Botão Upload do computador */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={el => { bankFileInputRefs.current[bank.id] = el; }}
                        className="hidden"
                        onChange={(e) => handleBankFileUpload(bank.id, e)}
                      />
                      <button
                        type="button"
                        onClick={() => bankFileInputRefs.current[bank.id]?.click()}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shrink-0"
                        title="Enviar imagem do computador"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      {/* Botão Restaurar Padrão */}
                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetBank(bank.id)}
                          className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-900/20 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 transition-colors shrink-0"
                          title="Restaurar imagem padrão original"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mensagem de erro caso a URL não carregue */}
                  {hasError && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Não foi possível carregar a imagem deste link. Certifique-se de copiar o <strong>"Endereço da imagem"</strong> (.png, .jpg) ou clique no ícone <ImageIcon className="w-3.5 h-3.5 inline mx-0.5" /> para enviar do seu computador.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Bancos extras ── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bancos extras (personalizados)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adicione outros bancos que não constam na lista padrão. Eles aparecerão na seleção ao criar ou editar uma meta.
            </p>

            {/* List of extra banks */}
            {extraBanks.length > 0 && (
              <div className="space-y-2">
                {extraBanks.map(bank => (
                  <div key={bank.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center p-1 shadow-sm overflow-hidden"
                      style={{ border: `1px solid ${bank.color}44` }}
                    >
                      <img
                        src={bank.logoUrl}
                        alt={bank.name}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{bank.name}</p>
                      <p className="text-xs text-gray-400 truncate">{bank.logoUrl.startsWith('data:') ? '[Imagem do Computador]' : bank.logoUrl}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: bank.color }} title={bank.color} />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraBank(bank.id)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                      title="Remover banco"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new bank form */}
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Adicionar novo banco</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddExtraBank();
                }
              }}>
                <Input
                  label="Nome do banco"
                  placeholder="Ex: Banco XYZ"
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        label="URL da logo ou Enviar Imagem"
                        placeholder="https://... ou escolha um arquivo"
                        value={newBankLogo.startsWith('data:') ? '[Imagem Selecionada do Computador]' : newBankLogo}
                        onChange={e => {
                          setNewBankLogo(cleanImageUrl(e.target.value));
                          setNewBankLogoError(false);
                        }}
                      />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={extraBankFileInputRef}
                      className="hidden"
                      onChange={handleExtraBankFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => extraBankFileInputRef.current?.click()}
                      className="mt-6 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shrink-0"
                      title="Enviar imagem do computador"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor do banco</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBankColor}
                      onChange={e => setNewBankColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{newBankColor}</span>
                  </div>
                </div>
                {/* Preview */}
                {newBankLogo && (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400">Preview</p>
                    <div
                      className="h-10 w-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center p-1 shadow-sm overflow-hidden"
                      style={{ border: `2px solid ${newBankColor}` }}
                    >
                      {newBankLogoError ? (
                        <AlertCircle className="w-5 h-5 text-amber-500" title="Link inválido" />
                      ) : (
                        <img 
                          src={newBankLogo} 
                          alt="preview" 
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                          onError={() => setNewBankLogoError(true)}
                          onLoad={() => setNewBankLogoError(false)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddExtraBank}
                className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar banco
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" fullWidth>
              {saved ? '✅ Salvo com sucesso!' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

