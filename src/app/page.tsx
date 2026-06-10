'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Shield, TrendingUp, Star, StarOff, ExternalLink,
  Loader2, AlertTriangle, CheckCircle2, XCircle, Flame,
  Eye, Zap, ChevronDown, ChevronUp, Heart, BookmarkPlus,
  BookmarkCheck, RefreshCw, ArrowRight, Info, Tag, Clock,
  Calendar, MessageSquare, Users, BarChart3, Sparkles,
  ShieldCheck, ShieldAlert, ShieldX, Wifi, WifiOff, DollarSign,
  CreditCard
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Types
interface Subreddit {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  subscribers: number;
  over18: boolean;
  allowPromo?: boolean | null;
  requiresVerify?: boolean | null;
  postLimit?: string | null;
  promoDays?: string | null;
  iconUrl?: string | null;
  url?: string;
}

interface Rule {
  id?: string;
  ruleName: string;
  ruleTextOriginal: string;
  ruleTextEs: string;
  category?: string | null;
  isKeyRule: boolean;
  keyRuleType?: string | null;
  aiExplanation?: string;
}

interface TrendItem {
  id?: string;
  fetishName: string;
  category?: string;
  growthPercent: number;
  memberCount: number;
  opportunityScore: number;
  competitionLevel: string;
  isEmerging: boolean;
  subredditName?: string;
  subreddit?: Subreddit;
}

interface FavoriteItem {
  id: string;
  note: string;
  tags: string;
  subreddit: Subreddit & { rules: Rule[] };
}

// Helper: format number
function formatNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// Helper: get rule type icon and color
function getRuleTypeInfo(type: string | null | undefined) {
  switch (type) {
    case 'promo':
      return { icon: MegaphoneIcon, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Promo' };
    case 'verification':
      return { icon: ShieldCheck, color: 'text-sky-400', bg: 'bg-sky-400/10', label: 'Verificación' };
    case 'post_limit':
      return { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Límite Posts' };
    case 'restricted_days':
      return { icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Días Restringidos' };
    case 'flair':
      return { icon: Tag, color: 'text-pink-400', bg: 'bg-pink-400/10', label: 'Flair Requerido' };
    case 'title_format':
      return { icon: MessageSquare, color: 'text-teal-400', bg: 'bg-teal-400/10', label: 'Formato Título' };
    default:
      return { icon: Info, color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: 'Otra' };
  }
}

// Custom megaphone icon
function MegaphoneIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 11 18-5v12L3 13v-2Z"/>
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  );
}

// Competition badge
function CompetitionBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; icon: any; label: string }> = {
    baja: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, label: 'Baja' },
    media: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle, label: 'Media' },
    alta: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Flame, label: 'Alta' },
    saturada: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Saturada' },
    unknown: { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: Info, label: 'Desconocida' },
  };
  const c = config[level] || config.unknown;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`${c.color} gap-1`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  );
}

// ============ MAIN APP ============

