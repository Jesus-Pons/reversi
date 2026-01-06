import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { SimulationService } from "@/client/sdk.gen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  AIParamsSelector, 
  type AIConfigInput 
} from "@/components/forms/AIParamsSelector"

// 1. Corregimos la ruta (sin barra final)
export const Route = createFileRoute("/_layout/simulation")({
  component: SimulationPage,
})

function SimulationPage() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [numGames, setNumGames] = useState(100)

  // 2. Estado para guardar la configuración que viene del Selector
  // Inicializamos con valores por defecto seguros
  const [blackConfig, setBlackConfig] = useState<AIConfigInput>({
    algorithm: 'random',
    heuristic: 'none'
  })
  const [whiteConfig, setWhiteConfig] = useState<AIConfigInput>({
    algorithm: 'alphabeta', 
    heuristic: 'static_weights',
    depth: 4
  })

  // 3. Función auxiliar para transformar el formato "plano" del selector
  // al formato "anidado" que pide tu API (backend)
  const transformConfig = (config: AIConfigInput) => {
    // Sacamos algorithm y heuristic, el resto (depth, iterations, etc) va a params
    const { algorithm, heuristic, ...params } = config
    
    return {
      algorithm,
      heuristic: heuristic || "none", // Aseguramos que no vaya undefined
      parameters: params // Aquí irán depth, iterations, time_limit, etc.
    }
  }

  const handleSimulate = async () => {
    setLoading(true)
    setStats(null) // Limpiar resultados anteriores
    try {
      const result = await SimulationService.runSimulation({
        requestBody: {
           num_games: numGames,
           // 4. Usamos la transformación aquí
           bot_black: transformConfig(blackConfig) as any, 
           bot_white: transformConfig(whiteConfig) as any
        }
      })
      setStats(result)
    } catch (error) {
      console.error("Error en simulación:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Simulador de IAs
        </h1>
      </div>

      {/* SECCIÓN DE CONFIGURACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Configuración Bot Negro */}
        <div className="flex flex-col gap-4">
          <div className="bg-black text-white px-4 py-2 rounded-t-lg font-bold text-center">
            Jugador Negro (Black)
          </div>
          <AIParamsSelector onChange={setBlackConfig} />
        </div>

        {/* Configuración Bot Blanco */}
        <div className="flex flex-col gap-4">
          <div className="bg-white text-black border border-gray-300 px-4 py-2 rounded-t-lg font-bold text-center">
            Jugador Blanco (White)
          </div>
          <AIParamsSelector onChange={setWhiteConfig} />
        </div>
      </div>

      {/* CONTROLES DE LANZAMIENTO */}
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed mb-8">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-500">
                Número de Partidas
            </label>
            <Input 
              type="number" 
              min={1}
              max={1000}
              className="w-32 text-center font-mono"
              value={numGames} 
              onChange={(e) => setNumGames(Number(e.target.value))} 
            />
          </div>
          
          <Button 
            onClick={handleSimulate} 
            disabled={loading} 
            size="lg"
            className="h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
                <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Simulando...
                </span>
            ) : "⚔️ Iniciar Batalla"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
            Nota: Simulaciones con muchas iteraciones o profundidad pueden tardar.
        </p>
      </div>

      {/* RESULTADOS */}
      {stats && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold mb-4 text-center">Resultados de la Simulación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            
            {/* Tarjeta Negras */}
            <div className="bg-gradient-to-br from-gray-900 to-black text-white p-8 rounded-2xl shadow-xl border border-gray-800">
                <div className="text-5xl font-black text-emerald-400 mb-2">{stats.black_wins}</div>
                <div className="text-sm font-medium uppercase tracking-wider text-gray-400">Victorias Negras</div>
                <div className="mt-2 text-xs text-gray-500">
                    {((stats.black_wins / stats.total_games) * 100).toFixed(1)}% Win Rate
                </div>
            </div>

            {/* Tarjeta Blancas */}
            <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-xl border border-gray-200">
                <div className="text-5xl font-black text-blue-600 mb-2">{stats.white_wins}</div>
                <div className="text-sm font-medium uppercase tracking-wider text-gray-500">Victorias Blancas</div>
                <div className="mt-2 text-xs text-gray-400">
                    {((stats.white_wins / stats.total_games) * 100).toFixed(1)}% Win Rate
                </div>
            </div>

            {/* Tarjeta Empates */}
            <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-5xl font-black text-gray-500 mb-2">{stats.draws}</div>
                <div className="text-sm font-medium uppercase tracking-wider text-gray-500">Empates</div>
            </div>
            </div>

            <div className="text-center mt-6 text-muted-foreground text-sm">
                Tiempo total: <span className="font-mono font-bold text-foreground">{stats.time_elapsed.toFixed(2)}s</span> 
                {" "}|{" "} 
                Promedio: <span className="font-mono font-bold text-foreground">{(stats.time_elapsed / stats.total_games).toFixed(3)}s</span> / partida
            </div>
        </div>
      )}
    </div>
  )
}