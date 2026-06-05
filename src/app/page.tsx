'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Shield, TrendingUp, Star, StarOff, ExternalLink,
  Loader2, AlertTriangle, CheckCircle2, XCircle, Flame,
  Eye, Zap, ChevronDown, ChevronUp, Heart, BookmarkPlus,
  BookmarkCheck, RefreshCw, ArrowRight, Info, Tag, Clock,
  Calendar, MessageSquare, Users, BarChart3, Sparkles,
  ShieldCheck, ShieldAlert, ShieldX
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
function formatNum(n: number): string {
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
  
  // Trends state
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [trendCategory, setTrendCategory] = useState('');
  
  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Search subreddits
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.subreddits) {
        setSearchResults(data.subreddits);
        if (data.subreddits.length === 0) {
          toast.info('No se encontraron comunidades para esa búsqueda');
        }
      } else {
        toast.error('Error al buscar comunidades');
      }
    } catch (e) {
      toast.error('Error de conexión al buscar');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Load rules for a subreddit
  const handleLoadRules = useCallback(async (sub: Subreddit) => {
    setSelectedSub(sub);
    setIsLoadingRules(true);
    setRules([]);
    setSummaryEs('');
    setExpandedRule(null);
    setActiveTab('rules');
    try {
      const res = await fetch(`/api/subreddit/rules?subreddit=${encodeURIComponent(sub.name)}`);
      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
        setSummaryEs(data.summaryEs || '');
        if (data.subreddit) {
          setSelectedSub(prev => ({ ...prev, ...data.subreddit }));
        }
        toast.success(`Reglas de r/${sub.name} cargadas y traducidas`);
      } else {
        toast.error(data.error || 'Error al cargar reglas');
      }
    } catch (e) {
      toast.error('Error de conexión al cargar reglas');
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

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
                      placeholder="Buscá un fetiche o nicho... (ej: feet, findom, cosplay)"
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
                  {['feet', 'findom', 'cosplay', 'ASMR', 'femdom', 'lingerie', 'roleplay', 'latex', 'bondage'].map(tag => (
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
                                  {sub.allowPromo === false && (
                                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 gap-0.5">
                                      <XCircle className="w-2.5 h-2.5" /> Sin Promo
                                    </Badge>
                                  )}
                                  {sub.requiresVerify && (
                                    <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/30 gap-0.5">
                                      <ShieldCheck className="w-2.5 h-2.5" /> Verificación
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
                              <div className="flex items-center gap-2 shrink-0">
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
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Analizando reglas de r/{selectedSub?.name}...</p>
                    <p className="text-xs text-muted-foreground mt-1">La IA está traduciendo y clasificando las reglas</p>
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
                                onClick={() => handleLoadRules(selectedSub)}
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

                              {/* Action */}
                              {trend.subredditName && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-2 text-xs"
                                  onClick={() => handleLoadRules({ name: trend.subredditName! } as Subreddit)}
                                >
                                  <Shield className="w-3 h-3" />
                                  Ver reglas de r/{trend.subredditName}
                                </Button>
                              )}
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