export default function Home() {
  const [activeTab, setActiveTab] = useState('search');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Subreddit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Rules state
  const [selectedSub, setSelectedSub] = useState<Subreddit | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [summaryEs, setSummaryEs] = useState('');
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [isEstimatedRules, setIsEstimatedRules] = useState(false);
  const [dataSource, setDataSource] = useState<'reddit_oauth' | 'reddit_real' | 'reddit_real_no_translate' | 'ai_translation' | 'ai_estimated' | 'fallback' | null>(null);
  const [loadingStep, setLoadingStep] = useState(0); // 0=fetching, 1=analyzing, 2=translating
  const [redditFetchStatus, setRedditFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'failed'>('idle');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualPasteText, setManualPasteText] = useState('');
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  
  // Trends state
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [trendCategory, setTrendCategory] = useState('');
  
  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Load rules for a subreddit (defined BEFORE handleSearch since it's used by it)
  // NEW: Try client-side Reddit fetch FIRST (browser can access Reddit, Vercel can't)
  const handleLoadRules = useCallback(async (sub: Subreddit, forceFresh: boolean = false) => {
    setSelectedSub(sub);
    setIsLoadingRules(true);
    setRules([]);
    setSummaryEs('');
    setExpandedRule(null);
    setIsEstimatedRules(false);
    setDataSource(null);
    setLoadingStep(0);
    setRedditFetchStatus('idle');
    setShowManualPaste(false);
    setManualPasteText('');
    setActiveTab('rules');

    // Animate loading steps
    const step1Timer = setTimeout(() => setLoadingStep(1), 2000);
    const step2Timer = setTimeout(() => setLoadingStep(2), 5000);

    const processResult = (data: any) => {
      if (data.rules && data.rules.length > 0) {
        setRules(data.rules);
        setSummaryEs(data.summaryEs || '');
        const ds = data.dataSource || null;
        setDataSource(ds);
        const isEstimated = ds === 'ai_estimated' || ds === 'fallback';
        const isVerified = ds === 'reddit_oauth' || ds === 'reddit_real';
        setIsEstimatedRules(isEstimated);
        if (data.subreddit) {
          const apiSubs = data.subreddit.subscribers || 0;
          setSelectedSub(prev => ({ 
            ...prev, 
            ...data.subreddit,
            subscribers: apiSubs > 0 ? apiSubs : prev.subscribers || 0,
          }));
        }
        if (ds === 'reddit_oauth') {
          toast.success(`Reglas REALES de r/${sub.name} obtenidas via Reddit OAuth API y traducidas`);
        } else if (ds === 'reddit_real') {
          toast.success(`Reglas REALES de r/${sub.name} obtenidas de Reddit y traducidas`);
        } else if (ds === 'reddit_real_no_translate') {
          toast.success(`Reglas REALES de r/${sub.name} obtenidas de Reddit (sin traducir)`);
        } else if (isEstimated) {
          toast.warning(`Reglas de r/${sub.name} ESTIMADAS por IA — pueden ser incorrectas. Verificá en Reddit.`);
        } else {
          toast.success(`Reglas de r/${sub.name} cargadas`);
        }
      } else if (data.error) {
        toast.error(data.error || 'Error al cargar reglas');
      } else {
        toast.error('No se encontraron reglas para este subreddit');
      }
    };

    try {
      // STEP 0: If forceFresh, purge old cached data first
      if (forceFresh) {
        await fetch(`/api/subreddit/rules?subreddit=${encodeURIComponent(sub.name)}`, { method: 'DELETE' }).catch(() => {});
      }

      // STEP 1: Try fetching Reddit data via our server proxy + CORS proxies
      setRedditFetchStatus('fetching');
      try {
        const { fetchRedditFromBrowser } = await import('@/lib/reddit-client');
        const redditResult = await fetchRedditFromBrowser(sub.name);
        
        if (redditResult && (redditResult.about || redditResult.rules.length > 0)) {
          setRedditFetchStatus('success');
          // Got real data from Reddit! Send to our API for AI translation
          const res = await fetch('/api/subreddit/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subreddit: sub.name,
              about: redditResult.about,
              rules: redditResult.rules,
            }),
          });
          
          clearTimeout(step1Timer);
          clearTimeout(step2Timer);
          
          if (res.ok) {
            const data = await res.json();
            processResult(data);
            return;
          }
        }
      } catch (clientErr) {
        console.log('Client-side Reddit fetch failed:', clientErr);
      }
      
      setRedditFetchStatus('failed');

      // STEP 2: Client-side fetch failed — fall back to server API (force=true to skip cache)
      const res = await fetch(`/api/subreddit/rules?subreddit=${encodeURIComponent(sub.name)}&force=true`);
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      processResult(data);
    } catch (e) {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      toast.error('Error de conexión al cargar reglas — intentá de nuevo');
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  // Handle manual paste of rules (supports both JSON and plain text)
  const handleManualPaste = useCallback(async () => {
    if (!manualPasteText.trim() || !selectedSub) return;
    setIsProcessingManual(true);
    
    try {
      let rulesToSend: { short_name: string; description: string }[] = [];
      let aboutToSend: any = null;
      
      // Try to parse as JSON first (user pasted from rules.json or about.json)
      const trimmed = manualPasteText.trim();
      try {
        const jsonData = JSON.parse(trimmed);
        
        // Check if it's Reddit rules.json format: { "rules": [...] }
        if (jsonData.rules && Array.isArray(jsonData.rules)) {
          rulesToSend = jsonData.rules
            .filter((r: any) => r.short_name || r.description)
            .map((r: any) => ({
              short_name: r.short_name || 'Regla',
              description: r.description || '',
            }));
          console.log(`[manual-paste] Parsed JSON rules: ${rulesToSend.length} rules found`);
        }
        // Check if it's Reddit about.json format: { "data": { ... } }
        else if (jsonData.data && typeof jsonData.data === 'object') {
          aboutToSend = jsonData.data;
          console.log(`[manual-paste] Parsed JSON about data for r/${aboutToSend.display_name || selectedSub.name}`);
        }
        // Check if it's a direct array of rules
        else if (Array.isArray(jsonData)) {
          rulesToSend = jsonData
            .filter((r: any) => r.short_name || r.description || r.name)
            .map((r: any) => ({
              short_name: r.short_name || r.name || 'Regla',
              description: r.description || r.textOriginal || '',
            }));
          console.log(`[manual-paste] Parsed JSON array: ${rulesToSend.length} rules found`);
        }
      } catch {
        // Not valid JSON — parse as plain text
        console.log('[manual-paste] Not JSON, parsing as plain text...');
      }
      
      // If JSON didn't yield rules, try plain text parsing
      if (rulesToSend.length === 0 && !aboutToSend) {
        const { parseManualRules } = await import('@/lib/reddit-client');
        const parsedRules = parseManualRules(manualPasteText);
        
        if (parsedRules.length === 0) {
          toast.error('No se pudieron detectar reglas. Pegá el JSON de rules.json o las reglas en texto plano.');
          return;
        }
        
        rulesToSend = parsedRules.map(r => ({ short_name: r.name, description: r.textOriginal }));
      }
      
      if (rulesToSend.length === 0 && !aboutToSend) {
        toast.error('No se encontraron reglas en lo que pegaste. Probá pegar el contenido de rules.json desde Reddit.');
        return;
      }

      // Send to API for AI translation
      const res = await fetch('/api/subreddit/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddit: selectedSub.name,
          about: aboutToSend,
          rules: rulesToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rules && data.rules.length > 0) {
          setRules(data.rules);
          setSummaryEs(data.summaryEs || '');
          setDataSource(data.dataSource);
          setIsEstimatedRules(data.dataSource === 'ai_estimated' || data.dataSource === 'fallback');
          if (data.subreddit) {
            setSelectedSub(prev => ({ ...prev, ...data.subreddit }));
          }
          toast.success(`${data.rules.length} reglas REALES de r/${selectedSub.name} procesadas y traducidas!`);
          setShowManualPaste(false);
          setManualPasteText('');
        } else if (aboutToSend && !data.rules?.length) {
          // Got about data but no rules — at least update the subreddit info
          if (data.subreddit) {
            setSelectedSub(prev => ({ ...prev, ...data.subreddit }));
          }
          toast.info('Info del subreddit actualizada, pero no se encontraron reglas. Probá pegar el JSON de rules.json.');
        }
      } else {
        toast.error('Error al procesar las reglas. Intentá de nuevo.');
      }
    } catch (e) {
      console.error('Manual paste error:', e);
      toast.error('Error al procesar las reglas pegadas');
    } finally {
      setIsProcessingManual(false);
    }
  }, [manualPasteText, selectedSub]);

  // Search subreddits
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    // Detect direct subreddit input: "r/feet", "/r/feet", "r/feet/" etc.
    const directMatch = searchQuery.trim().match(/^\/?r\/([a-zA-Z0-9_]+)\/?$/);

    // If it's a direct r/name format, go straight to rules
    if (directMatch) {
      const subName = directMatch[1];
      toast.info(`Cargando r/${subName} directo...`);
      handleLoadRules({ name: subName } as Subreddit);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=30`);
      const data = await res.json();
      if (data.subreddits) {
        setSearchResults(data.subreddits);
        
        const cleanQuery = searchQuery.trim().toLowerCase();
        const isSingleWord = /^[a-zA-Z0-9_]+$/.test(cleanQuery);
        
        // If it's a single word (potential subreddit name) and we find an exact match, auto-load it
        if (isSingleWord && data.subreddits.length > 0) {
          const exactMatch = data.subreddits.find((s: any) => s.name.toLowerCase() === cleanQuery);
          if (exactMatch) {
            // Auto-load rules for exact match
            toast.success(`Encontré r/${exactMatch.name} — cargando reglas...`);
            handleLoadRules(exactMatch as Subreddit);
            return;
          }
          // If the search returned an unverified result (synthetic entry from API), auto-load it
          const unverifiedResult = data.subreddits.find((s: any) => s.isUnverified);
          if (unverifiedResult) {
            toast.info(`Cargando r/${cleanQuery} — la IA va a generar las reglas...`);
            handleLoadRules(unverifiedResult as Subreddit);
            return;
          }
        }
        
        if (data.subreddits.length === 0) {
          toast.info('No se encontraron comunidades — probá con otra palabra');
        }
      } else {
        toast.error('Error al buscar comunidades');
      }
    } catch (e) {
      toast.error('Error de conexión al buscar');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, handleLoadRules]);

  // Load trends
  const handleLoadTrends = useCallback(async (category?: string) => {
    setIsLoadingTrends(true);
    try {
      const url = `/api/trends${category ? `?category=${encodeURIComponent(category)}` : '?limit=10'}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.trends) {
        setTrends(data.trends);
        toast.success(`${data.trends.length} tendencias detectadas`);
      } else {
        toast.error(data.error || 'Error al cargar tendencias');
      }
    } catch (e) {
      toast.error('Error de conexión al cargar tendencias');
    } finally {
      setIsLoadingTrends(false);
    }
  }, []);

  // Load favorites
  const handleLoadFavorites = useCallback(async () => {
    setIsLoadingFavorites(true);
    try {
      const res = await fetch('/api/favorites');
      const data = await res.json();
      if (data.favorites) {
        setFavorites(data.favorites);
      }
    } catch (e) {
      toast.error('Error al cargar favoritos');
    } finally {
      setIsLoadingFavorites(false);
    }
  }, []);

  // Toggle favorite
  const handleToggleFavorite = useCallback(async (sub: Subreddit) => {
    if (!sub.id) {
      toast.error('Primero cargá las reglas para guardar este subreddit');
      return;
    }
    const isFav = favorites.some(f => f.subreddit.id === sub.id);
    try {
      if (isFav) {
        await fetch(`/api/favorites?subredditId=${sub.id}`, { method: 'DELETE' });
        setFavorites(prev => prev.filter(f => f.subreddit.id !== sub.id));
        toast.success(`r/${sub.name} eliminado de favoritos`);
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subredditId: sub.id }),
        });
        handleLoadFavorites();
        toast.success(`r/${sub.name} guardado en favoritos`);
      }
    } catch (e) {
      toast.error('Error al actualizar favoritos');
    }
  }, [favorites, handleLoadFavorites]);

  const isFavorited = (subName: string) => favorites.some(f => f.subreddit.name === subName);

  // Handle payment flow
  const handlePayment = useCallback(async (provider: 'stripe' | 'mercadopago', planType: string) => {
    setIsProcessingPayment(true);
    try {
      // Get or create anon ID
      let anonId = '';
      if (typeof window !== 'undefined') {
        anonId = localStorage.getItem('rrs_anon_id') || '';
        if (!anonId) {
          anonId = 'anon_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem('rrs_anon_id', anonId);
        }
      }

      const endpoint = provider === 'stripe' ? '/api/stripe/checkout' : '/api/mercadopago/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonId, planType }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to payment page
        window.location.href = data.url;
      } else {
        toast.error('Error al iniciar el pago. Intentá de nuevo.');
      }
    } catch (e) {
      console.error('Payment error:', e);
      toast.error('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsProcessingPayment(false);
    }
  }, []);

  // Check checkout status on load
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get('checkout');
      if (checkout === 'success') {
        toast.success('¡Pago exitoso! Tu cuenta fue actualizada a Pro.');
        setUserPlan('pro');
        window.history.replaceState({}, '', '/');
      } else if (checkout === 'cancelled') {
        toast.info('Pago cancelado.');
        window.history.replaceState({}, '', '/');
      } else if (checkout === 'pending') {
        toast.info('Pago pendiente. Te notificaremos cuando se confirme.');
        window.history.replaceState({}, '', '/');
      } else if (checkout === 'error') {
        toast.error('Hubo un error con el pago. Contactanos.');
        window.history.replaceState({}, '', '/');
      }
    }
  });

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">Reddit Rule Scanner</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">Para Creadores de Contenido</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                <Sparkles className="w-3 h-3" /> IA Powered
              </Badge>
              {userPlan === 'pro' ? (
                <Badge className="text-xs gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Zap className="w-3 h-3" /> PRO
                </Badge>
              ) : (
                <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 text-xs h-7">
                      <Zap className="w-3 h-3" /> Pro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg bg-card border-border/50">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        Desbloqueá Reddit Rule Scanner Pro
                      </DialogTitle>
                      <DialogDescription>
                        Acceso ilimitado a reglas reales, traducciones y exportaciones
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {/* Free Tier */}
                      <div className="p-4 rounded-lg border border-border/50 bg-background/50 opacity-70">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">Gratis</h4>
                            <p className="text-xs text-muted-foreground">5 búsquedas/día, 3 reglas/día</p>
                          </div>
                          <span className="text-sm font-bold">$0</span>
                        </div>
                      </div>
                      {/* Monthly */}
                      <div className="p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/5 relative">
                        <Badge className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] border-0">POPULAR</Badge>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-400" /> Pro Mensual
                            </h4>
                            <p className="text-xs text-muted-foreground">Ilimitado — cancelá cuando quieras</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">$9.99</span>
                            <span className="text-xs text-muted-foreground">/mes</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs"
                            disabled={isProcessingPayment}
                            onClick={() => handlePayment('stripe', 'pro_monthly')}
                          >
                            {isProcessingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                            Tarjeta (Stripe)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-sky-500/50 text-sky-400 hover:bg-sky-500/10 text-xs"
                            disabled={isProcessingPayment}
                            onClick={() => handlePayment('mercadopago', 'pro_monthly')}
                          >
                            {isProcessingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                            MercadoPago
                          </Button>
                        </div>
                      </div>
                      {/* Yearly */}
                      <div className="p-4 rounded-lg border border-border/50 bg-background/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">Pro Anual</h4>
                            <p className="text-xs text-muted-foreground">33% descuento — $6.67/mes</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">$79.99</span>
                            <span className="text-xs text-muted-foreground">/año</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs"
                            disabled={isProcessingPayment}
                            onClick={() => handlePayment('stripe', 'pro_yearly')}
                          >
                            {isProcessingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                            Tarjeta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-sky-500/50 text-sky-400 hover:bg-sky-500/10 text-xs"
                            disabled={isProcessingPayment}
                            onClick={() => handlePayment('mercadopago', 'pro_yearly')}
                          >
                            {isProcessingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                            MercadoPago
                          </Button>
                        </div>
                      </div>
                      {/* Pro features list */}
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-xs font-medium text-emerald-400 mb-2">Todo lo que desbloqueás con Pro:</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            'Búsquedas ilimitadas', 'Reglas ilimitadas', 'Exportar reglas (PDF)', 
                            'Detección de tendencias', 'Sin publicidad', 'Soporte prioritario'
                          ].map(f => (
                            <span key={f} className="text-xs text-foreground/80 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v);
            if (v === 'favorites') {
              setTimeout(() => handleLoadFavorites(), 0);
            }
            if (v === 'trends' && trends.length === 0) {
              setTimeout(() => handleLoadTrends(), 0);
            }
          }}>
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-card border border-border/50">
              <TabsTrigger value="search" className="gap-1.5 text-xs sm:text-sm">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1.5 text-xs sm:text-sm" disabled={!selectedSub}>
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Reglas</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Tendencias</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1.5 text-xs sm:text-sm">
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">Favoritos</span>
              </TabsTrigger>
            </TabsList>

            {/* ===== SEARCH TAB ===== */}
            <TabsContent value="search">
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscá un nicho o ingresá r/subreddit directo... (ej: feet, r/findom, cosplay)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 bg-card border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-w-[100px]"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Buscar
                  </Button>
                </div>

                {/* Quick Tags */}
                <div className="flex flex-wrap gap-2">
                  {['latina', 'feet', 'findom', 'cosplay', 'ASMR', 'femdom', 'lingerie', 'roleplay', 'latex', 'bondage', 'JOI', 'chastity', 'BBW', 'thick', 'smoking', 'goth', 'hotwife', 'OnlyFans', 'dommes'].map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                      onClick={() => { setSearchQuery(tag); }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Results */}
                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Buscando comunidades...</p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                      {searchResults.length} comunidades encontradas
                    </p>
                    <AnimatePresence mode="popLayout">
                      {searchResults.map((sub, i) => (
                        <motion.div
                          key={sub.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Card className="bg-card/80 border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                            onClick={() => handleLoadRules(sub)}>
                            <CardContent className="p-4 flex items-start gap-4">
                              {/* Subreddit Icon */}
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {sub.iconUrl ? (
                                  <img src={sub.iconUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-bold text-primary">
                                    {sub.name[0]?.toUpperCase()}
                                  </span>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    r/{sub.name}
                                  </h3>
                                  {sub.over18 && (
                                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                                      NSFW
                                    </Badge>
                                  )}
                                  {sub.allowPromo === true && (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Promo OK
                                    </Badge>
                                  )}
                                </div>
                                {sub.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {sub.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {formatNum(sub.subscribers)} members
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                      <a href={`https://reddit.com/r/${sub.name}`} target="_blank" rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink className="w-4 h-4 text-orange-400 hover:text-orange-300" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Abrir en Reddit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(sub);
                                      }}
                                    >
                                      {isFavorited(sub.name) ? (
                                        <BookmarkCheck className="w-4 h-4 text-primary" />
                                      ) : (
                                        <BookmarkPlus className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isFavorited(sub.name) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                                  </TooltipContent>
                                </Tooltip>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {!isSearching && searchResults.length === 0 && !searchQuery && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Search className="w-10 h-10 text-primary/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Buscá comunidades en Reddit</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Ingresá un fetiche, nicho o palabra clave y encontrá subreddits relevantes. 
                        La IA va a traducir y analizar las reglas por vos.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== RULES TAB ===== */}
            <TabsContent value="rules">
              {isLoadingRules && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      Cargando r/{selectedSub?.name}
                    </p>
                    <div className="space-y-1">
                      <motion.p
                        key={loadingStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-muted-foreground"
                      >
                        {loadingStep === 0 && '🔍 Conectando con Reddit para obtener reglas reales...'}
                        {loadingStep === 1 && '🤖 Traduciendo reglas reales al español con IA...'}
                        {loadingStep === 2 && '🌐 Finalizando — puede tardar si es la primera vez...'}
                      </motion.p>
                      <p className="text-xs text-muted-foreground/60">
                        Puede tardar unos segundos si es la primera vez que se carga este subreddit
                      </p>
                    </div>
                  </div>
                  <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: '10%' }}
                      animate={{ width: loadingStep === 0 ? '30%' : loadingStep === 1 ? '60%' : '85%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {!isLoadingRules && selectedSub && (
                <div className="space-y-6">
                  {/* Subreddit Header */}
                  <Card className="bg-card/80 border-border/50">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedSub.iconUrl ? (
                            <img src={selectedSub.iconUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold text-primary">
                              {selectedSub.name[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold">r/{selectedSub.name}</h2>
                            {selectedSub.over18 && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">NSFW</Badge>
                            )}
                          </div>
                          {selectedSub.displayName && (
                            <p className="text-sm text-muted-foreground mt-0.5">{selectedSub.displayName}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {formatNum(selectedSub.subscribers)} members
                            </span>
                            {selectedSub.allowPromo !== null && selectedSub.allowPromo !== undefined && (
                              <span className={`flex items-center gap-1 ${selectedSub.allowPromo ? 'text-emerald-400' : 'text-red-400'}`}>
                                {selectedSub.allowPromo ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {selectedSub.allowPromo ? 'Permite promo' : 'No permite promo'}
                              </span>
                            )}
                            {selectedSub.requiresVerify && (
                              <span className="flex items-center gap-1 text-sky-400">
                                <ShieldCheck className="w-4 h-4" /> Requiere verificación
                              </span>
                            )}
                          </div>
                          {summaryEs && (
                            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                              <p className="text-sm text-foreground/90 flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                {summaryEs}
                              </p>
                            </div>
                          )}
                          {/* Data Source Indicator — ALWAYS show so user knows where data comes from */}
                          {dataSource === 'reddit_oauth' && (
                            <div className="mt-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <p className="text-xs text-emerald-400 flex items-start gap-2">
                                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Reglas verificadas via Reddit OAuth API.</strong> Estas son las reglas REALES de Reddit, obtenidas con autenticación oficial y traducidas por IA. La información es 100% confiable.
                                </span>
                              </p>
                            </div>
                          )}
                          {dataSource === 'reddit_real' && (
                            <div className="mt-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <p className="text-xs text-emerald-400 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                Reglas REALES obtenidas directamente de Reddit y traducidas por IA. La información de reglas es confiable.
                              </p>
                            </div>
                          )}
                          {dataSource === 'reddit_real_no_translate' && (
                            <div className="mt-2 p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
                              <p className="text-xs text-sky-400 flex items-start gap-2">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                Reglas REALES de Reddit (sin traducir — la IA no pudo traducirlas en este momento). La información es confiable pero está en inglés.
                              </p>
                            </div>
                          )}
                          {(dataSource === 'ai_estimated' || dataSource === 'fallback') && (
                            <div className="mt-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                              <p className="text-xs text-amber-400 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                  <strong>No pudimos obtener las reglas reales de Reddit.</strong> Estas reglas fueron ESTIMADAS por IA y PUEDEN SER INCORRECTAS. 
                                  Verificá las reglas oficiales en Reddit antes de postear. 
                                  <button 
                                    className="underline font-medium hover:text-amber-300 ml-1"
                                    onClick={() => handleLoadRules(selectedSub, true)}
                                  >
                                    Intentar de nuevo
                                  </button>
                                </span>
                              </p>
                            </div>
                          )}
                          {dataSource === null && rules.length > 0 && (
                            <div className="mt-2 p-3 rounded-lg bg-zinc-500/5 border border-zinc-500/20">
                              <p className="text-xs text-zinc-400 flex items-start gap-2">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                Fuente de datos desconocida. Verificá las reglas oficiales en Reddit.
                              </p>
                            </div>
                          )}
                          {/* GET REAL RULES — always show this option */}
                          {!showManualPaste && (
                            <div className="mt-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-emerald-400">Obtener reglas REALES de Reddit</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Reddit bloquea nuestra conexión desde el servidor. Pero tu navegador puede acceder directamente. 
                                    Seguí estos 3 pasos para obtener las reglas 100% reales y traducirlas:
                                  </p>
                                  <div className="mt-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center shrink-0 font-bold">1</span>
                                      <div>
                                        <p className="text-xs text-foreground">Abrí el link de Reddit que te damos abajo — se abre en una pestaña nueva</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center shrink-0 font-bold">2</span>
                                      <div>
                                        <p className="text-xs text-foreground">Seleccioná todo el texto (Ctrl+A) y copialo (Ctrl+C)</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center shrink-0 font-bold">3</span>
                                      <div>
                                        <p className="text-xs text-foreground">Volvé acá, hacé click en "Pegar reglas reales" y pegalo (Ctrl+V)</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    <Button
                                      size="sm"
                                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1"
                                      asChild
                                    >
                                      <a href={`https://www.reddit.com/r/${selectedSub.name}/about/rules.json`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3" /> 1. Abrir reglas en Reddit
                                      </a>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1"
                                      asChild
                                    >
                                      <a href={`https://www.reddit.com/r/${selectedSub.name}/about.json`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3" /> 1b. Abrir info del sub
                                      </a>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                      onClick={() => setShowManualPaste(true)}
                                    >
                                      2. Pegar reglas reales
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Paste Area — accepts both JSON and plain text */}
                          {showManualPaste && (
                            <div className="mt-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <p className="text-sm font-medium text-emerald-400">Pegá el JSON o texto de Reddit acá</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Podés pegar el JSON que copiaste de Reddit (funciona automático), o pegar las reglas en texto plano.
                                Si pegás JSON, detectamos las reglas automáticamente.
                              </p>
                              <textarea
                                className="w-full h-36 rounded-lg bg-background border border-border/50 p-3 text-xs font-mono resize-none focus:border-emerald-500/50 focus:outline-none"
                                placeholder='Pegá acá el JSON de rules.json... (ej: {"rules": [{"short_name": "...", "description": "..."}]})&#10;&#10;O pegá las reglas en texto plano:&#10;1. No spam or self-promotion&#10;2. Must be 18+ to post'
                                value={manualPasteText}
                                onChange={(e) => setManualPasteText(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                                  disabled={!manualPasteText.trim() || isProcessingManual}
                                  onClick={handleManualPaste}
                                >
                                  {isProcessingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                  {isProcessingManual ? 'Traduciendo reglas reales...' : 'Procesar y traducir reglas reales'}
                                </Button>
                                <Button
                                  size="sm"
                                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1"
                                  asChild
                                >
                                  <a href={`https://www.reddit.com/r/${selectedSub.name}/about/rules.json`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3 h-3" /> Abrir Reddit de nuevo
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => { setShowManualPaste(false); setManualPasteText(''); }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleFavorite(selectedSub)}
                              >
                                {isFavorited(selectedSub.name) ? (
                                  <BookmarkCheck className="w-5 h-5 text-primary" />
                                ) : (
                                  <BookmarkPlus className="w-5 h-5 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isFavorited(selectedSub.name) ? 'Quitar de favoritos' : 'Guardar'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleLoadRules(selectedSub, true)}
                              >
                                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refrescar reglas</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={`https://reddit.com/r/${selectedSub.name}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir en Reddit</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Key Rules Summary */}
                      {rules.filter(r => r.isKeyRule).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Reglas clave para creadores
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {rules.filter(r => r.isKeyRule).map((rule) => {
                              const typeInfo = getRuleTypeInfo(rule.keyRuleType);
                              const TypeIcon = typeInfo.icon;
                              return (
                                <Badge key={rule.id} variant="outline" className={`${typeInfo.bg} ${typeInfo.color} gap-1`}>
                                  <TypeIcon className="w-3 h-3" />
                                  {rule.ruleName}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Rules List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Todas las reglas ({rules.length})
                    </h3>
                    <AnimatePresence mode="popLayout">
                      {rules.map((rule, i) => {
                        const typeInfo = getRuleTypeInfo(rule.keyRuleType);
                        const TypeIcon = typeInfo.icon;
                        const isExpanded = expandedRule === rule.id;

                        return (
                          <motion.div
                            key={rule.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <Card className={`bg-card/80 border-border/50 overflow-hidden ${rule.isKeyRule ? 'border-l-2 border-l-primary' : ''}`}>
                              <CardContent
                                className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                                onClick={() => setExpandedRule(isExpanded ? null : rule.id!)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center shrink-0`}>
                                    <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium text-sm">{rule.ruleName}</h4>
                                      {rule.isKeyRule && (
                                        <Badge variant="outline" className={`${typeInfo.bg} ${typeInfo.color} text-[10px] gap-0.5`}>
                                          <Zap className="w-2.5 h-2.5" /> {typeInfo.label}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-foreground/90 mt-1">
                                      {rule.ruleTextEs || rule.ruleTextOriginal}
                                    </p>
                                    
                                    <AnimatePresence>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="mt-3 space-y-2">
                                            {rule.aiExplanation && (
                                              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                  <Eye className="w-3 h-3" /> Lo que significa para vos:
                                                </p>
                                                <p className="text-sm text-foreground/90">{rule.aiExplanation}</p>
                                              </div>
                                            )}
                                            {rule.ruleTextOriginal && rule.ruleTextEs && (
                                              <details className="text-xs">
                                                <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                                                  Ver original en inglés
                                                </summary>
                                                <p className="mt-1 text-muted-foreground italic">
                                                  {rule.ruleTextOriginal}
                                                </p>
                                              </details>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                  <div className="shrink-0">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {rules.length === 0 && !isLoadingRules && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Buscá una comunidad para ver sus reglas traducidas</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isLoadingRules && !selectedSub && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-primary/60" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Reglas traducidas con IA</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Buscá una comunidad y hacé clic en ella. La IA va a traducir las reglas al español,
                      identificar las que importan para creadores de contenido, y explicarte cada una.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ===== TRENDS TAB ===== */}
            <TabsContent value="trends">
              <div className="space-y-6">
                {/* Trend Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Filtrar por categoría... (ej: feet, findom)"
                      value={trendCategory}
                      onChange={(e) => setTrendCategory(e.target.value)}
                      className="bg-card border-border/50"
                    />
                  </div>
                  <Button
                    onClick={() => handleLoadTrends(trendCategory || undefined)}
                    disabled={isLoadingTrends}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    {isLoadingTrends ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    Escanear Tendencias
                  </Button>
                </div>

                {/* Loading */}
                {isLoadingTrends && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Escaneando tendencias en Reddit...</p>
                      <p className="text-xs text-muted-foreground mt-1">La IA está analizando fetiches emergentes y nichos en crecimiento</p>
                    </div>
                  </div>
                )}

                {/* Trends Grid */}
                {!isLoadingTrends && trends.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {trends.map((trend, i) => (
                        <motion.div
                          key={trend.id || i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <Card className={`bg-card/80 border-border/50 h-full hover:border-primary/30 transition-all ${trend.isEmerging ? 'border-l-2 border-l-amber-400' : ''}`}>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {trend.fetishName}
                                    {trend.isEmerging && (
                                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] gap-0.5">
                                        <Flame className="w-2.5 h-2.5" /> Emergente
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {trend.category && `Categoría: ${trend.category}`}
                                    {trend.subredditName && ` · r/${trend.subredditName}`}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-2 space-y-3">
                              {/* Opportunity Score */}
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Score de Oportunidad</span>
                                  <span className={`font-bold ${trend.opportunityScore >= 70 ? 'text-emerald-400' : trend.opportunityScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {trend.opportunityScore}/100
                                  </span>
                                </div>
                                <Progress
                                  value={trend.opportunityScore}
                                  className="h-2"
                                />
                              </div>

                              {/* Stats */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                  <p className="text-[10px] text-muted-foreground">Crecimiento</p>
                                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +{trend.growthPercent.toFixed(0)}%
                                  </p>
                                </div>
                                <div className="p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                                  <p className="text-[10px] text-muted-foreground">Competencia</p>
                                  <CompetitionBadge level={trend.competitionLevel} />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                {trend.subredditName && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-2 text-xs"
                                    onClick={() => handleLoadRules({ 
                                      name: trend.subredditName!, 
                                      subscribers: trend.memberCount || trend.subreddit?.subscribers || 0,
                                      over18: true,
                                      displayName: trend.fetishName,
                                    } as Subreddit)}
                                  >
                                    <Shield className="w-3 h-3" />
                                    Ver reglas
                                  </Button>
                                )}
                                {trend.subredditName && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                                    asChild
                                  >
                                    <a href={`https://reddit.com/r/${trend.subredditName}`} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3" />
                                      Reddit
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {!isLoadingTrends && trends.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-10 h-10 text-primary/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Radar de Tendencias</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Escaneá Reddit para descubrir fetiches emergentes, nichos en crecimiento
                        y oportunidades con poca competencia. La IA detecta tendencias que otros no ven.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== FAVORITES TAB ===== */}
            <TabsContent value="favorites">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tus Comunidades Guardadas</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadFavorites}
                    className="gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refrescar
                  </Button>
                </div>

                {isLoadingFavorites && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando favoritos...</p>
                  </div>
                )}

                {!isLoadingFavorites && favorites.length > 0 && (
                  <div className="grid gap-3">
                    {favorites.map((fav) => (
                      <Card key={fav.id} className="bg-card/80 border-border/50 hover:border-primary/30 transition-all">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {fav.subreddit.name[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">r/{fav.subreddit.name}</h4>
                              {fav.subreddit.allowPromo && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Promo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatNum(fav.subreddit.subscribers)} members · {fav.subreddit.rules?.length || 0} reglas
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                              asChild
                            >
                              <a href={`https://reddit.com/r/${fav.subreddit.name}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3" /> Reddit
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleLoadRules(fav.subreddit)}
                            >
                              <Shield className="w-3 h-3" /> Reglas
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={async () => {
                                await fetch(`/api/favorites/${fav.id}`, { method: 'DELETE' });
                                handleLoadFavorites();
                                toast.success('Eliminado de favoritos');
                              }}
                            >
                              <StarOff className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {!isLoadingFavorites && favorites.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Star className="w-10 h-10 text-primary/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Sin favoritos todavía</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Buscá comunidades y guardá las que te interesen. Podés acceder rápido
                        a sus reglas traducidas desde acá.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-background/80 backdrop-blur-xl mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>Reddit Rule Scanner — Traducción inteligente de reglas con IA</p>
            <p className="flex items-center gap-1">
              Hecho con <Heart className="w-3 h-3 text-red-400" /> para creators
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
