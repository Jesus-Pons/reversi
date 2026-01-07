import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { SimulationService } from "@/client/sdk.gen"
// IMPORTANTE: Importamos SimulationPublic también
import type { Simulation, SimulationPublic } from "@/client/types.gen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  AIParamsSelector, 
  type AIConfigInput 
} from "@/components/forms/AIParamsSelector"
import { Badge } from "@/components/ui/badge"

export const Route = createFileRoute("/_layout/simulation")({
  component: SimulationPage,
})

function SimulationPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-6">
          Simulador de IAs
      </h1>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="new">Nueva Simulación</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new">
          <NewSimulationPanel />
        </TabsContent>
        
        <TabsContent value="history">
          <SimulationHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NewSimulationPanel() {
  const queryClient = useQueryClient()
  const [numGames, setNumGames] = useState(100)
  
  const [blackConfig, setBlackConfig] = useState<AIConfigInput>({
    algorithm: 'random', heuristic: 'none'
  })
  const [whiteConfig, setWhiteConfig] = useState<AIConfigInput>({
    algorithm: 'alphabeta', heuristic: 'static_weights', depth: 4
  })

  const [currentSimId, setCurrentSimId] = useState<string | null>(null)

  const { data: liveStats } = useQuery({
    queryKey: ['simulation_live', currentSimId],
    queryFn: () => SimulationService.readSimulations({ limit: 1 }),
    enabled: !!currentSimId,
    refetchInterval: (query) => {
      const sim = query.state.data?.data[0]
      if (sim && (sim.black_wins + sim.white_wins + sim.draws >= sim.num_games)) {
        return false 
      }
      return 1000 
    }
  })

  const currentSim = liveStats?.data[0]
  const isTrackingCorrectSim = currentSim && currentSim.id === currentSimId
  
  const gamesPlayed = isTrackingCorrectSim ? (currentSim.black_wins + currentSim.white_wins + currentSim.draws) : 0
  const progress = isTrackingCorrectSim ? (gamesPlayed / currentSim.num_games) * 100 : 0
  const isFinished = isTrackingCorrectSim && gamesPlayed >= currentSim.num_games

  const transformConfig = (config: AIConfigInput) => {
    const { algorithm, heuristic, ...params } = config
    return {
      algorithm,
      heuristic: heuristic || "none",
      parameters: params
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await SimulationService.runSimulation({
        requestBody: {
           num_games: numGames,
           bot_black: transformConfig(blackConfig) as any, 
           bot_white: transformConfig(whiteConfig) as any
        }
      })
      return res
    },
    onSuccess: (data) => {
      // CORRECCIÓN 1: Verificamos que data.id exista antes de asignarlo
      if (data.id) {
        setCurrentSimId(data.id)
      }
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
    },
    onError: (err) => {
      console.error("Error lanzando simulación:", err)
    }
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit bg-black text-white hover:bg-gray-800 text-base px-3 py-1">Jugador Negro</Badge>
          <AIParamsSelector onChange={setBlackConfig} />
        </div>
        <div className="flex flex-col gap-4">
          <Badge variant="outline" className="w-fit bg-white text-black border-gray-400 text-base px-3 py-1">Jugador Blanco</Badge>
          <AIParamsSelector onChange={setWhiteConfig} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
        
        {currentSimId && isTrackingCorrectSim && (
          <div className="w-full max-w-lg space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
              <span>Progreso: {gamesPlayed} / {currentSim.num_games} partidas</span>
              <span>{Math.round(progress)}%</span>
            </div>
            
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                <div 
                    className={`h-full transition-all duration-500 ease-out ${isFinished ? 'bg-emerald-500' : 'bg-blue-600 animate-pulse'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {isFinished && (
              <p className="text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-2 animate-bounce">
                ¡Simulación Completada! 🎉
              </p>
            )}
          </div>
        )}

        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Partidas</label>
            <Input 
              type="number" 
              min={1} max={1000}
              className="w-32 text-center font-mono text-lg"
              value={numGames} 
              onChange={(e) => setNumGames(Number(e.target.value))} 
            />
          </div>
          
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || (currentSimId !== null && !isFinished)} 
            size="lg"
            className="h-11 px-8 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {mutation.isPending ? "Iniciando..." : (currentSimId && !isFinished) ? "Simulando..." : "Iniciar Simulación"}
          </Button>
        </div>
      </div>

      {currentSim && isTrackingCorrectSim && <ResultsCard stats={currentSim} />}
    </div>
  )
}

function SimulationHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['simulations'], 
    queryFn: () => SimulationService.readSimulations({ limit: 50 })
  })

  if (isLoading) return <div className="text-center py-10 text-muted-foreground animate-pulse">Cargando historial...</div>

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-gray-950">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-900">
          <TableRow>
            <TableHead className="w-[180px]">Fecha</TableHead>
            <TableHead>Negras (Config)</TableHead>
            <TableHead>Blancas (Config)</TableHead>
            <TableHead className="text-center w-[100px]">Total</TableHead>
            <TableHead className="text-center w-[200px]">Resultados (N - B - E)</TableHead>
            <TableHead className="text-right w-[100px]">Tiempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                No hay simulaciones registradas en tu historial.
              </TableCell>
            </TableRow>
          ) : (
            data?.data.map((sim) => (
              <TableRow key={sim.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <TableCell className="font-medium text-xs text-muted-foreground">
                  {new Date(sim.created_at * 1000).toLocaleString()}
                </TableCell>
                <TableCell>
                  <BotSummary config={sim.bot_black} color="black" />
                </TableCell>
                <TableCell>
                  <BotSummary config={sim.bot_white} color="white" />
                </TableCell>
                <TableCell className="text-center font-mono font-bold">{sim.num_games}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center items-center gap-3 font-bold text-sm bg-gray-100 dark:bg-gray-800 py-1 px-3 rounded-full w-fit mx-auto">
                    <span className="text-emerald-600 dark:text-emerald-400" title="Victorias Negras">{sim.black_wins}</span>
                    <span className="text-gray-300 text-xs">|</span>
                    <span className="text-blue-600 dark:text-blue-400" title="Victorias Blancas">{sim.white_wins}</span>
                    <span className="text-gray-300 text-xs">|</span>
                    <span className="text-gray-500" title="Empates">{sim.draws}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {sim.time_elapsed.toFixed(1)}s
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function BotSummary({ config, color }: { config: any, color: 'black' | 'white' }) {
  if (!config) return <span className="text-muted-foreground">-</span>

  const formatText = (text: string) => {
    if (!text || text === 'none') return null
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const heuristicText = formatText(config.heuristic)

  return (
    <div className="flex flex-col text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color === 'black' ? 'bg-black dark:bg-gray-200' : 'bg-white border border-gray-400'}`} />
        <span className={`font-bold capitalize ${color === 'black' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
            {config.algorithm}
        </span>
      </div>

      {heuristicText && (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 ml-4">
          {heuristicText}
        </span>
      )}

      <div className="text-[10px] text-muted-foreground ml-4 flex gap-2 flex-wrap mt-0.5">
        {config.parameters?.depth !== undefined && (
          <span title="Profundidad" className="bg-gray-100 dark:bg-gray-800 px-1 rounded">d:{config.parameters.depth}</span>
        )}
        {config.parameters?.iterations !== undefined && (
          <span title="Iteraciones" className="bg-gray-100 dark:bg-gray-800 px-1 rounded">i:{config.parameters.iterations}</span>
        )}
        {config.parameters?.time_limit !== undefined && (
           <span title="Tiempo límite" className="bg-gray-100 dark:bg-gray-800 px-1 rounded">t:{config.parameters.time_limit}s</span>
        )}
        {config.parameters?.epsilon !== undefined && (
           <span title="Exploración" className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ε:{config.parameters.epsilon}</span>
        )}
      </div>
    </div>
  )
}

// CORRECCIÓN 2: Cambiamos el tipo de prop a SimulationPublic | Simulation
// para que acepte tanto lo que devuelve el historial como la mutación.
// Usamos Partial o Pick si quieres ser más estricto, pero Union es lo más fácil aquí.
function ResultsCard({ stats }: { stats: SimulationPublic | Simulation }) {
  const total = stats.black_wins + stats.white_wins + stats.draws
  const safeTotal = total > 0 ? total : 1
  const blackRate = ((stats.black_wins / safeTotal) * 100).toFixed(1)
  const whiteRate = ((stats.white_wins / safeTotal) * 100).toFixed(1)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center animate-in zoom-in-95 duration-500">
      
      <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-xl shadow-xl border border-gray-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl font-black">B</div>
        <div className="text-5xl font-black text-emerald-400 mb-2">{stats.black_wins}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Victorias Negras</div>
        <div className="mt-2 text-xs text-emerald-500/80 font-mono bg-emerald-950/30 w-fit mx-auto px-2 py-0.5 rounded">
            {blackRate}% Win Rate
        </div>
      </div>

      <div className="bg-white text-gray-900 p-6 rounded-xl shadow-xl border border-gray-200 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-6xl font-black">W</div>
        <div className="text-5xl font-black text-blue-600 mb-2">{stats.white_wins}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Victorias Blancas</div>
        <div className="mt-2 text-xs text-blue-600/80 font-mono bg-blue-50 w-fit mx-auto px-2 py-0.5 rounded">
            {whiteRate}% Win Rate
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col justify-center">
        <div className="text-5xl font-black text-gray-500 mb-2">{stats.draws}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Empates</div>
      </div>
      
      <div className="col-span-full text-center text-xs text-muted-foreground mt-2">
         Tiempo transcurrido: <span className="font-mono font-bold text-foreground">{stats.time_elapsed.toFixed(2)}s</span>
      </div>
    </div>
  )
}