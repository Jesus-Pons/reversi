import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Gamepad2, User, Play, Loader2 } from "lucide-react"

import { GamesService } from "@/client/sdk.gen"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { 
  AIParamsSelector, 
  type AIConfigInput 
} from "@/components/forms/AIParamsSelector"

// 1. Definimos la ruta
export const Route = createFileRoute("/_layout/games/new")({
  component: NewGamePage,
})

function NewGamePage() {
  const navigate = useNavigate()
  const { user } = useAuth() // Obtenemos el usuario logueado para ponerlo como Player 1
  
  const [opponentType, setOpponentType] = useState<'bot' | 'human'>('bot')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado para la configuración del Bot (viene del AIParamsSelector)
  const [botConfig, setBotConfig] = useState<AIConfigInput | null>(null)

  const handleSubmit = async () => {
    if (!user?.id) return
    setIsSubmitting(true)
    setError(null)

    try {
      // Preparamos el objeto para el Backend
      // Por defecto: Yo soy Negras (Player 1), el Oponente es Blancas (Player 2)
      const requestBody: any = {
        player_black_id: user.id,
        player_white_id: null,
        bot_white_config: null
      }

      if (opponentType === 'bot') {
        if (!botConfig) {
          setError("Configuración de IA inválida")
          setIsSubmitting(false)
          return
        }

        // TRANSFORMACIÓN DE DATOS (Vital):
        // El Selector nos da un objeto plano: { algorithm: 'alphabeta', depth: 4 }
        // La API espera un objeto anidado: { algorithm: 'alphabeta', parameters: { depth: 4 } }
        
        const { algorithm, heuristic, ...restParams } = botConfig
        
        requestBody.bot_white_config = {
          algorithm: algorithm,
          heuristic: heuristic,
          parameters: restParams // Aquí van depth, iterations, etc.
        }
      } else {
        // Lógica para jugar contra otro humano (Futuro: Selector de usuarios)
        // Por ahora lo dejamos null para que sea un "asiento vacío" o un modo local
        setError("El modo multijugador humano aún no está implementado en este formulario.")
        setIsSubmitting(false)
        return
      }

      // Llamada a la API
      const newGame = await GamesService.createGame({
        requestBody
      })

      // Redirigir a la partida creada
      navigate({ to: `/games/${newGame.id}` })

    } catch (err: any) {
      console.error(err)
      setError("Error al crear la partida. Revisa la consola.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Nueva Partida</h1>
        <p className="text-muted-foreground">Configura los parámetros del juego y elige tu oponente.</p>
      </div>

      <div className="grid gap-6">
        
        {/* Paso 1: Elegir Color / Usuario (Simplificado a 'Yo soy Negras' por ahora) */}
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="size-5 text-blue-500" />
            Jugador 1 (Negras)
          </h2>
          <div className="flex items-center gap-3 bg-gray-50/10 p-3 rounded-lg border">
             <div className="size-8 rounded-full bg-black border border-gray-600"></div>
             <span className="font-medium">{user?.full_name || user?.email} (Tú)</span>
          </div>
        </div>

        {/* Paso 2: Elegir Oponente */}
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gamepad2 className="size-5 text-amber-500" />
            Oponente (Blancas)
          </h2>

          {/* Tabs simples para elegir tipo de oponente */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setOpponentType('bot')}
              className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-all ${
                opponentType === 'bot' 
                  ? 'bg-amber-100 border-amber-500 text-amber-900 ring-1 ring-amber-500' 
                  : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Jugar contra IA
            </button>
            <button
              onClick={() => setOpponentType('human')}
              className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-all ${
                opponentType === 'human' 
                  ? 'bg-blue-100 border-blue-500 text-blue-900 ring-1 ring-blue-500' 
                  : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Otro Humano
            </button>
          </div>

          {/* Renderizado Condicional del Selector */}
          {opponentType === 'bot' ? (
            <div className="animate-in fade-in slide-in-from-top-2">
              <AIParamsSelector onChange={setBotConfig} />
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 border border-dashed rounded-lg">
              <p className="text-gray-500">
                Seleccionar un amigo de la lista de usuarios.<br/>
                <span className="text-xs text-orange-600">(Funcionalidad pendiente de implementar)</span>
              </p>
            </div>
          )}
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        {/* Botón de Acción */}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full h-12 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creando tablero...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5 fill-current" />
              Comenzar Juego
            </>
          )}
        </Button>

      </div>
    </div>
  )
}