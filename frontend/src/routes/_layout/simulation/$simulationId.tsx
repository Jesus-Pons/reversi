import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { SimulationService } from "@/client/sdk.gen"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// Definimos la ruta
export const Route = createFileRoute("/_layout/simulation/$simulationId")({
  component: SimulationDetailsPage,
})

function SimulationDetailsPage() {
  const { simulationId } = Route.useParams()

  const { data: sim, isLoading } = useQuery({
    queryKey: ['simulation_detail', simulationId],
    queryFn: () => {
      if (!simulationId) throw new Error("ID de simulación inválido")
      // Usamos la llamada correcta según tu types.gen.ts
      return SimulationService.getSimulationDetails({ simulationId })
    }
  })

  if (isLoading) return <div className="text-center py-20 animate-pulse text-muted-foreground">Cargando análisis detallado...</div>
  if (!sim) return <div className="text-center py-20 text-red-500">Simulación no encontrada</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER Y NAVEGACIÓN */}
      <div className="flex justify-between items-center">
        <div>
           <Link to="/simulation">
             <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground mb-2">← Volver al listado</Button>
           </Link>
           <h1 className="text-3xl font-bold tracking-tight">Análisis de Simulación</h1>
           <p className="text-muted-foreground mt-1">
             Realizada el {new Date(sim.created_at * 1000).toLocaleString()} • {sim.num_games} partidas
           </p>
        </div>
        <div className="text-right">
            <Badge variant="outline" className="text-lg px-4 py-1 mb-2">
                Tiempo Total: {sim.time_elapsed.toFixed(2)}s
            </Badge>
        </div>
      </div>

      {/* 1. RESUMEN DE RENDIMIENTO (GLOBAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* === TARJETA JUGADOR NEGRO === */}
        <Card className="bg-slate-950 text-white border-slate-800 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl font-black pointer-events-none">B</div>
            
            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xl flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-white"></span>
                        Jugador Negro (IA)
                    </span>
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-3">
                        {sim.bot_black.algorithm.toUpperCase()}
                    </Badge>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 backdrop-blur-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Configuración Técnica</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-slate-400">Heurística:</div>
                        <div className="font-mono text-emerald-400 text-right">
                            {formatHeuristic(sim.bot_black.heuristic)}
                        </div>
                        {Object.entries(sim.bot_black.parameters || {}).map(([key, value]) => (
                            <div key={key} className="contents">
                                <div className="text-slate-400 capitalize">{key}:</div>
                                <div className="font-mono text-white text-right">{String(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-400 uppercase">Tiempo / Jugada</div>
                        <div className="text-2xl font-mono text-emerald-400">
                            {(sim.global_avg_time_black * 1000).toFixed(2)} ms
                        </div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-400 uppercase">RAM / Jugada</div>
                        <div className="text-2xl font-mono text-blue-400">
                            {sim.global_avg_ram_black.toFixed(2)} MB
                        </div>
                    </div>
                </div>

                <div className="text-center pt-2 border-t border-slate-800">
                    <div className="text-5xl font-black text-white">{sim.black_wins}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Victorias</div>
                </div>
            </CardContent>
        </Card>

        {/* === TARJETA JUGADOR BLANCO === */}
        <Card className="bg-white text-slate-900 border-slate-200 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl font-black pointer-events-none text-slate-900">W</div>

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xl flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-900 border border-slate-200"></span>
                        Jugador Blanco (IA)
                    </span>
                    <Badge variant="outline" className="text-slate-900 border-slate-900 px-3 font-bold bg-slate-50">
                        {sim.bot_white.algorithm.toUpperCase()}
                    </Badge>
                </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 relative z-10">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Configuración Técnica</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-slate-500">Heurística:</div>
                        <div className="font-mono text-blue-600 text-right font-medium">
                            {formatHeuristic(sim.bot_white.heuristic)}
                        </div>
                        {Object.entries(sim.bot_white.parameters || {}).map(([key, value]) => (
                            <div key={key} className="contents">
                                <div className="text-slate-500 capitalize">{key}:</div>
                                <div className="font-mono text-slate-900 text-right font-medium">{String(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase">Tiempo / Jugada</div>
                        <div className="text-2xl font-mono text-emerald-600">
                            {(sim.global_avg_time_white * 1000).toFixed(2)} ms
                        </div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase">RAM / Jugada</div>
                        <div className="text-2xl font-mono text-blue-600">
                            {sim.global_avg_ram_white.toFixed(2)} MB
                        </div>
                    </div>
                </div>
                <div className="text-center pt-2 border-t border-slate-100">
                    <div className="text-5xl font-black text-slate-900">{sim.white_wins}</div>
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Victorias</div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 2. TABLA DETALLADA DE PARTIDAS */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                Desglose por Partida
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">#</TableHead>
                        <TableHead>Ganador</TableHead>
                        <TableHead className="text-center">Resultado</TableHead>
                        <TableHead className="text-right text-emerald-600 font-bold">T. Medio (Negro)</TableHead>
                        <TableHead className="text-right text-blue-600 font-bold">RAM (Negro)</TableHead>
                        <TableHead className="text-right text-emerald-600 font-bold border-l pl-4">T. Medio (Blanco)</TableHead>
                        <TableHead className="text-right text-blue-600 font-bold">RAM (Blanco)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sim.games.map((game, idx) => (
                        <TableRow key={game.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <TableCell className="font-mono text-xs text-muted-foreground">#{idx + 1}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    game.winner === 'black' ? 'default' : 
                                    game.winner === 'white' ? 'outline' : 'secondary'
                                } className={game.winner === 'black' ? 'bg-slate-900' : ''}>
                                    {game.winner === 'black' ? 'Negras' : game.winner === 'white' ? 'Blancas' : 'Empate'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold font-mono">
                                {game.score_black} - {game.score_white}
                            </TableCell>
                            
                            <TableCell className="text-right font-mono text-xs">
                                {(game.avg_time_black * 1000).toFixed(2)} ms
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {game.avg_ram_black.toFixed(2)} MB
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs border-l pl-4 bg-slate-50/50 dark:bg-slate-900/20">
                                {(game.avg_time_white * 1000).toFixed(2)} ms
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/20">
                                {game.avg_ram_white.toFixed(2)} MB
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Función auxiliar corregida para aceptar valores opcionales
function formatHeuristic(text?: string | null) {
    if (!text || text === 'none') return "Ninguna"
    return text.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}