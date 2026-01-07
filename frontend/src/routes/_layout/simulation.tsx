import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { SimulationService } from "@/client/sdk.gen"
import type { Simulation } from "@/client/types.gen"
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

// --- COMPONENTE 1: NUEVA SIMULACIÓN (Tu código anterior refactorizado) ---
function NewSimulationPanel() {
  const queryClient = useQueryClient()
  const [numGames, setNumGames] = useState(100)
  const [blackConfig, setBlackConfig] = useState<AIConfigInput>({
    algorithm: 'random', heuristic: 'none'
  })
  const [whiteConfig, setWhiteConfig] = useState<AIConfigInput>({
    algorithm: 'alphabeta', heuristic: 'static_weights', depth: 4
  })
  const [lastResult, setLastResult] = useState<Simulation | null>(null)

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
      return await SimulationService.runSimulation({
        requestBody: {
           num_games: numGames,
           bot_black: transformConfig(blackConfig) as any, 
           bot_white: transformConfig(whiteConfig) as any
        }
      })
    },
    onSuccess: (data) => {
      setLastResult(data)
      // Invalidar query de historial para que se actualice la lista automáticamente
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
    },
    onError: (err) => {
      console.error("Error simulando:", err)
    }
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit bg-black text-white hover:bg-gray-800">Jugador Negro</Badge>
          <AIParamsSelector onChange={setBlackConfig} />
        </div>
        <div className="flex flex-col gap-4">
          <Badge variant="outline" className="w-fit bg-white text-black border-gray-400">Jugador Blanco</Badge>
          <AIParamsSelector onChange={setWhiteConfig} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-500">Nº Partidas</label>
            <Input 
              type="number" 
              min={1} max={1000}
              className="w-32 text-center font-mono"
              value={numGames} 
              onChange={(e) => setNumGames(Number(e.target.value))} 
            />
          </div>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending} 
            size="lg"
            className="h-14 px-8 text-lg"
          >
            {mutation.isPending ? "Simulando..." : "⚔️ Iniciar Batalla"}
          </Button>
        </div>
      </div>

      {lastResult && <ResultsCard stats={lastResult} />}
    </div>
  )
}

// --- COMPONENTE 2: HISTORIAL (NUEVO) ---
function SimulationHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['simulations'],
    queryFn: () => SimulationService.readSimulations({ limit: 20 })
  })

  if (isLoading) return <div className="text-center py-10">Cargando historial...</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Negras (Config)</TableHead>
            <TableHead>Blancas (Config)</TableHead>
            <TableHead className="text-center">Total</TableHead>
            <TableHead className="text-center">Resultados (N - B - E)</TableHead>
            <TableHead className="text-right">Tiempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                No hay simulaciones registradas.
              </TableCell>
            </TableRow>
          ) : (
            data?.data.map((sim) => (
              <TableRow key={sim.id}>
                <TableCell className="font-medium text-xs text-muted-foreground">
                  {new Date((sim.created_at?? 1) * 1000).toLocaleString()}
                </TableCell>
                <TableCell>
                  <BotSummary config={sim.bot_black} color="black" />
                </TableCell>
                <TableCell>
                  <BotSummary config={sim.bot_white} color="white" />
                </TableCell>
                <TableCell className="text-center font-mono">{sim.num_games}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2 font-bold text-sm">
                    <span className="text-emerald-500" title="Victorias Negras">{sim.black_wins}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-blue-500" title="Victorias Blancas">{sim.white_wins}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-gray-500" title="Empates">{sim.draws}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {sim.time_elapsed.toFixed(2)}s
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// --- HELPERS ---
// --- HELPERS ---

function BotSummary({ config, color }: { config: any, color: 'black' | 'white' }) {
  if (!config) return <span className="text-muted-foreground">-</span>

  // Función para hacer legible el texto (ej: "static_weights" -> "Static Weights")
  const formatText = (text: string) => {
    if (!text || text === 'none') return null
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const heuristicText = formatText(config.heuristic)

  return (
    <div className="flex flex-col text-sm">
      {/* Nombre del Algoritmo */}
      <span className={`font-bold capitalize ${color === 'black' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
        {config.algorithm}
      </span>

      {/* Heurística (si tiene) */}
      {heuristicText && (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {heuristicText}
        </span>
      )}

      {/* Parámetros Dinámicos */}
      <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
        {config.parameters?.depth !== undefined && (
          <span title="Profundidad">Depth: <b>{config.parameters.depth}</b></span>
        )}
        {config.parameters?.iterations !== undefined && (
          <span title="Iteraciones">Iter: <b>{config.parameters.iterations}</b></span>
        )}
        {config.parameters?.time_limit !== undefined && (
           <span title="Tiempo límite">Time: <b>{config.parameters.time_limit}s</b></span>
        )}
        {config.parameters?.epsilon !== undefined && (
           <span title="Exploración">Eps: <b>{config.parameters.epsilon}</b></span>
        )}
      </div>
    </div>
  )
}

function ResultsCard({ stats }: { stats: Simulation }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center animate-in zoom-in-50 duration-300">
      <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg">
        <div className="text-4xl font-bold text-emerald-400">{stats.black_wins}</div>
        <div className="text-xs uppercase tracking-widest text-gray-400">Negras</div>
      </div>
      <div className="bg-white text-gray-900 p-6 rounded-xl shadow-lg border">
        <div className="text-4xl font-bold text-blue-600">{stats.white_wins}</div>
        <div className="text-xs uppercase tracking-widest text-gray-500">Blancas</div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl border border-dashed">
        <div className="text-4xl font-bold text-gray-500">{stats.draws}</div>
        <div className="text-xs uppercase tracking-widest text-gray-500">Empates</div>
      </div>
    </div>
  )
}